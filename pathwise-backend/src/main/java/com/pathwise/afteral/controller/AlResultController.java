package com.pathwise.afteral.controller;

import com.pathwise.afteral.dto.*;
import com.pathwise.afteral.service.AlResultService;
import com.pathwise.course.dto.EligibilityResultDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/after-al")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AlResultController {

    private final AlResultService alResultService;

    /**
     * POST /api/after-al/results
     * Save or update After A/L results, grades, and O/L prerequisites
     */
    @PostMapping("/results")
    public ResponseEntity<AlResultResponseDto> saveResults(
            @RequestBody @Valid AlResultRequestDto requestDto,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            Authentication authentication
    ) {
        String userEmail = authentication != null && authentication.isAuthenticated() && !authentication.getName().equalsIgnoreCase("anonymousUser")
                ? authentication.getName()
                : null;
        String anonymousId = requestDto.getAnonymousId() != null && !requestDto.getAnonymousId().isBlank()
                ? requestDto.getAnonymousId()
                : anonymousIdHeader;

        log.info("Received save After A/L results request from user: {}, anonymousId: {}", userEmail, anonymousId);
        AlResultResponseDto response = alResultService.saveResults(requestDto, userEmail, anonymousId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/after-al/results
     * Fetch previously saved results for the active student
     */
    @GetMapping("/results")
    public ResponseEntity<AlResultResponseDto> getLatestResults(
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        String userEmail = authentication != null && authentication.isAuthenticated() && !authentication.getName().equalsIgnoreCase("anonymousUser")
                ? authentication.getName()
                : null;
        String anonymousId = anonymousIdParam != null && !anonymousIdParam.isBlank() ? anonymousIdParam : anonymousIdHeader;

        AlResultResponseDto response = alResultService.getLatestResults(userEmail, anonymousId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/after-al/evaluate
     * Re-evaluates eligibility based on the latest saved A/L results
     */
    @PostMapping("/evaluate")
    public ResponseEntity<EligibilityResultDto> evaluateLatest(
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        String userEmail = authentication != null && authentication.isAuthenticated() && !authentication.getName().equalsIgnoreCase("anonymousUser")
                ? authentication.getName()
                : null;
        String anonymousId = anonymousIdParam != null && !anonymousIdParam.isBlank() ? anonymousIdParam : anonymousIdHeader;

        return ResponseEntity.ok(alResultService.evaluateLatestEligibility(userEmail, anonymousId));
    }

    /**
     * GET /api/after-al/cutoffs
     * Retrieve published cutoff marks with optional filtering
     */
    @GetMapping("/cutoffs")
    public ResponseEntity<java.util.List<com.pathwise.afteral.dto.CutoffResponseDto>> getCutoffs(
            @RequestParam(value = "academicYear", required = false) String academicYear,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "search", required = false) String search
    ) {
        log.info("Fetching cutoffs - year: {}, district: {}, search: {}", academicYear, district, search);
        return ResponseEntity.ok(alResultService.getCutoffMarks(academicYear, district, search));
    }

    /**
     * GET /api/after-al/cutoffs/filters
     * Retrieve available academic years and districts for filters
     */
    @GetMapping("/cutoffs/filters")
    public ResponseEntity<java.util.Map<String, Object>> getCutoffFilters() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("academicYears", alResultService.getDistinctAcademicYears());
        map.put("districts", alResultService.getDistinctDistricts());
        return ResponseEntity.ok(map);
    }

    /**
     * GET /api/after-al/eligible-courses
     * Flat course list for the saved student profile
     */
    @GetMapping("/eligible-courses")
    public ResponseEntity<AfterAlCatalogResponseDto> getEligibleCourses(
            @RequestParam(value = "filter", required = false, defaultValue = "all") String filter,
            @RequestParam(value = "search", required = false) String search,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        Identity identity = resolveIdentity(authentication, anonymousIdHeader, anonymousIdParam);
        return ResponseEntity.ok(alResultService.getEligibleCourses(identity.userEmail(), identity.anonymousId(), filter, search));
    }

    /**
     * GET /api/after-al/universities
     * Universities grouped with matched courses for the saved student profile
     */
    @GetMapping("/universities")
    public ResponseEntity<AfterAlUniversitiesResponseDto> getUniversities(
            @RequestParam(value = "filter", required = false, defaultValue = "all") String filter,
            @RequestParam(value = "search", required = false) String search,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        Identity identity = resolveIdentity(authentication, anonymousIdHeader, anonymousIdParam);
        return ResponseEntity.ok(alResultService.getUniversities(identity.userEmail(), identity.anonymousId(), filter, search));
    }

    /**
     * POST /api/after-al/compare
     * Compare up to 4 courses for the saved student profile
     */
    @PostMapping("/compare")
    public ResponseEntity<AfterAlCatalogResponseDto> compareCourses(
            @RequestBody @Valid CompareCoursesRequestDto request,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        Identity identity = resolveIdentity(authentication, anonymousIdHeader, anonymousIdParam);
        return ResponseEntity.ok(alResultService.compareCourses(
                identity.userEmail(), identity.anonymousId(), request.getUniCodes()));
    }

    /**
     * GET /api/after-al/courses/{uniCode}
     * Single course detail for the saved student profile
     */
    @GetMapping("/courses/{uniCode}")
    public ResponseEntity<AfterAlCatalogResponseDto> getCourseDetail(
            @PathVariable String uniCode,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        Identity identity = resolveIdentity(authentication, anonymousIdHeader, anonymousIdParam);
        return ResponseEntity.ok(alResultService.getCourseDetail(identity.userEmail(), identity.anonymousId(), uniCode));
    }

    private Identity resolveIdentity(
            Authentication authentication,
            String anonymousIdHeader,
            String anonymousIdParam
    ) {
        String userEmail = authentication != null
                && authentication.isAuthenticated()
                && !authentication.getName().equalsIgnoreCase("anonymousUser")
                ? authentication.getName()
                : null;
        String anonymousId = anonymousIdParam != null && !anonymousIdParam.isBlank()
                ? anonymousIdParam
                : anonymousIdHeader;
        return new Identity(userEmail, anonymousId);
    }

    private record Identity(String userEmail, String anonymousId) {
    }
}
