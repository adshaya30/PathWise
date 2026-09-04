package com.pathwise.course.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityResultDto {

    /** Overall eligibility status (false if > 3 attempts or invalid inputs) */
    private boolean isEligible;

    /** Explanation if the student is not eligible */
    private String ineligibilityReason;

    private String district;
    private String stream;
    private Double studentZScore;
    private Integer attemptNumber;
    private boolean isDisadvantagedDistrict;

    private int totalEligibleUniCodes;
    private int highChanceCount;
    private int moderateChanceCount;
    private int reachChanceCount;

    private List<MatchedUniCodeDto> eligibleUniCodes;
    private String summaryMessage;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchedUniCodeDto {
        private String uniCode;          // e.g. "001A"
        private String courseName;       // e.g. "MEDICINE"
        private String universityName;   // e.g. "University of Colombo"
        private String stream;
        private Double cutoffZScore;     // e.g. 2.3517
        private Double zScoreDifference; // studentZScore - cutoffZScore
        private String chanceCategory;   // "HIGH_CHANCE", "TARGET_CHANCE", "REACH_CHANCE"
        private String selectionMethod;  // "MERIT_AND_DISTRICT", "ALL_ISLAND_MERIT_ONLY"
        private boolean hasAptitudeTest;
        private String prerequisitesMet;
    }
}
