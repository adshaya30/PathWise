package com.pathwise.course.repository;

import com.pathwise.course.entity.UniversityMediumOfInstruction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UniversityMediumRepository extends JpaRepository<UniversityMediumOfInstruction, Long> {

    List<UniversityMediumOfInstruction> findByAcademicYear(String academicYear);

    List<UniversityMediumOfInstruction> findByAcademicYearAndUniversityNameIgnoreCase(String academicYear, String universityName);

    void deleteByDocumentId(Long documentId);
}
