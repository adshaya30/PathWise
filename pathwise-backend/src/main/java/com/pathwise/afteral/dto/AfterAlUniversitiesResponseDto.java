package com.pathwise.afteral.dto;

import com.pathwise.course.dto.EligibilityResultDto;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AfterAlUniversitiesResponseDto {

    private EligibilityResultDto summary;
    private int totalUniversities;
    private List<UniversityGroupDto> universities;
}
