package com.pathwise.authentication.repository;

import com.pathwise.authentication.entity.OtpToken;
import com.pathwise.authentication.entity.OtpType;
import com.pathwise.authentication.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findTopByUserAndTypeAndVerifiedFalseOrderByCreatedAtDesc(User user, OtpType type);
    Optional<OtpToken> findTopByUserAndTypeAndOtpAndVerifiedFalseOrderByCreatedAtDesc(User user, OtpType type, String otp);
    void deleteByUserAndType(User user, OtpType type);
    void deleteByExpiryDateBefore(LocalDateTime dateTime);
}
