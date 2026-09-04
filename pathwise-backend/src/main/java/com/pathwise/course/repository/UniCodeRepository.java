package com.pathwise.course.repository;

import com.pathwise.course.entity.UniCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UniCodeRepository extends JpaRepository<UniCode, Long> {

    Optional<UniCode> findByCodeIgnoreCase(String code);

    List<UniCode> findByStreamIgnoreCase(String stream);

    List<UniCode> findByCourseNameIgnoreCase(String courseName);

    List<UniCode> findByUniversityNameIgnoreCase(String universityName);

    Optional<UniCode> findByCourseNameIgnoreCaseAndUniversityNameIgnoreCase(String courseName, String universityName);
}
