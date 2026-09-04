package com.pathwise.course.dto;

import com.pathwise.course.entity.UniCode;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniCodeResponseDto {

    private Long id;
    private String code;
    private String courseName;
    private String universityName;
    private String campus;
    private String stream;
    private String selectionMethod;
    private Boolean hasAptitudeTest;
    private Integer intakeCapacity;
    private String description;

    public static UniCodeResponseDto fromEntity(UniCode entity) {
        if (entity == null) return null;
        return UniCodeResponseDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .courseName(entity.getCourseName())
                .universityName(entity.getUniversityName())
                .campus(entity.getCampus())
                .stream(entity.getStream())
                .selectionMethod(entity.getSelectionMethod())
                .hasAptitudeTest(entity.getHasAptitudeTest())
                .intakeCapacity(entity.getIntakeCapacity())
                .description(entity.getDescription())
                .build();
    }
}
