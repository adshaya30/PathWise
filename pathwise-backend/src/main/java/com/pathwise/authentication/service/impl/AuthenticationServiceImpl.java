package com.pathwise.authentication.service.impl;

import com.pathwise.authentication.dto.*;
import com.pathwise.authentication.entity.*;
import com.pathwise.authentication.exception.*;
import com.pathwise.authentication.repository.OtpTokenRepository;
import com.pathwise.authentication.repository.RefreshTokenRepository;
import com.pathwise.authentication.repository.UserRepository;
import com.pathwise.authentication.service.AuthenticationService;
import com.pathwise.authentication.service.JwtService;
import com.pathwise.authentication.service.OtpService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    private boolean isAdminEmail(String email) {
        return adminEmail != null && !adminEmail.isBlank() && adminEmail.trim().equalsIgnoreCase(email.trim());
    }

    @Override
    @Transactional
    public AuthResponseDto register(RegisterRequestDto request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with this email already exists: " + normalizedEmail);
        }

        boolean isAdmin = isAdminEmail(normalizedEmail);
        Role role = isAdmin ? Role.ADMIN : Role.USER;

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .emailVerified(false)
                .accountLocked(false)
                .createdAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered user [{}] with initial role [{}]", savedUser.getEmail(), savedUser.getRole());

        // Generate and send 6-digit email verification OTP
        otpService.generateAndSendOtp(savedUser, OtpType.EMAIL_VERIFICATION);

        // Generate temporary tokens
        String accessToken = jwtService.generateAccessToken(savedUser);
        String refreshTokenStr = jwtService.generateRefreshToken(savedUser, false);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs() / 1000)
                .user(mapToUserResponseDto(savedUser))
                .build();
    }

    @Override
    @Transactional
    public AuthResponseDto verifyOtp(VerifyOtpRequestDto request, HttpServletResponse response) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + normalizedEmail));

        otpService.verifyOtp(user, request.getOtp(), request.getType());

        if (request.getType() == OtpType.EMAIL_VERIFICATION) {
            user.setEmailVerified(true);
            if (isAdminEmail(normalizedEmail)) {
                user.setRole(Role.ADMIN);
            }
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }

        // Issue tokens after verification
        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenStr = jwtService.generateRefreshToken(user, true);

        saveRefreshTokenInDb(user, refreshTokenStr, true);
        setAuthCookies(response, accessToken, refreshTokenStr, true);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs() / 1000)
                .user(mapToUserResponseDto(user))
                .build();
    }

    @Override
    @Transactional
    public void resendOtp(ResendOtpRequestDto request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + normalizedEmail));

        otpService.resendOtp(user, request.getType());
    }

    @Override
    @Transactional(noRollbackFor = {InvalidCredentialsException.class, AccountLockedException.class})
    public AuthResponseDto login(LoginRequestDto request, HttpServletResponse response) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> {
                    if (isAdminEmail(normalizedEmail) && adminPassword != null && adminPassword.equals(request.getPassword())) {
                        log.info("Provisioning administrator account [{}] during initial login", normalizedEmail);
                        User admin = User.builder()
                                .email(normalizedEmail)
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(Role.ADMIN)
                                .emailVerified(true)
                                .accountLocked(false)
                                .createdAt(LocalDateTime.now())
                                .build();
                        return userRepository.save(admin);
                    }
                    throw new InvalidCredentialsException("Invalid email or password. If you don't have an account, please Sign Up first.");
                });

        // 1. Check if account is temporarily locked
        if (user.getLockedUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getLockedUntil())) {
                long totalSeconds = java.time.Duration.between(LocalDateTime.now(), user.getLockedUntil()).getSeconds();
                long minutesLeft = totalSeconds / 60;
                long secondsLeft = totalSeconds % 60;
                String remainingTimeText = (minutesLeft > 0)
                        ? (minutesLeft + 1) + " minutes"
                        : Math.max(1, secondsLeft) + " seconds";
                throw new AccountLockedException("Too many failed login attempts. Your account has been temporarily locked for 5 minutes. Please try again in " + remainingTimeText + ".");
            } else {
                // Lock expired -> Auto-unlock account
                user.setAccountLocked(false);
                user.setLockedUntil(null);
                user.setFailedLoginAttempts(0);
                user.setUpdatedAt(LocalDateTime.now());
                user = userRepository.save(user);
                log.info("Temporary lockout expired for user [{}]. Account auto-unlocked.", user.getEmail());
            }
        } else if (user.isAccountLocked()) {
            throw new AccountLockedException("Your account is locked. Please contact support.");
        }

        // 2. Validate password
        boolean passwordValid = false;
        if (isAdminEmail(normalizedEmail) && adminPassword != null && adminPassword.equals(request.getPassword())) {
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword()) || user.getRole() != Role.ADMIN) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
                user.setRole(Role.ADMIN);
                user.setEmailVerified(true);
                user.setUpdatedAt(LocalDateTime.now());
                user = userRepository.save(user);
                log.info("Synchronized admin credentials and role for [{}]", user.getEmail());
            }
            passwordValid = true;
        } else if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            passwordValid = true;
        }

        if (!passwordValid) {
            int newAttempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(newAttempts);
            user.setUpdatedAt(LocalDateTime.now());

            if (newAttempts >= 3) {
                user.setAccountLocked(true);
                user.setLockedUntil(LocalDateTime.now().plusMinutes(5));
                userRepository.save(user);
                log.warn("Account [{}] locked for 5 minutes after 3 failed login attempts", user.getEmail());
                throw new AccountLockedException("Too many failed login attempts. Your account has been temporarily locked for 5 minutes. Please try again later.");
            } else {
                userRepository.save(user);
                int remaining = 3 - newAttempts;
                throw new InvalidCredentialsException("Invalid email or password. " + remaining + " attempt" + (remaining > 1 ? "s" : "") + " remaining before temporary account lock.");
            }
        }

        // 3. On successful login: reset failed attempts and unlock state
        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            user.setAccountLocked(false);
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }

        // Auto-assign Admin role if email matches admin email
        if (isAdminEmail(normalizedEmail) && user.getRole() != Role.ADMIN) {
            user.setRole(Role.ADMIN);
            user.setEmailVerified(true);
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
            log.info("Elevated [{}] to ADMIN role during login", user.getEmail());
        }

        boolean rememberMe = request.isRememberMe();
        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenStr = jwtService.generateRefreshToken(user, rememberMe);

        saveRefreshTokenInDb(user, refreshTokenStr, rememberMe);
        setAuthCookies(response, accessToken, refreshTokenStr, rememberMe);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs() / 1000)
                .user(mapToUserResponseDto(user))
                .build();
    }

    @Override
    @Transactional
    public AuthResponseDto refreshToken(RefreshTokenRequestDto request, String cookieRefreshToken, HttpServletResponse response) {
        String token = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        if (token == null || token.isBlank() || !jwtService.validateToken(token)) {
            throw new TokenRefreshException("Invalid or expired refresh token. Please sign in again.");
        }

        String hashedToken = hashToken(token);
        RefreshToken storedToken = refreshTokenRepository.findByToken(hashedToken)
                .orElseThrow(() -> new TokenRefreshException("Refresh token is invalid or has been revoked."));

        if (storedToken.isRevoked() || storedToken.isExpired()) {
            throw new TokenRefreshException("Refresh token has expired. Please sign in again.");
        }

        User user = storedToken.getUser();

        // Refresh token rotation: revoke old token and issue new
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        boolean rememberMe = Boolean.TRUE.equals(jwtService.extractAllClaims(token).get("rememberMe", Boolean.class));
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshTokenStr = jwtService.generateRefreshToken(user, rememberMe);

        saveRefreshTokenInDb(user, newRefreshTokenStr, rememberMe);
        setAuthCookies(response, newAccessToken, newRefreshTokenStr, rememberMe);

        return AuthResponseDto.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs() / 1000)
                .user(mapToUserResponseDto(user))
                .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequestDto request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("No account found with email: " + normalizedEmail));

        otpService.generateAndSendOtp(user, OtpType.PASSWORD_RESET);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequestDto request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("No account found with email: " + normalizedEmail));

        otpService.verifyOtp(user, request.getOtp(), OtpType.PASSWORD_RESET);

        // Update password with fresh BCrypt hash
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Invalidate all active refresh tokens for this user for security
        refreshTokenRepository.deleteByUser(user);
        log.info("Password successfully reset for user [{}] and existing sessions invalidated.", user.getEmail());
    }

    @Override
    @Transactional
    public void logout(String refreshToken, HttpServletResponse response) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            String hashedToken = hashToken(refreshToken);
            refreshTokenRepository.findByToken(hashedToken).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
        clearAuthCookies(response);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return mapToUserResponseDto(user);
    }

    private void saveRefreshTokenInDb(User user, String token, boolean rememberMe) {
        long expiryMs = jwtService.getRefreshTokenExpirationMs(rememberMe);
        RefreshToken refreshToken = RefreshToken.builder()
                .token(hashToken(token))
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(expiryMs / 1000))
                .revoked(false)
                .createdAt(LocalDateTime.now())
                .build();
        refreshTokenRepository.save(refreshToken);
    }

    private String hashToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 hashing algorithm not available in environment", e);
        }
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken, boolean rememberMe) {
        if (response == null) return;

        long refreshMaxAgeSeconds = jwtService.getRefreshTokenExpirationMs(rememberMe) / 1000;
        long accessMaxAgeSeconds = jwtService.getAccessTokenExpirationMs() / 1000;

        ResponseCookie refreshCookie = ResponseCookie.from("pathwise_refresh_token", refreshToken)
                .httpOnly(true)
                .secure(false) // Set true in HTTPS production
                .path("/")
                .maxAge(refreshMaxAgeSeconds)
                .sameSite("Lax")
                .build();

        ResponseCookie accessCookie = ResponseCookie.from("pathwise_access_token", accessToken)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(accessMaxAgeSeconds)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
    }

    private void clearAuthCookies(HttpServletResponse response) {
        if (response == null) return;

        ResponseCookie refreshCookie = ResponseCookie.from("pathwise_refresh_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        ResponseCookie accessCookie = ResponseCookie.from("pathwise_access_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
    }

    private UserResponseDto mapToUserResponseDto(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .emailVerified(user.isEmailVerified())
                .accountLocked(user.isAccountLocked())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
