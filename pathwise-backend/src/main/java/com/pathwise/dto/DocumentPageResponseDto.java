package com.pathwise.dto;

import com.pathwise.entity.DocumentPage;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentPageResponseDto {

    private Long id;
    private Long documentId;
    private Integer pageNumber;
    private String extractedText;
    private Boolean hasTables;
    private LocalDateTime createdAt;

    public static DocumentPageResponseDto fromEntity(DocumentPage page) {
        if (page == null) return null;
        return DocumentPageResponseDto.builder()
                .id(page.getId())
                .documentId(page.getDocument() != null ? page.getDocument().getId() : null)
                .pageNumber(page.getPageNumber())
                .extractedText(page.getExtractedText())
                .hasTables(page.getHasTables())
                .createdAt(page.getCreatedAt())
                .build();
    }
}
