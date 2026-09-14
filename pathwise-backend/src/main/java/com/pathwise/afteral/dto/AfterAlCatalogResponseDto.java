package com.pathwise.afteral.dto;

import com.pathwise.course.dto.EligibilityResultDto;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AfterAlCatalogResponseDto {

    private EligibilityResultDto summary;
    private String filter;
    private String search;
    private int totalReturned;
    private List<CourseViewDto> courses;
}
