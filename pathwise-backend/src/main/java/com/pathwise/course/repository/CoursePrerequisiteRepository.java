package com.pathwise.course.repository;

import com.pathwise.course.entity.CoursePrerequisite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoursePrerequisiteRepository extends JpaRepository<CoursePrerequisite, Long> {

    List<CoursePrerequisite> findByStreamIgnoreCase(String stream);

    Optional<CoursePrerequisite> findByCourseNameIgnoreCase(String courseName);

    Optional<CoursePrerequisite> findByCourseNameIgnoreCaseAndStreamIgnoreCase(String courseName, String stream);

    List<CoursePrerequisite> findByCourseNameContainingIgnoreCase(String courseName);
}
