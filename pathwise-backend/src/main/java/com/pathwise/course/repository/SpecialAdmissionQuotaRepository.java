package com.pathwise.course.repository;

import com.pathwise.course.entity.SpecialCategoryAdmissionQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecialAdmissionQuotaRepository extends JpaRepository<SpecialCategoryAdmissionQuota, Long> {

    List<SpecialCategoryAdmissionQuota> findByAcademicYear(String academicYear);

    List<SpecialCategoryAdmissionQuota> findByAcademicYearAndUniversityNameIgnoreCase(String academicYear, String universityName);

    void deleteByDocumentId(Long documentId);
}
