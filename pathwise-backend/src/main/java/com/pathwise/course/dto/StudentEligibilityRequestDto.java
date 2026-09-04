package com.pathwise.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEligibilityRequestDto {

    @NotBlank(message = "District is required (e.g. COLOMBO, JAFFNA, KANDY)")
    private String district;

    @NotBlank(message = "A/L Stream is required (e.g. Biological Science, Physical Science, Commerce, Arts, Technology)")
    private String stream;

    @NotNull(message = "Z-Score is required")
    private Double zScore;

    /** G.C.E. (A/L) Attempt number: 1, 2, 3 (UGC maximum is 3 attempts) */
    @Builder.Default
    private Integer attemptNumber = 1;

    /**
     * List of subjects sat in the A/L exam with their grades.
     * E.g. [{"name": "Combined Mathematics", "grade": "A"}, {"name": "Physics", "grade": "B"}, {"name": "Chemistry", "grade": "C"}]
     */
    private List<SubjectGradeDto> subjects;

    /** Optional target academic year, e.g. "2025/26" */
    private String academicYear;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectGradeDto {
        private String name;
        private String grade; // "A", "B", "C", "S", "F"
    }
}
