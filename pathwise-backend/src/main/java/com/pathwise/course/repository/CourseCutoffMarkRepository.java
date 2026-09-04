package com.pathwise.course.repository;

import com.pathwise.course.entity.CourseCutoffMark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseCutoffMarkRepository extends JpaRepository<CourseCutoffMark, Long> {
    List<CourseCutoffMark> findByDistrictIgnoreCaseAndAcademicYear(String district, String academicYear);
    List<CourseCutoffMark> findByCourseNameIgnoreCase(String courseName);
    List<CourseCutoffMark> findByDocumentId(Long documentId);
    void deleteByDocumentId(Long documentId);
}
