package com.pathwise.authentication.controller;

import com.pathwise.authentication.dto.*;
import com.pathwise.authentication.service.AuthenticationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> register(@Valid @RequestBody RegisterRequestDto request) {
        AuthResponseDto response = authenticationService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDto.success("User registered. Verification code has been sent to your email.", response));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequestDto request,
            HttpServletResponse httpResponse
    ) {
        AuthResponseDto response = authenticationService.verifyOtp(request, httpResponse);
        return ResponseEntity.ok(ApiResponseDto.success("OTP verified successfully. Account activated.", response));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponseDto<Void>> resendOtp(@Valid @RequestBody ResendOtpRequestDto request) {
        authenticationService.resendOtp(request);
        return ResponseEntity.ok(ApiResponseDto.success("A new 6-digit OTP code has been dispatched to your email."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> login(
            @Valid @RequestBody LoginRequestDto request,
            HttpServletResponse httpResponse
    ) {
        AuthResponseDto response = authenticationService.login(request, httpResponse);
        return ResponseEntity.ok(ApiResponseDto.success("Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> refreshToken(
            @RequestBody(required = false) RefreshTokenRequestDto request,
            @CookieValue(name = "pathwise_refresh_token", required = false) String cookieRefreshToken,
            HttpServletResponse httpResponse
    ) {
        AuthResponseDto response = authenticationService.refreshToken(request, cookieRefreshToken, httpResponse);
        return ResponseEntity.ok(ApiResponseDto.success("Session refreshed successfully", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponseDto<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequestDto request) {
        authenticationService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponseDto.success("If the email exists, a 6-digit password reset OTP has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponseDto<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequestDto request) {
        authenticationService.resetPassword(request);
        return ResponseEntity.ok(ApiResponseDto.success("Password reset successfully. You can now log in with your new password."));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponseDto<Void>> logout(
            @CookieValue(name = "pathwise_refresh_token", required = false) String cookieRefreshToken,
            @RequestBody(required = false) RefreshTokenRequestDto request,
            HttpServletResponse httpResponse
    ) {
        String token = (request != null && request.getRefreshToken() != null) ? request.getRefreshToken() : cookieRefreshToken;
        authenticationService.logout(token, httpResponse);
        return ResponseEntity.ok(ApiResponseDto.success("Logged out successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponseDto<UserResponseDto>> getCurrentUser(
            Authentication authentication,
            @RequestParam(required = false) String email
    ) {
        String queryEmail = (authentication != null && authentication.getName() != null)
                ? authentication.getName()
                : email;

        if (queryEmail == null || queryEmail.isBlank()) {
            throw new IllegalArgumentException("No authenticated user or email provided");
        }

        UserResponseDto user = authenticationService.getCurrentUser(queryEmail);
        return ResponseEntity.ok(ApiResponseDto.success("User details retrieved successfully", user));
    }
}
