package com.pathwise.afteral.dto;

import com.pathwise.course.dto.EligibilityResultDto;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseViewDto {

    private String uniCode;
    private String courseName;
    private String universityName;
    private String stream;
    private Double cutoffZScore;
    private Double zScoreDifference;
    private String chanceCategory;
    private String eligibilityStatus;
    private String selectionMethod;
    private boolean hasAptitudeTest;
    private String prerequisitesMet;
    private boolean olRequirementsMet;
    private String olRequirementsSummary;
    private Integer proposedIntake;
    private String mediumOfInstruction;
    private boolean usesEstimatedCutoff;
    private boolean disadvantagedQuotaApplied;

    /** Enriched handbook metadata */
    private Double durationYears;
    private String durationLabel;
    private String campus;
    private String facultyOrSelection;
    private String alPrerequisitesSummary;
    private String alMinimumGrade;
    private String aptitudeTestNotes;
    private String courseDescription;

    public static CourseViewDto fromMatched(EligibilityResultDto.MatchedUniCodeDto matched) {
        if (matched == null) {
            return null;
        }
        return CourseViewDto.builder()
                .uniCode(matched.getUniCode())
                .courseName(matched.getCourseName())
                .universityName(matched.getUniversityName())
                .stream(matched.getStream())
                .cutoffZScore(matched.getCutoffZScore())
                .zScoreDifference(matched.getZScoreDifference())
                .chanceCategory(matched.getChanceCategory())
                .eligibilityStatus(matched.getEligibilityStatus())
                .selectionMethod(matched.getSelectionMethod())
                .hasAptitudeTest(matched.isHasAptitudeTest())
                .prerequisitesMet(matched.getPrerequisitesMet())
                .olRequirementsMet(matched.isOlRequirementsMet())
                .olRequirementsSummary(matched.getOlRequirementsSummary())
                .proposedIntake(matched.getProposedIntake())
                .mediumOfInstruction(matched.getMediumOfInstruction())
                .usesEstimatedCutoff(matched.isUsesEstimatedCutoff())
                .disadvantagedQuotaApplied(matched.isDisadvantagedQuotaApplied())
                .facultyOrSelection(formatSelectionMethod(matched.getSelectionMethod()))
                .durationLabel("3 / 4 years")
                .build();
    }

    private static String formatSelectionMethod(String selectionMethod) {
        if (selectionMethod == null || selectionMethod.isBlank()) {
            return "Merit & District Quota";
        }
        return switch (selectionMethod.trim().toUpperCase()) {
            case "ALL_ISLAND_MERIT_ONLY" -> "All-Island Merit";
            case "APTITUDE_TEST" -> "Aptitude Test Selection";
            case "MERIT_AND_DISTRICT" -> "Merit & District Quota";
            default -> selectionMethod.replace('_', ' ');
        };
    }
}
