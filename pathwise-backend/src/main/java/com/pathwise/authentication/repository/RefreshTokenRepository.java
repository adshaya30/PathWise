package com.pathwise.authentication.repository;

import com.pathwise.authentication.entity.RefreshToken;
import com.pathwise.authentication.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    List<RefreshToken> findAllByUser(User user);
    void deleteByUser(User user);
    void deleteByExpiryDateBefore(LocalDateTime dateTime);
}
