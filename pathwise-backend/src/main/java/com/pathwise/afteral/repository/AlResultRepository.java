package com.pathwise.afteral.repository;

import com.pathwise.afteral.entity.AlResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlResultRepository extends JpaRepository<AlResult, UUID> {

    Optional<AlResult> findTopByUserEmailOrderByUpdatedAtDesc(String userEmail);

    Optional<AlResult> findTopByAnonymousIdOrderByUpdatedAtDesc(String anonymousId);
}
