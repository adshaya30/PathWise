package com.pathwise.course.repository;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.CourseCutoffMark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CourseCutoffMarkRepository extends JpaRepository<CourseCutoffMark, Long> {

    // Find cutoff for specific district + course + university
    Optional<CourseCutoffMark> findByDistrictAndCourseOfStudyAndUniversityAndAcademicYear(
            String district,
            String courseOfStudy,
            String university,
            String academicYear
    );

    // Find all cutoffs for a district
    List<CourseCutoffMark> findByDistrictIgnoreCaseAndAcademicYear(String district, String academicYear);

    List<CourseCutoffMark> findByDistrictAndAcademicYearOrderByMinimumZScoreDesc(
            String district,
            String academicYear
    );

    // Find all cutoffs for a course
    List<CourseCutoffMark> findByCourseOfStudyIgnoreCase(String courseOfStudy);

    List<CourseCutoffMark> findByCourseOfStudyAndAcademicYearOrderByMinimumZScoreDesc(
            String courseOfStudy,
            String academicYear
    );

    // Find all cutoffs for a university
    List<CourseCutoffMark> findByUniversityAndAcademicYearOrderByMinimumZScoreDesc(
            String university,
            String academicYear
    );

    @Query("SELECT c FROM CourseCutoffMark c WHERE " +
           "(:academicYear IS NULL OR :academicYear = '' OR c.academicYear = :academicYear) AND " +
           "(:district IS NULL OR :district = '' OR UPPER(c.district) = UPPER(:district)) AND " +
           "(:search IS NULL OR :search = '' OR LOWER(c.courseOfStudy) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.university) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.district) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.academicYear DESC, c.courseOfStudy ASC, c.university ASC")
    List<CourseCutoffMark> searchCutoffs(
            @Param("academicYear") String academicYear,
            @Param("district") String district,
            @Param("search") String search
    );

    @Query("SELECT DISTINCT c.academicYear FROM CourseCutoffMark c WHERE c.academicYear IS NOT NULL ORDER BY c.academicYear DESC")
    List<String> findDistinctAcademicYears();

    @Query("SELECT DISTINCT c.district FROM CourseCutoffMark c WHERE c.district IS NOT NULL ORDER BY c.district ASC")
    List<String> findDistinctDistricts();

    // Find by document
    @Query("SELECT c FROM CourseCutoffMark c WHERE c.document.id = :documentId")
    List<CourseCutoffMark> findByDocumentId(@Param("documentId") Long documentId);

    @Query("SELECT c FROM CourseCutoffMark c WHERE c.document.id = :documentId ORDER BY c.district ASC, c.courseOfStudy ASC, c.university ASC")
    List<CourseCutoffMark> findByDocumentIdOrderByDistrictAscCourseOfStudyAscUniversityAsc(@Param("documentId") Long documentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM CourseCutoffMark c WHERE c.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    // Bulk insert query
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO course_cutoff_marks (document_id, district, course_of_study, university, minimum_z_score, academic_year) " +
                   "VALUES (:#{#document.id}, :district, :course, :university, :zScore, :academicYear)", nativeQuery = true)
    int insertCutoffMark(
            @Param("document") Document document,
            @Param("district") String district,
            @Param("course") String courseOfStudy,
            @Param("university") String university,
            @Param("zScore") BigDecimal minimumZScore,
            @Param("academicYear") String academicYear
    );
}
