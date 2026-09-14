package com.pathwise.savedcourse.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.pathwise.savedcourse.entity.SavedCourse;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SavedCourseDto {

    private String uniCode;
    private LocalDateTime savedAt;

    public static SavedCourseDto fromEntity(SavedCourse entity) {
        if (entity == null) {
            return null;
        }
        return SavedCourseDto.builder()
                .uniCode(entity.getUniCode())
                .savedAt(entity.getSavedAt())
                .build();
    }
}