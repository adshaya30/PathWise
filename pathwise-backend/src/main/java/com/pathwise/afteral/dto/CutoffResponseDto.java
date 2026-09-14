package com.pathwise.afteral.dto;

import com.pathwise.course.entity.CourseCutoffMark;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CutoffResponseDto {
    private Long id;
    private String academicYear;
    private String degree;
    private String university;
    private String district;
    private BigDecimal zScore;
    private String mediumOfInstruction;

    public static CutoffResponseDto fromEntity(CourseCutoffMark entity) {
        if (entity == null) return null;
        return CutoffResponseDto.builder()
                .id(entity.getId())
                .academicYear(entity.getAcademicYear())
                .degree(entity.getCourseOfStudy())
                .university(entity.getUniversity())
                .district(entity.getDistrict())
                .zScore(entity.getMinimumZScore())
                .mediumOfInstruction(entity.getMediumOfInstruction())
                .build();
    }
}
