package com.pathwise.afteral.dto;

import com.pathwise.afteral.entity.AlResult;
import com.pathwise.course.dto.EligibilityResultDto;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlResultResponseDto {

    private UUID id;
    private String userEmail;
    private String anonymousId;
    private String stream;
    private String examYear;
    private String district;
    private Integer attemptNumber;

    private String subject1;
    private String subject1Grade;

    private String subject2;
    private String subject2Grade;

    private String subject3;
    private String subject3Grade;

    private String englishGrade;
    private Integer cgtMarks;
    private Double zScore;

    private String olEnglish;
    private String olMathematics;
    private String olScience;
    private String olLanguage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Automatically evaluated eligibility summary if requested */
    private EligibilityResultDto eligibilitySummary;

    public static AlResultResponseDto fromEntity(AlResult entity) {
        if (entity == null) return null;
        return AlResultResponseDto.builder()
                .id(entity.getId())
                .userEmail(entity.getUserEmail())
                .anonymousId(entity.getAnonymousId())
                .stream(entity.getStream())
                .examYear(entity.getExamYear())
                .district(entity.getDistrict())
                .attemptNumber(entity.getAttemptNumber())
                .subject1(entity.getSubject1())
                .subject1Grade(entity.getSubject1Grade())
                .subject2(entity.getSubject2())
                .subject2Grade(entity.getSubject2Grade())
                .subject3(entity.getSubject3())
                .subject3Grade(entity.getSubject3Grade())
                .englishGrade(entity.getEnglishGrade())
                .cgtMarks(entity.getCgtMarks())
                .zScore(entity.getZScore())
                .olEnglish(entity.getOlEnglish())
                .olMathematics(entity.getOlMathematics())
                .olScience(entity.getOlScience())
                .olLanguage(entity.getOlLanguage())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
