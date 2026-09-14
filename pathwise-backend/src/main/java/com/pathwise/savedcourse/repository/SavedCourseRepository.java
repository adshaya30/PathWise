package com.pathwise.savedcourse.repository;

import com.pathwise.savedcourse.entity.SavedCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedCourseRepository extends JpaRepository<SavedCourse, UUID> {

    List<SavedCourse> findByUserEmailOrderBySavedAtAsc(String userEmail);

    List<SavedCourse> findByAnonymousIdOrderBySavedAtAsc(String anonymousId);

    List<SavedCourse> findByAnonymousId(String anonymousId);

    Optional<SavedCourse> findByUserEmailAndUniCode(String userEmail, String uniCode);

    Optional<SavedCourse> findByAnonymousIdAndUniCode(String anonymousId, String uniCode);

    void deleteByUserEmailAndUniCode(String userEmail, String uniCode);

    void deleteByAnonymousIdAndUniCode(String anonymousId, String uniCode);
}