package com.pathwise.course.repository;

import com.pathwise.course.entity.CourseIntake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseIntakeRepository extends JpaRepository<CourseIntake, Long> {

    List<CourseIntake> findByAcademicYear(String academicYear);

    List<CourseIntake> findByAcademicYearAndCourseNameIgnoreCase(String academicYear, String courseName);

    List<CourseIntake> findByAcademicYearAndUniversityNameIgnoreCase(String academicYear, String universityName);

    void deleteByDocumentId(Long documentId);
}
