package com.pathwise.authentication.service;

import com.pathwise.authentication.entity.User;
import io.jsonwebtoken.Claims;

public interface JwtService {
    String generateAccessToken(User user);
    String generateRefreshToken(User user, boolean rememberMe);
    String extractEmail(String token);
    String extractRole(String token);
    Claims extractAllClaims(String token);
    boolean validateToken(String token);
    long getAccessTokenExpirationMs();
    long getRefreshTokenExpirationMs(boolean rememberMe);
}

