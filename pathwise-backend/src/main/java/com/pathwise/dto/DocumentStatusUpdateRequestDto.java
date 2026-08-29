package com.pathwise.dto;

import com.pathwise.entity.enums.DocumentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentStatusUpdateRequestDto {

    @NotNull(message = "Status is required")
    private DocumentStatus status;

    private String notes;

    private String reviewedBy;
}
