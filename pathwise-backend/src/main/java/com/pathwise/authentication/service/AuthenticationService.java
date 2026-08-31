package com.pathwise.authentication.service;

import com.pathwise.authentication.dto.*;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthenticationService {
    AuthResponseDto register(RegisterRequestDto request);
    AuthResponseDto login(LoginRequestDto request, HttpServletResponse response);
    AuthResponseDto verifyOtp(VerifyOtpRequestDto request, HttpServletResponse response);
    void resendOtp(ResendOtpRequestDto request);
    AuthResponseDto refreshToken(RefreshTokenRequestDto request, String cookieRefreshToken, HttpServletResponse response);
    void forgotPassword(ForgotPasswordRequestDto request);
    void resetPassword(ResetPasswordRequestDto request);
    void logout(String refreshToken, HttpServletResponse response);
    UserResponseDto getCurrentUser(String email);
}
