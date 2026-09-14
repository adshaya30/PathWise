package com.pathwise.afteral.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlResultRequestDto {

    @NotBlank(message = "A/L Stream is required")
    private String stream;

    @NotBlank(message = "Examination year is required")
    private String examYear;

    @NotBlank(message = "District is required")
    private String district;

    @Builder.Default
    private Integer attemptNumber = 1;

    // 3 A/L Subjects & Grades
    @NotBlank(message = "Subject 1 is required")
    private String subject1;

    @NotBlank(message = "Subject 1 grade is required")
    private String subject1Grade;

    @NotBlank(message = "Subject 2 is required")
    private String subject2;

    @NotBlank(message = "Subject 2 grade is required")
    private String subject2Grade;

    @NotBlank(message = "Subject 3 is required")
    private String subject3;

    @NotBlank(message = "Subject 3 grade is required")
    private String subject3Grade;

    private String englishGrade;
    private Integer cgtMarks;

    @NotNull(message = "Z-Score is required")
    private Double zScore;

    // G.C.E (O/L) Requirements
    private String olEnglish;
    private String olMathematics;
    private String olScience;
    private String olLanguage;

    /** Client session/anonymous ID if not logged in */
    private String anonymousId;
}
