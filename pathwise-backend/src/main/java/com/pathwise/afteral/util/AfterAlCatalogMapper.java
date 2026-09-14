package com.pathwise.afteral.util;

import com.pathwise.afteral.dto.CourseViewDto;
import com.pathwise.afteral.dto.UniversityGroupDto;
import com.pathwise.course.dto.EligibilityResultDto;

import java.util.*;
import java.util.stream.Collectors;

public final class AfterAlCatalogMapper {

    private AfterAlCatalogMapper() {
    }

    public static List<EligibilityResultDto.MatchedUniCodeDto> filterCourses(
            List<EligibilityResultDto.MatchedUniCodeDto> courses,
            String filter,
            String search
    ) {
        if (courses == null) {
            return List.of();
        }

        String normalizedFilter = filter == null ? "all" : filter.trim().toLowerCase(Locale.ROOT);
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        return courses.stream()
                .filter(course -> matchesFilter(course, normalizedFilter))
                .filter(course -> matchesSearch(course, normalizedSearch))
                .sorted(Comparator
                        .comparing((EligibilityResultDto.MatchedUniCodeDto c) -> statusOrder(c.getEligibilityStatus()))
                        .thenComparing(c -> chanceOrder(c.getChanceCategory()))
                        .thenComparing(c -> -safeDouble(c.getCutoffZScore())))
                .toList();
    }

    public static List<UniversityGroupDto> groupByUniversity(List<CourseViewDto> courses) {
        if (courses == null || courses.isEmpty()) {
            return List.of();
        }

        Map<String, UniversityGroupDto> grouped = new LinkedHashMap<>();

        for (CourseViewDto course : courses) {
            String universityName = course.getUniversityName() != null ? course.getUniversityName().trim() : "Unknown";
            UniversityGroupDto group = grouped.computeIfAbsent(universityName, name -> {
                String code = deriveUniversityCode(name);
                return UniversityGroupDto.builder()
                        .id(code.toLowerCase(Locale.ROOT))
                        .code(code)
                        .name(name)
                        .eligibleCount(0)
                        .needsReviewCount(0)
                        .notEligibleCount(0)
                        .totalMatchedCount(0)
                        .courses(new ArrayList<>())
                        .build();
            });

            group.getCourses().add(course);
            group.setTotalMatchedCount(group.getTotalMatchedCount() + 1);

            switch (safeStatus(course.getEligibilityStatus())) {
                case "ELIGIBLE" -> group.setEligibleCount(group.getEligibleCount() + 1);
                case "NEEDS_REVIEW" -> group.setNeedsReviewCount(group.getNeedsReviewCount() + 1);
                case "NOT_ELIGIBLE" -> group.setNotEligibleCount(group.getNotEligibleCount() + 1);
                default -> { }
            }
        }

        return grouped.values().stream()
                .peek(group -> group.setCourses(group.getCourses().stream()
                        .sorted(Comparator.comparing(c -> -safeDouble(c.getCutoffZScore())))
                        .collect(Collectors.toList())))
                .sorted(Comparator
                        .comparing(UniversityGroupDto::getEligibleCount).reversed()
                        .thenComparing(UniversityGroupDto::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public static EligibilityResultDto summaryWithoutCourses(EligibilityResultDto source) {
        if (source == null) {
            return null;
        }
        return EligibilityResultDto.builder()
                .isEligible(source.isEligible())
                .ineligibilityReason(source.getIneligibilityReason())
                .district(source.getDistrict())
                .stream(source.getStream())
                .studentZScore(source.getStudentZScore())
                .attemptNumber(source.getAttemptNumber())
                .isDisadvantagedDistrict(source.isDisadvantagedDistrict())
                .totalEligibleUniCodes(source.getTotalEligibleUniCodes())
                .highChanceCount(source.getHighChanceCount())
                .moderateChanceCount(source.getModerateChanceCount())
                .targetChanceCount(source.getTargetChanceCount())
                .reachChanceCount(source.getReachChanceCount())
                .academicYear(source.getAcademicYear())
                .summaryMessage(source.getSummaryMessage())
                .build();
    }

    private static boolean matchesFilter(EligibilityResultDto.MatchedUniCodeDto course, String filter) {
        return switch (filter) {
            case "eligible" -> "ELIGIBLE".equalsIgnoreCase(course.getEligibilityStatus());
            case "needs_review", "needs-review" -> "NEEDS_REVIEW".equalsIgnoreCase(course.getEligibilityStatus());
            case "not_eligible", "not-eligible" -> "NOT_ELIGIBLE".equalsIgnoreCase(course.getEligibilityStatus());
            case "high", "high_chance" -> "HIGH_CHANCE".equalsIgnoreCase(course.getChanceCategory());
            case "target", "target_chance" -> "TARGET_CHANCE".equalsIgnoreCase(course.getChanceCategory());
            case "reach", "reach_chance" -> "REACH_CHANCE".equalsIgnoreCase(course.getChanceCategory());
            default -> true;
        };
    }

    private static boolean matchesSearch(EligibilityResultDto.MatchedUniCodeDto course, String search) {
        if (search.isBlank()) {
            return true;
        }
        return containsIgnoreCase(course.getCourseName(), search)
                || containsIgnoreCase(course.getUniversityName(), search)
                || containsIgnoreCase(course.getUniCode(), search)
                || containsIgnoreCase(course.getPrerequisitesMet(), search)
                || containsIgnoreCase(course.getOlRequirementsSummary(), search);
    }

    private static boolean containsIgnoreCase(String value, String search) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(search);
    }

    private static String safeStatus(String status) {
        return status == null ? "" : status.toUpperCase(Locale.ROOT);
    }

    private static double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private static int statusOrder(String status) {
        return switch (safeStatus(status)) {
            case "ELIGIBLE" -> 1;
            case "NEEDS_REVIEW" -> 2;
            case "NOT_ELIGIBLE" -> 3;
            default -> 4;
        };
    }

    private static int chanceOrder(String chance) {
        if (chance == null) {
            return 4;
        }
        return switch (chance.toUpperCase(Locale.ROOT)) {
            case "HIGH_CHANCE" -> 1;
            case "TARGET_CHANCE" -> 2;
            case "REACH_CHANCE" -> 3;
            default -> 4;
        };
    }

    private static String deriveUniversityCode(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.contains("colombo") && lower.contains("computing")) return "UCSC";
        if (lower.contains("colombo")) return "UOC";
        if (lower.contains("moratuwa")) return "UOM";
        if (lower.contains("peradeniya")) return "UOP";
        if (lower.contains("jayewardenepura") || lower.contains("sjp")) return "USJ";
        if (lower.contains("kelaniya")) return "UOK";
        if (lower.contains("ruhuna")) return "UOR";
        if (lower.contains("jaffna")) return "UOJ";
        if (lower.contains("sabaragamuwa")) return "SUSL";
        if (lower.contains("wayamba")) return "WUSL";
        if (lower.contains("uva") || lower.contains("wellassa")) return "UWU";
        if (lower.contains("south eastern")) return "SEUSL";
        if (lower.contains("eastern")) return "EUSL";
        if (lower.contains("rajarata")) return "RUSL";
        if (lower.contains("visual") || lower.contains("performing")) return "UVPA";
        if (lower.contains("vavuniya")) return "VAV";
        return name.length() >= 4 ? name.substring(0, 4).toUpperCase(Locale.ROOT) : name.toUpperCase(Locale.ROOT);
    }
}
