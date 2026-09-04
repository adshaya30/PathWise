package com.pathwise.course.repository;

import com.pathwise.course.entity.CourseAptitudeTestRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseAptitudeTestRequirementRepository extends JpaRepository<CourseAptitudeTestRequirement, Long> {

    List<CourseAptitudeTestRequirement> findByAcademicYear(String academicYear);

    List<CourseAptitudeTestRequirement> findByAcademicYearAndCourseNameIgnoreCase(String academicYear, String courseName);

    List<CourseAptitudeTestRequirement> findByUniCode(String uniCode);

    void deleteByDocumentId(Long documentId);
}
