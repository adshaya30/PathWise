package com.pathwise.savedcourse.service.impl;

import com.pathwise.savedcourse.dto.SavedCourseDto;
import com.pathwise.savedcourse.entity.SavedCourse;
import com.pathwise.savedcourse.repository.SavedCourseRepository;
import com.pathwise.savedcourse.service.SavedCourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SavedCourseServiceImpl implements SavedCourseService {

    private final SavedCourseRepository savedCourseRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SavedCourseDto> getSavedCourses(String userEmail, String anonymousId) {
        List<SavedCourse> entities;
        if (userEmail != null && !userEmail.isBlank()) {
            entities = savedCourseRepository.findByUserEmailOrderBySavedAtAsc(userEmail);
        } else if (anonymousId != null && !anonymousId.isBlank()) {
            entities = savedCourseRepository.findByAnonymousIdOrderBySavedAtAsc(anonymousId);
        } else {
            return List.of();
        }

        return entities.stream()
                .map(SavedCourseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SavedCourseDto saveCourse(String userEmail, String anonymousId, String uniCode) {
        if (uniCode == null || uniCode.isBlank()) {
            throw new IllegalArgumentException("uniCode must not be blank");
        }
        String normalizedCode = uniCode.trim();

        SavedCourse entity = null;
        if (userEmail != null && !userEmail.isBlank()) {
            Optional<SavedCourse> existing = savedCourseRepository.findByUserEmailAndUniCode(userEmail, normalizedCode);
            entity = existing.orElseGet(() -> SavedCourse.builder()
                    .userEmail(userEmail)
                    .uniCode(normalizedCode)
                    .savedAt(LocalDateTime.now())
                    .build());
        } else if (anonymousId != null && !anonymousId.isBlank()) {
            Optional<SavedCourse> existing = savedCourseRepository.findByAnonymousIdAndUniCode(anonymousId, normalizedCode);
            entity = existing.orElseGet(() -> SavedCourse.builder()
                    .anonymousId(anonymousId)
                    .uniCode(normalizedCode)
                    .savedAt(LocalDateTime.now())
                    .build());
        }

        if (entity == null) {
            throw new IllegalArgumentException("A logged-in user or anonymous ID is required");
        }

        SavedCourse saved = savedCourseRepository.save(entity);
        log.info("Saved course {} for user: {}", normalizedCode, userEmail != null ? userEmail : anonymousId);
        return SavedCourseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void removeCourse(String userEmail, String anonymousId, String uniCode) {
        if (uniCode == null || uniCode.isBlank()) {
            return;
        }
        String normalizedCode = uniCode.trim();

        if (userEmail != null && !userEmail.isBlank()) {
            savedCourseRepository.deleteByUserEmailAndUniCode(userEmail, normalizedCode);
        } else if (anonymousId != null && !anonymousId.isBlank()) {
            savedCourseRepository.deleteByAnonymousIdAndUniCode(anonymousId, normalizedCode);
        }
        log.info("Removed saved course {} for user: {}", normalizedCode, userEmail != null ? userEmail : anonymousId);
    }

    @Override
    @Transactional
    public int mergeAnonymousToUser(String userEmail, String anonymousId) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new IllegalArgumentException("Merge requires an authenticated user");
        }
        if (anonymousId == null || anonymousId.isBlank()) {
            return 0;
        }

        List<SavedCourse> anonymousCourses = savedCourseRepository.findByAnonymousId(anonymousId);
        List<SavedCourse> merged = new ArrayList<>();

        for (SavedCourse anonymousCourse : anonymousCourses) {
            boolean existsForUser = savedCourseRepository.findByUserEmailAndUniCode(userEmail, anonymousCourse.getUniCode()).isPresent();
            if (!existsForUser) {
                savedCourseRepository.save(SavedCourse.builder()
                        .userEmail(userEmail)
                        .uniCode(anonymousCourse.getUniCode())
                        .savedAt(anonymousCourse.getSavedAt())
                        .build());
                merged.add(anonymousCourse);
            }
        }

        if (!merged.isEmpty()) {
            savedCourseRepository.deleteAll(merged);
        }

        log.info("Merged {} anonymous courses into user {}", merged.size(), userEmail);
        return merged.size();
    }
}