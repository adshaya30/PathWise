package com.pathwise.authentication.service;

import com.pathwise.authentication.entity.OtpType;
import com.pathwise.authentication.entity.User;

public interface OtpService {
    String generateAndSendOtp(User user, OtpType type);
    void verifyOtp(User user, String otp, OtpType type);
    void resendOtp(User user, OtpType type);
}
