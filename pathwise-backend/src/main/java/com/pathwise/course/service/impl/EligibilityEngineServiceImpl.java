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

    private final UniCodeRepository uniCodeRepository;
    private final com.pathwise.course.repository.CoursePrerequisiteRepository prerequisiteRepository;
    private final CourseCutoffMarkRepository cutoffMarkRepository;
    private final DistrictInfoRepository districtInfoRepository;

    @Override
    @Transactional(readOnly = true)
    public EligibilityResultDto evaluateEligibility(StudentEligibilityRequestDto request) {
        log.info("Evaluating student eligibility: District={}, Stream={}, ZScore={}, Attempt={}",
                request.getDistrict(), request.getStream(), request.getZScore(), request.getAttemptNumber());

        String district = request.getDistrict().trim().toUpperCase();
        String stream = request.getStream().trim();
        double zScore = request.getZScore();
        int attempt = request.getAttemptNumber() != null ? request.getAttemptNumber() : 1;

        // ─── Domain 8: Ineligibility Rules (UGC Rule: Max 3 Attempts) ─────────
        if (attempt > 3) {
            return EligibilityResultDto.builder()
                    .isEligible(false)
                    .ineligibilityReason("Under UGC admission regulations, candidates who have sat for the G.C.E. (A/L) examination more than three (3) times are not eligible for state university admissions. We strongly recommend considering alternative pathways such as The Open University of Sri Lanka (OUSL), NVQ/SLIATE Diploma programmes, or international degree transfer pathways.")
                    .district(district)
                    .stream(stream)
                    .studentZScore(zScore)
                    .attemptNumber(attempt)
                    .totalEligibleUniCodes(0)
                    .eligibleUniCodes(Collections.emptyList())
                    .summaryMessage("Ineligible due to attempt limit (> 3 attempts).")
                    .build();
        }

        // Check if district is educationally disadvantaged (5% quota)
        boolean isDisadvantaged = districtInfoRepository.findByNameIgnoreCase(district)
                .map(d -> Boolean.TRUE.equals(d.getIsDisadvantaged()))
                .orElse(false);

        // ─── Domain 3: A/L Subject Prerequisites Matching ─────────────────────
        Set<String> eligibleCourseNames = getPrerequisiteEligibleCourses(stream, request.getSubjects());

        // ─── Domain 5 & 4: Cutoff Z-Score + Uni-Code Matching ──────────────────
        List<CourseCutoffMark> districtCutoffs = cutoffMarkRepository.findAll()
                .stream()
                .filter(c -> c.getDistrict().equalsIgnoreCase(district))
                .toList();

        // Fetch all relevant Uni-Codes for this stream
        List<UniCode> streamUniCodes = uniCodeRepository.findByStreamIgnoreCase(stream);
        if (streamUniCodes.isEmpty()) {
            streamUniCodes = uniCodeRepository.findAll();
        }

        List<EligibilityResultDto.MatchedUniCodeDto> matchedUniCodes = new ArrayList<>();
        int highChance = 0;
        int targetChance = 0;
        int reachChance = 0;

        for (UniCode uniCode : streamUniCodes) {
            // Check if course matches prerequisite eligibility
            if (!eligibleCourseNames.isEmpty() && !isCourseMatching(uniCode.getCourseName(), eligibleCourseNames)) {
                continue;
            }

            // Find cutoff mark for this course + university in this district
            Optional<CourseCutoffMark> cutoffOpt = districtCutoffs.stream()
                    .filter(c -> isCourseNameSimilar(c.getCourseName(), uniCode.getCourseName())
                            && isUniversityNameSimilar(c.getUniversityName(), uniCode.getUniversityName()))
                    .findFirst();

            Double cutoffValue = cutoffOpt.map(CourseCutoffMark::getCutoffMark).orElse(null);

            // If no specific cutoff exists, estimate from course average or fallback
            if (cutoffValue == null) {
                cutoffValue = estimateCutoffForCourse(uniCode.getCourseName());
            }

            if (cutoffValue != null) {
                double diff = zScore - cutoffValue;
                String chance;

                if (diff >= 0.05) {
                    chance = "HIGH_CHANCE";
                    highChance++;
                } else if (diff >= -0.05) {
                    chance = "TARGET_CHANCE";
                    targetChance++;
                } else {
                    chance = "REACH_CHANCE";
                    reachChance++;
                }

                // Include all high, target, and reach (within 0.20 diff)
                if (diff >= -0.20) {
                    matchedUniCodes.add(EligibilityResultDto.MatchedUniCodeDto.builder()
                            .uniCode(uniCode.getCode())
                            .courseName(uniCode.getCourseName())
                            .universityName(uniCode.getUniversityName())
                            .stream(uniCode.getStream())
                            .cutoffZScore(cutoffValue)
                            .zScoreDifference(Math.round(diff * 10000.0) / 10000.0)
                            .chanceCategory(chance)
                            .selectionMethod(uniCode.getSelectionMethod())
                            .hasAptitudeTest(Boolean.TRUE.equals(uniCode.getHasAptitudeTest()))
                            .prerequisitesMet("Satisfied all required A/L subject criteria")
                            .build());
                }
            }
        }

        // Sort: High Chance first, then by cutoff descending
        matchedUniCodes.sort(Comparator
                .comparing((EligibilityResultDto.MatchedUniCodeDto m) -> chanceOrder(m.getChanceCategory()))
                .thenComparing(m -> -m.getCutoffZScore()));

        String summary = String.format(
                "Based on your Z-Score of %.4f in %s District (%s), you have %d High Chance, %d Target, and %d Reach university options across %d Uni-Codes.",
                zScore, district, stream, highChance, targetChance, reachChance, matchedUniCodes.size()
        );

        return EligibilityResultDto.builder()
                .isEligible(true)
                .district(district)
                .stream(stream)
                .studentZScore(zScore)
                .attemptNumber(attempt)
                .isDisadvantagedDistrict(isDisadvantaged)
                .totalEligibleUniCodes(matchedUniCodes.size())
                .highChanceCount(highChance)
                .moderateChanceCount(targetChance)
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

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Set<String> getPrerequisiteEligibleCourses(String stream, List<StudentEligibilityRequestDto.SubjectGradeDto> subjects) {
        List<com.pathwise.course.entity.CoursePrerequisite> allPrereqs = prerequisiteRepository.findByStreamIgnoreCase(stream);
        if (allPrereqs.isEmpty()) {
            return Collections.emptySet(); // No restrictions found, allow stream courses
        }

        if (subjects == null || subjects.isEmpty()) {
            // No specific subject list given, return all courses in this stream
            return allPrereqs.stream().map(com.pathwise.course.entity.CoursePrerequisite::getCourseName).collect(Collectors.toSet());
        }

        Set<String> passedSubjects = subjects.stream()
                .filter(s -> s.getGrade() != null && !s.getGrade().equalsIgnoreCase("F"))
                .map(s -> s.getName().trim().toLowerCase())
                .collect(Collectors.toSet());

        Set<String> eligibleCourses = new HashSet<>();
        for (com.pathwise.course.entity.CoursePrerequisite prereq : allPrereqs) {
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
            if (isCourseNameSimilar(courseName, ec)) return true;
        }
        return false;
    }

    private boolean isCourseNameSimilar(String c1, String c2) {
        if (c1 == null || c2 == null) return false;
        String n1 = c1.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        String n2 = c2.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        return n1.contains(n2) || n2.contains(n1);
    }

    private boolean isUniversityNameSimilar(String u1, String u2) {
        if (u1 == null || u2 == null) return false;
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
        return 1.3000; // default baseline
    }

    private int chanceOrder(String chance) {
        return switch (chance) {
            case "HIGH_CHANCE" -> 1;
            case "TARGET_CHANCE" -> 2;
            case "REACH_CHANCE" -> 3;
            default -> 4;
        };
    }
}
