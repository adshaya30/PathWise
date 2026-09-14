package com.pathwise.afteral.service.impl;

import com.pathwise.afteral.dto.*;
import com.pathwise.afteral.dto.CourseViewDto;
import com.pathwise.afteral.entity.AlResult;
import com.pathwise.afteral.exception.AlResultNotFoundException;
import com.pathwise.afteral.repository.AlResultRepository;
import com.pathwise.afteral.service.AlResultService;
import com.pathwise.afteral.service.AfterAlCourseEnrichmentService;
import com.pathwise.afteral.util.AfterAlCatalogMapper;
import com.pathwise.authentication.entity.User;
import com.pathwise.authentication.repository.UserRepository;
import com.pathwise.afteral.dto.CutoffResponseDto;
import com.pathwise.course.dto.EligibilityResultDto;
import com.pathwise.course.dto.StudentEligibilityRequestDto;
import com.pathwise.course.entity.CourseCutoffMark;
import com.pathwise.course.repository.CourseCutoffMarkRepository;
import com.pathwise.course.service.EligibilityEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlResultServiceImpl implements AlResultService {

    /**
     * The full eligibility engine is expensive (loads every uni code + reference tables
     * and runs per-course similarity scans). A single after-al page load triggers up to
     * three evaluations (getLatestResults + getEligibleCourses + getUniversities), so we
     * cache the result for a short TTL, keyed by result identity+version. Saving a new
     * result updates updatedAt -> new key -> fresh evaluation.
     */
    private static final long EVALUATION_CACHE_TTL_MS = 60_000L;

    private record EvaluationCacheEntry(EligibilityResultDto value, long expiresAt) {}

    private final Map<String, EvaluationCacheEntry> evaluationCache = new ConcurrentHashMap<>();

    private final AlResultRepository alResultRepository;
    private final UserRepository userRepository;
    private final EligibilityEngineService eligibilityEngineService;
    private final CourseCutoffMarkRepository courseCutoffMarkRepository;
    private final AfterAlCourseEnrichmentService courseEnrichmentService;

    @Override
    @Transactional
    public AlResultResponseDto saveResults(AlResultRequestDto dto, String userEmail, String anonymousId) {
        log.info("Saving After A/L results for userEmail: {}, anonymousId: {}, district: {}, stream: {}",
                userEmail, anonymousId, dto.getDistrict(), dto.getStream());

        Optional<AlResult> existingOpt = Optional.empty();
        if (userEmail != null && !userEmail.isBlank()) {
            existingOpt = alResultRepository.findTopByUserEmailOrderByUpdatedAtDesc(userEmail);
        } else if (anonymousId != null && !anonymousId.isBlank()) {
            existingOpt = alResultRepository.findTopByAnonymousIdOrderByUpdatedAtDesc(anonymousId);
        }

        AlResult entity = existingOpt.orElseGet(AlResult::new);

        // Associate user if logged in
        if (userEmail != null && !userEmail.isBlank()) {
            entity.setUserEmail(userEmail);
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            userOpt.ifPresent(entity::setUser);
        } else if (anonymousId != null && !anonymousId.isBlank()) {
            entity.setAnonymousId(anonymousId);
        }

        entity.setStream(dto.getStream().trim());
        entity.setExamYear(dto.getExamYear() != null ? dto.getExamYear().trim() : "2026");
        entity.setDistrict(dto.getDistrict().trim());
        entity.setAttemptNumber(dto.getAttemptNumber() != null ? dto.getAttemptNumber() : 1);

        // A/L Subjects
        entity.setSubject1(dto.getSubject1().trim());
        entity.setSubject1Grade(dto.getSubject1Grade().trim().toUpperCase());
        entity.setSubject2(dto.getSubject2().trim());
        entity.setSubject2Grade(dto.getSubject2Grade().trim().toUpperCase());
        entity.setSubject3(dto.getSubject3().trim());
        entity.setSubject3Grade(dto.getSubject3Grade().trim().toUpperCase());

        entity.setEnglishGrade(dto.getEnglishGrade() != null ? dto.getEnglishGrade().trim() : null);
        entity.setCgtMarks(dto.getCgtMarks());
        entity.setZScore(dto.getZScore());

        // G.C.E (O/L) Requirements
        entity.setOlEnglish(dto.getOlEnglish() != null ? dto.getOlEnglish().trim().toUpperCase() : null);
        entity.setOlMathematics(dto.getOlMathematics() != null ? dto.getOlMathematics().trim().toUpperCase() : null);
        entity.setOlScience(dto.getOlScience() != null ? dto.getOlScience().trim().toUpperCase() : null);
        entity.setOlLanguage(dto.getOlLanguage() != null ? dto.getOlLanguage().trim().toUpperCase() : null);

        AlResult saved = alResultRepository.save(entity);
        log.info("Successfully saved AlResult ID: {} for user: {}", saved.getId(), userEmail != null ? userEmail : anonymousId);

        AlResultResponseDto response = AlResultResponseDto.fromEntity(saved);

        // Auto-evaluate eligibility
        try {
            EligibilityResultDto eval = evaluateEligibilityFromEntity(saved);
            response.setEligibilitySummary(eval);
        } catch (Exception e) {
            log.warn("Failed to auto-evaluate eligibility on save: {}", e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public AlResultResponseDto getLatestResults(String userEmail, String anonymousId) {
        Optional<AlResult> resultOpt = Optional.empty();
        if (userEmail != null && !userEmail.isBlank()) {
            resultOpt = alResultRepository.findTopByUserEmailOrderByUpdatedAtDesc(userEmail);
        }
        if (resultOpt.isEmpty() && anonymousId != null && !anonymousId.isBlank()) {
            resultOpt = alResultRepository.findTopByAnonymousIdOrderByUpdatedAtDesc(anonymousId);
        }

        if (resultOpt.isEmpty()) {
            return null;
        }

        AlResult entity = resultOpt.get();
        AlResultResponseDto response = AlResultResponseDto.fromEntity(entity);

        try {
            EligibilityResultDto eval = evaluateEligibilityFromEntity(entity);
            response.setEligibilitySummary(eval);
        } catch (Exception e) {
            log.warn("Failed to evaluate eligibility on fetch: {}", e.getMessage());
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public EligibilityResultDto evaluateLatestEligibility(String userEmail, String anonymousId) {
        Optional<AlResult> resultOpt = Optional.empty();
        if (userEmail != null && !userEmail.isBlank()) {
            resultOpt = alResultRepository.findTopByUserEmailOrderByUpdatedAtDesc(userEmail);
        }
        if (resultOpt.isEmpty() && anonymousId != null && !anonymousId.isBlank()) {
            resultOpt = alResultRepository.findTopByAnonymousIdOrderByUpdatedAtDesc(anonymousId);
        }

        if (resultOpt.isEmpty()) {
            throw new AlResultNotFoundException("No saved A/L results found. Please enter your results first.");
        }

        return evaluateEligibilityFromEntity(resultOpt.get());
    }

    @Override
    @Transactional(readOnly = true)
    public AfterAlCatalogResponseDto getEligibleCourses(String userEmail, String anonymousId, String filter, String search) {
        EligibilityResultDto evaluation = evaluateLatestEligibility(userEmail, anonymousId);
        List<CourseViewDto> courses = enrichFilteredCourses(evaluation, filter, search);

        return AfterAlCatalogResponseDto.builder()
                .summary(AfterAlCatalogMapper.summaryWithoutCourses(evaluation))
                .filter(filter == null || filter.isBlank() ? "all" : filter.trim())
                .search(search)
                .totalReturned(courses.size())
                .courses(courses)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AfterAlUniversitiesResponseDto getUniversities(String userEmail, String anonymousId, String filter, String search) {
        EligibilityResultDto evaluation = evaluateLatestEligibility(userEmail, anonymousId);
        List<CourseViewDto> filteredCourses = enrichFilteredCourses(evaluation, filter, search);
        List<UniversityGroupDto> universities = AfterAlCatalogMapper.groupByUniversity(filteredCourses);

        return AfterAlUniversitiesResponseDto.builder()
                .summary(AfterAlCatalogMapper.summaryWithoutCourses(evaluation))
                .totalUniversities(universities.size())
                .universities(universities)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AfterAlCatalogResponseDto compareCourses(String userEmail, String anonymousId, List<String> uniCodes) {
        if (uniCodes == null || uniCodes.isEmpty()) {
            throw new IllegalArgumentException("At least one course code is required for comparison.");
        }
        if (uniCodes.size() > 4) {
            throw new IllegalArgumentException("You can compare up to 4 courses at a time.");
        }

        EligibilityResultDto evaluation = evaluateLatestEligibility(userEmail, anonymousId);
        List<EligibilityResultDto.MatchedUniCodeDto> allCourses = evaluation.getEligibleUniCodes() != null
                ? evaluation.getEligibleUniCodes()
                : List.of();

        List<EligibilityResultDto.MatchedUniCodeDto> selected = new ArrayList<>();
        for (String requestedCode : uniCodes) {
            if (requestedCode == null || requestedCode.isBlank()) {
                continue;
            }
            allCourses.stream()
                    .filter(course -> course.getUniCode() != null
                            && course.getUniCode().equalsIgnoreCase(requestedCode.trim()))
                    .findFirst()
                    .ifPresent(selected::add);
        }

        if (selected.isEmpty()) {
            throw new IllegalArgumentException("None of the requested course codes matched your evaluated profile.");
        }

        List<CourseViewDto> enrichedSelected = courseEnrichmentService.enrichAll(
                selected, evaluation.getAcademicYear(), evaluation.getStream());

        return AfterAlCatalogResponseDto.builder()
                .summary(AfterAlCatalogMapper.summaryWithoutCourses(evaluation))
                .filter("compare")
                .search(null)
                .totalReturned(enrichedSelected.size())
                .courses(enrichedSelected)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AfterAlCatalogResponseDto getCourseDetail(String userEmail, String anonymousId, String uniCode) {
        if (uniCode == null || uniCode.isBlank()) {
            throw new IllegalArgumentException("Uni-Code is required.");
        }

        EligibilityResultDto evaluation = evaluateLatestEligibility(userEmail, anonymousId);
        EligibilityResultDto.MatchedUniCodeDto course = evaluation.getEligibleUniCodes() == null
                ? null
                : evaluation.getEligibleUniCodes().stream()
                .filter(item -> item.getUniCode() != null && item.getUniCode().equalsIgnoreCase(uniCode.trim()))
                .findFirst()
                .orElse(null);

        if (course == null) {
            throw new IllegalArgumentException("Course not found in your evaluated profile: " + uniCode.trim());
        }

        CourseViewDto enrichedCourse = courseEnrichmentService.enrich(
                course, evaluation.getAcademicYear(), evaluation.getStream());

        return AfterAlCatalogResponseDto.builder()
                .summary(AfterAlCatalogMapper.summaryWithoutCourses(evaluation))
                .filter("detail")
                .search(uniCode.trim())
                .totalReturned(1)
                .courses(List.of(enrichedCourse))
                .build();
    }

    private List<CourseViewDto> enrichFilteredCourses(
            EligibilityResultDto evaluation,
            String filter,
            String search
    ) {
        List<EligibilityResultDto.MatchedUniCodeDto> filtered = AfterAlCatalogMapper.filterCourses(
                evaluation.getEligibleUniCodes(), filter, search);
        return courseEnrichmentService.enrichAll(
                filtered, evaluation.getAcademicYear(), evaluation.getStream());
    }

    private EligibilityResultDto evaluateEligibilityFromEntity(AlResult result) {
        String cacheKey = (result.getUserEmail() != null && !result.getUserEmail().isBlank()
                ? "u:" + result.getUserEmail()
                : "a:" + result.getAnonymousId())
                + "::" + result.getId()
                + "::" + result.getUpdatedAt();

        long now = System.currentTimeMillis();
        EvaluationCacheEntry cached = evaluationCache.get(cacheKey);
        if (cached != null && cached.expiresAt() > now) {
            return cached.value();
        }

        List<StudentEligibilityRequestDto.SubjectGradeDto> subjectList = new ArrayList<>();
        if (result.getSubject1() != null && !result.getSubject1().isBlank()) {
            subjectList.add(new StudentEligibilityRequestDto.SubjectGradeDto(result.getSubject1(), result.getSubject1Grade()));
        }
        if (result.getSubject2() != null && !result.getSubject2().isBlank()) {
            subjectList.add(new StudentEligibilityRequestDto.SubjectGradeDto(result.getSubject2(), result.getSubject2Grade()));
        }
        if (result.getSubject3() != null && !result.getSubject3().isBlank()) {
            subjectList.add(new StudentEligibilityRequestDto.SubjectGradeDto(result.getSubject3(), result.getSubject3Grade()));
        }

        StudentEligibilityRequestDto req = StudentEligibilityRequestDto.builder()
                .district(result.getDistrict())
                .stream(result.getStream())
                .zScore(result.getZScore())
                .attemptNumber(result.getAttemptNumber())
                .subjects(subjectList)
                .academicYear(result.getExamYear())
                .olEnglish(result.getOlEnglish())
                .olMathematics(result.getOlMathematics())
                .olScience(result.getOlScience())
                .olLanguage(result.getOlLanguage())
                .build();

        EligibilityResultDto evaluated = eligibilityEngineService.evaluateEligibility(req);

        if (evaluationCache.size() > 1000) {
            evaluationCache.clear();
        }
        evaluationCache.put(cacheKey, new EvaluationCacheEntry(evaluated, System.currentTimeMillis() + EVALUATION_CACHE_TTL_MS));

        return evaluated;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CutoffResponseDto> getCutoffMarks(String academicYear, String district, String search) {
        String cleanYear = academicYear != null && !academicYear.isBlank() && !academicYear.equalsIgnoreCase("All") ? academicYear.trim() : null;
        String cleanDistrict = district != null && !district.isBlank() && !district.equalsIgnoreCase("All") ? district.trim() : null;
        String cleanSearch = search != null && !search.isBlank() ? search.trim() : null;

        List<CourseCutoffMark> entities = courseCutoffMarkRepository.searchCutoffs(cleanYear, cleanDistrict, cleanSearch);
        return entities.stream()
                .map(CutoffResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getDistinctAcademicYears() {
        return courseCutoffMarkRepository.findDistinctAcademicYears().stream()
                .filter(y -> y != null && !y.isBlank() && !y.contains("---") && !y.startsWith(":"))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getDistinctDistricts() {
        return courseCutoffMarkRepository.findDistinctDistricts().stream()
                .filter(d -> d != null && !d.isBlank() && !d.contains("---") && !d.startsWith(":") && d.length() > 1)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }
}
