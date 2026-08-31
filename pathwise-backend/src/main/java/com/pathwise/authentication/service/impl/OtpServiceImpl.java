package com.pathwise.authentication.service.impl;

import com.pathwise.authentication.entity.OtpToken;
import com.pathwise.authentication.entity.OtpType;
import com.pathwise.authentication.entity.User;
import com.pathwise.authentication.exception.InvalidOtpException;
import com.pathwise.authentication.exception.OtpExpiredException;
import com.pathwise.authentication.repository.OtpTokenRepository;
import com.pathwise.authentication.service.EmailService;
import com.pathwise.authentication.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpServiceImpl implements OtpService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;

    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional
    public String generateAndSendOtp(User user, OtpType type) {
        // Check rate limiting (1 minute cooldown between OTP requests)
        Optional<OtpToken> existingOtp = otpTokenRepository.findTopByUserAndTypeAndVerifiedFalseOrderByCreatedAtDesc(user, type);
        if (existingOtp.isPresent()) {
            OtpToken prev = existingOtp.get();
            if (prev.getCreatedAt() != null && prev.getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), prev.getCreatedAt().plusSeconds(60)).getSeconds();
                throw new InvalidOtpException("Please wait " + Math.max(1, secondsLeft) + " seconds before requesting a new code.");
            }
            prev.setVerified(true);
            otpTokenRepository.save(prev);
        }

        // Generate 6-digit numeric OTP
        int number = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(number);

        OtpToken otpToken = OtpToken.builder()
                .otp(otp)
                .type(type)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .attempts(0)
                .verified(false)
                .createdAt(LocalDateTime.now())
                .build();

        otpTokenRepository.save(otpToken);
        log.info("Generated OTP for user [{}] type [{}]", user.getEmail(), type);

        // Send via Email
        emailService.sendOtpEmail(user.getEmail(), otp, type);
        return otp;
    }

    @Override
    @Transactional
    public void verifyOtp(User user, String otp, OtpType type) {
        OtpToken token = otpTokenRepository.findTopByUserAndTypeAndVerifiedFalseOrderByCreatedAtDesc(user, type)
                .orElseThrow(() -> new InvalidOtpException("No pending OTP found or OTP already used. Please request a new code."));

        if (token.isExpired()) {
            throw new OtpExpiredException("OTP has expired. Please request a new code.");
        }

        if (token.getAttempts() >= MAX_ATTEMPTS) {
            token.setVerified(true);
            otpTokenRepository.save(token);
            throw new InvalidOtpException("Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.");
        }

        if (!token.getOtp().equals(otp.trim())) {
            int newAttempts = token.getAttempts() + 1;
            token.setAttempts(newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
                token.setVerified(true); // Invalidate token immediately
                otpTokenRepository.save(token);
                throw new InvalidOtpException("Too many incorrect attempts (5/5). This OTP has been invalidated. Please request a new OTP.");
            }
            otpTokenRepository.save(token);
            int remaining = MAX_ATTEMPTS - newAttempts;
            throw new InvalidOtpException("Invalid OTP code. " + remaining + " attempts remaining.");
        }

        // Mark verified
        token.setVerified(true);
        otpTokenRepository.save(token);
        log.info("OTP successfully verified for user [{}] type [{}]", user.getEmail(), type);
    }

    @Override
    @Transactional
    public void resendOtp(User user, OtpType type) {
        generateAndSendOtp(user, type);
    }
}
