package com.pathwise.course.service;

import com.pathwise.course.dto.EligibilityResultDto;
import com.pathwise.course.dto.StudentEligibilityRequestDto;
import com.pathwise.course.dto.UniCodeResponseDto;

import java.util.List;

public interface EligibilityEngineService {

    /**
     * Evaluates a student's eligibility across all UGC Handbook domains:
     * 1. Ineligibility Check (e.g. attempt count <= 3)
     * 2. Subject Prerequisites Matching (3 passes, specific combinations)
     * 3. District & Merit Cutoff Comparison (High, Target, Reach chances)
     * 4. 255 Uni-Code Mapping
     */
    EligibilityResultDto evaluateEligibility(StudentEligibilityRequestDto request);

    /**
     * List all 255 official Uni-Codes with optional stream / university filter
     */
    List<UniCodeResponseDto> getAllUniCodes(String stream, String universityName);

    /**
     * Get specific Uni-Code details (e.g. "001A")
     */
    UniCodeResponseDto getUniCodeByCode(String code);
}
