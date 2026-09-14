package com.pathwise.afteral.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompareCoursesRequestDto {

    @NotEmpty(message = "At least one course code is required")
    @Size(max = 4, message = "You can compare up to 4 courses at a time")
    private List<String> uniCodes;
}
