package com.pathwise.afteral.dto;

import com.pathwise.course.dto.EligibilityResultDto;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UniversityGroupDto {
    private String id;
    private String code;
    private String name;
    private int eligibleCount;
    private int needsReviewCount;
    private int notEligibleCount;
    private int totalMatchedCount;
    private List<CourseViewDto> courses;
}
