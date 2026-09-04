package com.pathwise.course.controller;

import com.pathwise.course.dto.EligibilityResultDto;
import com.pathwise.course.dto.StudentEligibilityRequestDto;
import com.pathwise.course.dto.UniCodeResponseDto;
import com.pathwise.course.entity.DistrictInfo;
import com.pathwise.course.repository.DistrictInfoRepository;
import com.pathwise.course.service.EligibilityEngineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eligibility")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class EligibilityController {

    private final EligibilityEngineService eligibilityEngineService;
    private final DistrictInfoRepository districtInfoRepository;

    /**
     * POST /api/eligibility/evaluate
     * Evaluates a student's eligibility across all 8 UGC Handbook domains:
     * - Attempt count check (<= 3)
     * - Subject prerequisite filter
     * - District cutoff matching
     * - 255 Uni-Code mapping with High/Target/Reach chance categories
     */
    @PostMapping("/evaluate")
    public ResponseEntity<EligibilityResultDto> evaluateEligibility(
            @RequestBody @Valid StudentEligibilityRequestDto request
    ) {
        log.info("Received student eligibility evaluation request for district: {}, stream: {}",
                request.getDistrict(), request.getStream());
        EligibilityResultDto result = eligibilityEngineService.evaluateEligibility(request);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/eligibility/uni-codes
     * List official UGC Uni-Codes with optional stream / university filter
     */
    @GetMapping("/uni-codes")
    public ResponseEntity<List<UniCodeResponseDto>> getUniCodes(
            @RequestParam(value = "stream", required = false) String stream,
            @RequestParam(value = "university", required = false) String university
    ) {
        return ResponseEntity.ok(eligibilityEngineService.getAllUniCodes(stream, university));
    }

    /**
     * GET /api/eligibility/uni-codes/{code}
     * Get details for a specific Uni-Code (e.g. "001A")
     */
    @GetMapping("/uni-codes/{code}")
    public ResponseEntity<UniCodeResponseDto> getUniCodeByCode(@PathVariable String code) {
        return ResponseEntity.ok(eligibilityEngineService.getUniCodeByCode(code));
    }

    /**
     * GET /api/eligibility/districts
     * List all 25 Sri Lankan administrative districts with disadvantaged quota flags
     */
    @GetMapping("/districts")
    public ResponseEntity<List<DistrictInfo>> getDistricts() {
        return ResponseEntity.ok(districtInfoRepository.findAll());
    }
}
