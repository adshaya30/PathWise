package com.pathwise.authentication.service;

import com.pathwise.authentication.entity.OtpType;

public interface EmailService {
    void sendOtpEmail(String toEmail, String otp, OtpType type);
}
