package com.pathwise.authentication.service.impl;

import com.pathwise.authentication.entity.User;
import com.pathwise.authentication.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtServiceImpl implements JwtService {

    @Value("${app.jwt.secret:pathwiseSecretKeyForJwtAuthenticationMustBeAtLeast256BitsLong1234567890}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiration-ms:900000}") // 15 minutes default (15 * 60 * 1000 ms)
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-token-expiration-ms:86400000}") // 1 day default
    private long refreshTokenExpirationMs;

    @Value("${app.jwt.remember-me-expiration-ms:2592000000}") // 30 days default
    private long rememberMeExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("role", user.getRole().name());
        claims.put("emailVerified", user.isEmailVerified());

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    @Override
    public String generateRefreshToken(User user, boolean rememberMe) {
        long expiry = rememberMe ? rememberMeExpirationMs : refreshTokenExpirationMs;
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("rememberMe", rememberMe)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiry))
                .signWith(getSigningKey())
                .compact();
    }

    @Override
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    @Override
    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("role", String.class);
    }

    @Override
    public boolean validateToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    @Override
    public long getRefreshTokenExpirationMs(boolean rememberMe) {
        return rememberMe ? rememberMeExpirationMs : refreshTokenExpirationMs;
    }

    @Override
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
