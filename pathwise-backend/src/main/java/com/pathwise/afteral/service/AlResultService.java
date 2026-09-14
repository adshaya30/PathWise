package com.pathwise.afteral.service;

import com.pathwise.afteral.dto.*;
import com.pathwise.course.dto.EligibilityResultDto;

public interface AlResultService {

    /**
     * Save or update A/L student exam results and O/L prerequisites
     */
    AlResultResponseDto saveResults(AlResultRequestDto dto, String userEmail, String anonymousId);

    /**
     * Fetch the student's latest saved results
     */
    AlResultResponseDto getLatestResults(String userEmail, String anonymousId);

    /**
     * Directly evaluate eligibility for the saved results
     */
    EligibilityResultDto evaluateLatestEligibility(String userEmail, String anonymousId);

    /**
     * Search and retrieve real published cutoff marks by academic year, district, and search query
     */
    java.util.List<com.pathwise.afteral.dto.CutoffResponseDto> getCutoffMarks(String academicYear, String district, String search);

    /**
     * Retrieve distinct academic years present in cutoff marks database
     */
    java.util.List<String> getDistinctAcademicYears();

    /**
     * Retrieve distinct districts present in cutoff marks database
     */
    java.util.List<String> getDistinctDistricts();

    /**
     * Flat eligible course list for the saved student profile
     */
    AfterAlCatalogResponseDto getEligibleCourses(String userEmail, String anonymousId, String filter, String search);

    /**
     * Universities grouped with course counts for the saved student profile
     */
    AfterAlUniversitiesResponseDto getUniversities(String userEmail, String anonymousId, String filter, String search);

    /**
     * Side-by-side comparison payload for up to 4 Uni-Codes
     */
    AfterAlCatalogResponseDto compareCourses(String userEmail, String anonymousId, java.util.List<String> uniCodes);

    /**
     * Detailed eligibility view for a single Uni-Code
     */
    AfterAlCatalogResponseDto getCourseDetail(String userEmail, String anonymousId, String uniCode);
}
