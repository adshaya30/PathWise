package com.pathwise.course.repository;

import com.pathwise.course.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByNameIgnoreCase(String name);
    Optional<Course> findByCodeIgnoreCase(String code);
    java.util.List<Course> findByStreamIgnoreCase(String stream);
}
