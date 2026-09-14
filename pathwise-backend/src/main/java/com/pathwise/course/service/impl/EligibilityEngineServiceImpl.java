package com.pathwise.course.service.impl;

import com.pathwise.course.dto.EligibilityResultDto;
import com.pathwise.course.dto.StudentEligibilityRequestDto;
import com.pathwise.course.dto.UniCodeResponseDto;
import com.pathwise.course.entity.*;
import com.pathwise.course.repository.*;
import com.pathwise.course.service.EligibilityEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EligibilityEngineServiceImpl implements EligibilityEngineService {

    private static final double DISADVANTAGED_QUOTA_BONUS = 0.05;
    private static final double HIGH_CHANCE_THRESHOLD = 0.05;
    private static final double TARGET_CHANCE_THRESHOLD = -0.05;
    private static final double REACH_WINDOW = -0.20;
    private static final int MAX_UGC_ATTEMPTS = 3;

    private static final Map<String, Integer> GRADE_RANK = Map.of(
            "A", 5, "B", 4, "C", 3, "S", 2, "F", 1
    );

    private final UniCodeRepository uniCodeRepository;
    private final CoursePrerequisiteRepository prerequisiteRepository;
    private final CourseCutoffMarkRepository cutoffMarkRepository;
    private final DistrictInfoRepository districtInfoRepository;
    private final CourseOlRequirementRepository olRequirementRepository;
    private final CourseIntakeRepository intakeRepository;
    private final CourseAptitudeTestRequirementRepository aptitudeTestRepository;

    @Override
    @Transactional(readOnly = true)
    public EligibilityResultDto evaluateEligibility(StudentEligibilityRequestDto request) {
        log.info("Evaluating student eligibility: District={}, Stream={}, ZScore={}, Attempt={}, Year={}",
                request.getDistrict(), request.getStream(), request.getZScore(),
                request.getAttemptNumber(), request.getAcademicYear());

        String district = request.getDistrict().trim().toUpperCase();
        String stream = request.getStream().trim();
        double zScore = request.getZScore();
        int attempt = request.getAttemptNumber() != null ? request.getAttemptNumber() : 1;
        boolean attemptExceeded = attempt > MAX_UGC_ATTEMPTS;
        boolean hasFailedAlSubject = hasFailedAlSubject(request.getSubjects());

        boolean isDisadvantaged = districtInfoRepository.findByNameIgnoreCase(district)
                .map(d -> Boolean.TRUE.equals(d.getIsDisadvantaged()))
                .orElse(false);

        String academicYear = resolveAcademicYear(request.getAcademicYear());
        Set<String> eligibleCourseNames = getPrerequisiteEligibleCourses(stream, request.getSubjects());

        List<CourseCutoffMark> districtCutoffs = loadDistrictCutoffs(district, academicYear);
        List<CourseOlRequirement> olRequirements = loadOlRequirements(academicYear);
        List<CourseIntake> intakes = loadIntakes(academicYear);
        List<CourseAptitudeTestRequirement> aptitudeTests = loadAptitudeTests(academicYear);

        List<UniCode> streamUniCodes = uniCodeRepository.findByStreamIgnoreCase(stream);
        if (streamUniCodes.isEmpty()) {
            streamUniCodes = uniCodeRepository.findAll();
        }

        List<EligibilityResultDto.MatchedUniCodeDto> matchedUniCodes = new ArrayList<>();
        int highChance = 0;
        int targetChance = 0;
        int reachChance = 0;

        for (UniCode uniCode : streamUniCodes) {
            if (!eligibleCourseNames.isEmpty()
                    && !isCourseMatching(uniCode.getCourseName(), eligibleCourseNames)) {
                continue;
            }

            Optional<CourseCutoffMark> cutoffOpt = districtCutoffs.stream()
                    .filter(c -> isCourseNameSimilar(c.getCourseName(), uniCode.getCourseName())
                            && isUniversityNameSimilar(c.getUniversityName(), uniCode.getUniversityName()))
                    .findFirst();

            boolean usesEstimatedCutoff = cutoffOpt.isEmpty() || cutoffOpt.get().getCutoffMark() == null;
            Double cutoffValue = cutoffOpt.map(CourseCutoffMark::getCutoffMark).orElse(null);
            if (cutoffValue == null) {
                cutoffValue = estimateCutoffForCourse(uniCode.getCourseName());
            }

            if (cutoffValue == null) {
                continue;
            }

            boolean quotaApplied = isDisadvantaged;
            double effectiveCutoff = quotaApplied ? cutoffValue - DISADVANTAGED_QUOTA_BONUS : cutoffValue;
            double diff = zScore - effectiveCutoff;
            String chance = categorizeChance(diff);

            OlCheckResult olCheck = evaluateOlRequirements(
                    uniCode.getCourseName(),
                    olRequirements,
                    request
            );

            boolean hasAptitudeTest = Boolean.TRUE.equals(uniCode.getHasAptitudeTest())
                    || hasAptitudeTestRecord(uniCode, aptitudeTests);

            String eligibilityStatus = resolveEligibilityStatus(
                    attemptExceeded,
                    hasFailedAlSubject,
                    olCheck,
                    hasAptitudeTest,
                    diff
            );

            switch (chance) {
                case "HIGH_CHANCE" -> highChance++;
                case "TARGET_CHANCE" -> targetChance++;
                case "REACH_CHANCE" -> reachChance++;
                default -> { }
            }

            Integer proposedIntake = findProposedIntake(
                    uniCode.getCourseName(),
                    uniCode.getUniversityName(),
                    intakes
            );

            String medium = cutoffOpt.map(CourseCutoffMark::getMediumOfInstruction).orElse(null);
            String prereqMessage = buildPrerequisiteMessage(hasFailedAlSubject, eligibleCourseNames.isEmpty());

            matchedUniCodes.add(EligibilityResultDto.MatchedUniCodeDto.builder()
                    .uniCode(uniCode.getCode())
                    .courseName(uniCode.getCourseName())
                    .universityName(uniCode.getUniversityName())
                    .stream(uniCode.getStream())
                    .cutoffZScore(Math.round(cutoffValue * 10000.0) / 10000.0)
                    .zScoreDifference(Math.round(diff * 10000.0) / 10000.0)
                    .chanceCategory(chance)
                    .eligibilityStatus(eligibilityStatus)
                    .selectionMethod(uniCode.getSelectionMethod())
                    .hasAptitudeTest(hasAptitudeTest)
                    .prerequisitesMet(prereqMessage)
                    .olRequirementsMet(olCheck.met())
                    .olRequirementsSummary(olCheck.summary())
                    .proposedIntake(proposedIntake)
                    .mediumOfInstruction(medium)
                    .usesEstimatedCutoff(usesEstimatedCutoff)
                    .disadvantagedQuotaApplied(quotaApplied)
                    .build());
        }

        matchedUniCodes.sort(Comparator
                .comparing((EligibilityResultDto.MatchedUniCodeDto m) -> chanceOrder(m.getChanceCategory()))
                .thenComparing(m -> statusOrder(m.getEligibilityStatus()))
                .thenComparing(m -> -m.getCutoffZScore()));

        String summary = buildSummary(
                zScore, district, stream, academicYear, attemptExceeded,
                highChance, targetChance, reachChance, matchedUniCodes.size(), isDisadvantaged
        );

        return EligibilityResultDto.builder()
                .isEligible(!attemptExceeded && !hasFailedAlSubject)
                .ineligibilityReason(buildIneligibilityReason(attemptExceeded, hasFailedAlSubject))
                .district(district)
                .stream(stream)
                .studentZScore(zScore)
                .attemptNumber(attempt)
                .isDisadvantagedDistrict(isDisadvantaged)
                .academicYear(academicYear)
                .totalEligibleUniCodes(matchedUniCodes.size())
                .highChanceCount(highChance)
                .moderateChanceCount(targetChance)
                .targetChanceCount(targetChance)
                .reachChanceCount(reachChance)
                .eligibleUniCodes(matchedUniCodes)
                .summaryMessage(summary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UniCodeResponseDto> getAllUniCodes(String stream, String universityName) {
        List<UniCode> list;
        if (stream != null && !stream.isBlank()) {
            list = uniCodeRepository.findByStreamIgnoreCase(stream.trim());
        } else if (universityName != null && !universityName.isBlank()) {
            list = uniCodeRepository.findByUniversityNameIgnoreCase(universityName.trim());
        } else {
            list = uniCodeRepository.findAll();
        }
        return list.stream().map(UniCodeResponseDto::fromEntity).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UniCodeResponseDto getUniCodeByCode(String code) {
        return uniCodeRepository.findByCodeIgnoreCase(code.trim())
                .map(UniCodeResponseDto::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("Uni-Code not found: " + code));
    }

    // ─── Data loading ────────────────────────────────────────────────────────

    private String resolveAcademicYear(String requestedYear) {
        List<String> availableYears = cutoffMarkRepository.findDistinctAcademicYears();
        if (availableYears.isEmpty()) {
            return requestedYear != null ? requestedYear.trim() : null;
        }

        if (requestedYear != null && !requestedYear.isBlank()) {
            String trimmed = requestedYear.trim();
            for (String year : availableYears) {
                if (year.equalsIgnoreCase(trimmed)) {
                    return year;
                }
            }
        }

        return availableYears.get(0);
    }

    private List<CourseCutoffMark> loadDistrictCutoffs(String district, String academicYear) {
        if (academicYear != null && !academicYear.isBlank()) {
            List<CourseCutoffMark> yearCutoffs =
                    cutoffMarkRepository.findByDistrictIgnoreCaseAndAcademicYear(district, academicYear);
            if (!yearCutoffs.isEmpty()) {
                return yearCutoffs;
            }
        }

        return cutoffMarkRepository.findAll().stream()
                .filter(c -> c.getDistrict() != null && c.getDistrict().equalsIgnoreCase(district))
                .toList();
    }

    private List<CourseOlRequirement> loadOlRequirements(String academicYear) {
        if (academicYear == null || academicYear.isBlank()) {
            return olRequirementRepository.findAll();
        }
        List<CourseOlRequirement> rows = olRequirementRepository.findByAcademicYear(academicYear);
        return rows.isEmpty() ? olRequirementRepository.findAll() : rows;
    }

    private List<CourseIntake> loadIntakes(String academicYear) {
        if (academicYear == null || academicYear.isBlank()) {
            return intakeRepository.findAll();
        }
        List<CourseIntake> rows = intakeRepository.findByAcademicYear(academicYear);
        return rows.isEmpty() ? intakeRepository.findAll() : rows;
    }

    private List<CourseAptitudeTestRequirement> loadAptitudeTests(String academicYear) {
        if (academicYear == null || academicYear.isBlank()) {
            return aptitudeTestRepository.findAll();
        }
        List<CourseAptitudeTestRequirement> rows = aptitudeTestRepository.findByAcademicYear(academicYear);
        return rows.isEmpty() ? aptitudeTestRepository.findAll() : rows;
    }

    // ─── O/L evaluation ──────────────────────────────────────────────────────

    private record OlCheckResult(boolean met, boolean unknown, String summary) { }

    private OlCheckResult evaluateOlRequirements(
            String courseName,
            List<CourseOlRequirement> olRequirements,
            StudentEligibilityRequestDto request
    ) {
        Optional<CourseOlRequirement> requirementOpt = olRequirements.stream()
                .filter(r -> isCourseNameSimilar(r.getCourseName(), courseName))
                .findFirst();

        if (requirementOpt.isEmpty()) {
            return new OlCheckResult(true, false, "No published O/L requirements for this course.");
        }

        CourseOlRequirement req = requirementOpt.get();
        List<String> failures = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        checkOlGrade("English", request.getOlEnglish(), req.getEnglishGrade(), failures, missing);
        checkOlGrade("Mathematics", request.getOlMathematics(), req.getMathematicsGrade(), failures, missing);
        checkOlGrade("Science", request.getOlScience(), req.getScienceGrade(), failures, missing);

        if (hasRequirement(req.getSinhalaLangGrade())) {
            checkOlGrade("Sinhala", request.getOlLanguage(), req.getSinhalaLangGrade(), failures, missing);
        }
        if (hasRequirement(req.getTamilLangGrade())) {
            checkOlGrade("Tamil", request.getOlLanguage(), req.getTamilLangGrade(), failures, missing);
        }

        if (!failures.isEmpty()) {
            return new OlCheckResult(false, false,
                    "O/L requirements not met: " + String.join(", ", failures));
        }
        if (!missing.isEmpty()) {
            return new OlCheckResult(false, true,
                    "Enter O/L grades to verify: " + String.join(", ", missing));
        }

        return new OlCheckResult(true, false, "Meets published O/L grade requirements.");
    }

    private void checkOlGrade(
            String subject,
            String studentGrade,
            String requiredGrade,
            List<String> failures,
            List<String> missing
    ) {
        if (!hasRequirement(requiredGrade)) {
            return;
        }
        if (studentGrade == null || studentGrade.isBlank()) {
            missing.add(subject + " (min " + requiredGrade.trim().toUpperCase() + ")");
            return;
        }
        if (!meetsGradeRequirement(studentGrade, requiredGrade)) {
            failures.add(subject + " requires minimum " + requiredGrade.trim().toUpperCase()
                    + " (you have " + studentGrade.trim().toUpperCase() + ")");
        }
    }

    private boolean hasRequirement(String grade) {
        return grade != null && !grade.isBlank() && !grade.equals("-") && !grade.equals("–");
    }

    private boolean meetsGradeRequirement(String studentGrade, String requiredGrade) {
        int student = GRADE_RANK.getOrDefault(studentGrade.trim().toUpperCase(), 0);
        int required = GRADE_RANK.getOrDefault(requiredGrade.trim().toUpperCase(), 0);
        return student >= required && student > 1;
    }

    // ─── Status & matching helpers ───────────────────────────────────────────

    private boolean hasFailedAlSubject(List<StudentEligibilityRequestDto.SubjectGradeDto> subjects) {
        if (subjects == null) {
            return false;
        }
        return subjects.stream()
                .anyMatch(s -> s.getGrade() != null && s.getGrade().equalsIgnoreCase("F"));
    }

    private String resolveEligibilityStatus(
            boolean attemptExceeded,
            boolean hasFailedAlSubject,
            OlCheckResult olCheck,
            boolean hasAptitudeTest,
            double diff
    ) {
        if (attemptExceeded || hasFailedAlSubject || (!olCheck.met() && !olCheck.unknown())) {
            return "NOT_ELIGIBLE";
        }
        if (diff < 0) {
            return "NOT_ELIGIBLE";
        }
        if (olCheck.unknown()) {
            return "NEEDS_REVIEW";
        }
        if (hasAptitudeTest) {
            return "NEEDS_REVIEW";
        }
        return "ELIGIBLE";
    }

    private String categorizeChance(double diff) {
        if (diff >= HIGH_CHANCE_THRESHOLD) {
            return "HIGH_CHANCE";
        }
        if (diff >= TARGET_CHANCE_THRESHOLD) {
            return "TARGET_CHANCE";
        }
        return "REACH_CHANCE";
    }

    private boolean hasAptitudeTestRecord(UniCode uniCode, List<CourseAptitudeTestRequirement> aptitudeTests) {
        return aptitudeTests.stream().anyMatch(test ->
                (uniCode.getCode() != null && uniCode.getCode().equalsIgnoreCase(test.getUniCode()))
                        || (isCourseNameSimilar(test.getCourseName(), uniCode.getCourseName())
                        && isUniversityNameSimilar(test.getUniversityName(), uniCode.getUniversityName()))
        );
    }

    private Integer findProposedIntake(String courseName, String universityName, List<CourseIntake> intakes) {
        return intakes.stream()
                .filter(i -> isCourseNameSimilar(i.getCourseName(), courseName)
                        && isUniversityNameSimilar(i.getUniversityName(), universityName))
                .map(CourseIntake::getProposedIntake)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private String buildPrerequisiteMessage(boolean hasFailedAlSubject, boolean noPrereqRestrictions) {
        if (hasFailedAlSubject) {
            return "One or more A/L subjects have an F grade.";
        }
        if (noPrereqRestrictions) {
            return "No stream-specific A/L prerequisite restrictions found.";
        }
        return "Satisfied all required A/L subject criteria.";
    }

    private String buildIneligibilityReason(boolean attemptExceeded, boolean hasFailedAlSubject) {
        if (attemptExceeded) {
            return "UGC allows a maximum of 3 A/L attempts for university admission.";
        }
        if (hasFailedAlSubject) {
            return "One or more A/L subjects have an F grade, which disqualifies standard degree admission.";
        }
        return null;
    }

    private String buildSummary(
            double zScore,
            String district,
            String stream,
            String academicYear,
            boolean attemptExceeded,
            int highChance,
            int targetChance,
            int reachChance,
            int totalMatches,
            boolean isDisadvantaged
    ) {
        String yearLabel = academicYear != null ? academicYear : "latest available";
        String quotaNote = isDisadvantaged
                ? " A 5% disadvantaged-district quota adjustment was applied to cutoffs."
                : "";

        if (attemptExceeded) {
            return String.format(
                    "Your profile exceeds the UGC maximum of 3 A/L attempts. %d courses were analyzed for reference using %s cutoffs in %s (%s).%s",
                    totalMatches, yearLabel, district, stream, quotaNote
            );
        }

        return String.format(
                "Based on your Z-Score of %.4f in %s District (%s) using %s cutoffs, you have %d High Chance, %d Target, and %d Reach options across %d matched courses.%s",
                zScore, district, stream, yearLabel, highChance, targetChance, reachChance, totalMatches, quotaNote
        );
    }

    private Set<String> getPrerequisiteEligibleCourses(
            String stream,
            List<StudentEligibilityRequestDto.SubjectGradeDto> subjects
    ) {
        List<CoursePrerequisite> allPrereqs = prerequisiteRepository.findByStreamIgnoreCase(stream);
        if (allPrereqs.isEmpty()) {
            return Collections.emptySet();
        }

        if (subjects == null || subjects.isEmpty()) {
            return allPrereqs.stream()
                    .map(CoursePrerequisite::getCourseName)
                    .collect(Collectors.toSet());
        }

        Set<String> passedSubjects = subjects.stream()
                .filter(s -> s.getGrade() != null && !s.getGrade().equalsIgnoreCase("F"))
                .map(s -> s.getName().trim().toLowerCase())
                .collect(Collectors.toSet());

        Set<String> eligibleCourses = new HashSet<>();
        for (CoursePrerequisite prereq : allPrereqs) {
            String[] reqs = prereq.getRequiredSubjects().toLowerCase().split("[,|;]");
            boolean allMet = true;
            for (String req : reqs) {
                String cleanReq = req.trim();
                if (!cleanReq.isEmpty() && !passedSubjects.contains(cleanReq)) {
                    allMet = false;
                    break;
                }
            }
            if (allMet) {
                eligibleCourses.add(prereq.getCourseName());
            }
        }
        return eligibleCourses;
    }

    private boolean isCourseMatching(String courseName, Set<String> eligibleCourses) {
        for (String ec : eligibleCourses) {
            if (isCourseNameSimilar(courseName, ec)) {
                return true;
            }
        }
        return false;
    }

    private boolean isCourseNameSimilar(String c1, String c2) {
        if (c1 == null || c2 == null) {
            return false;
        }
        String n1 = c1.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        String n2 = c2.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        return n1.contains(n2) || n2.contains(n1);
    }

    private boolean isUniversityNameSimilar(String u1, String u2) {
        if (u1 == null || u2 == null) {
            return false;
        }
        String n1 = u1.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        String n2 = u2.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        return n1.contains(n2) || n2.contains(n1);
    }

    private Double estimateCutoffForCourse(String courseName) {
        String upper = courseName.toUpperCase();
        if (upper.contains("MEDICINE")) return 1.9500;
        if (upper.contains("DENTAL")) return 1.8500;
        if (upper.contains("ENGINEERING")) return 1.7500;
        if (upper.contains("COMPUTER") || upper.contains("SOFTWARE")) return 1.6500;
        if (upper.contains("LAW")) return 1.7000;
        if (upper.contains("MANAGEMENT") || upper.contains("BUSINESS")) return 1.4000;
        if (upper.contains("ARTS")) return 1.2000;
        return 1.3000;
    }

    private int chanceOrder(String chance) {
        return switch (chance) {
            case "HIGH_CHANCE" -> 1;
            case "TARGET_CHANCE" -> 2;
            case "REACH_CHANCE" -> 3;
            default -> 4;
        };
    }

    private int statusOrder(String status) {
        return switch (status) {
            case "ELIGIBLE" -> 1;
            case "NEEDS_REVIEW" -> 2;
            case "NOT_ELIGIBLE" -> 3;
            default -> 4;
        };
    }
}
