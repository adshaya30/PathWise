package com.pathwise.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentUploadRequestDto {

    @NotBlank(message = "Document title is required")
    private String title;

    @NotBlank(message = "Source is required (e.g. UGC, NIE)")
    private String source;

    @NotBlank(message = "Academic year is required (e.g. 2026/27)")
    private String academicYear;

    private String documentType;

    private String description;
}
