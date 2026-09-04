package com.pathwise.course.repository;

import com.pathwise.course.entity.CourseOlRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseOlRequirementRepository extends JpaRepository<CourseOlRequirement, Long> {

    List<CourseOlRequirement> findByAcademicYear(String academicYear);

    List<CourseOlRequirement> findByAcademicYearAndCourseNameIgnoreCase(String academicYear, String courseName);

    void deleteByDocumentId(Long documentId);
}
