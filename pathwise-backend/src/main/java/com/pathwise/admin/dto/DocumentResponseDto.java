package com.pathwise.admin.dto;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.enums.DocumentStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentResponseDto {

    private Long id;
    private String title;
    private String source;
    private String academicYear;
    private String documentType;
    private String fileName;
    private String fileSize;
    private String storagePath;
    private String storageBucket;
    private Integer totalPages;
    private DocumentStatus status;
    private String description;
    private LocalDateTime uploadedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;

    public static DocumentResponseDto fromEntity(Document doc) {
        if (doc == null) return null;
        return DocumentResponseDto.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .source(doc.getSource())
                .academicYear(doc.getAcademicYear())
                .documentType(doc.getDocumentType())
                .fileName(doc.getFileName())
                .fileSize(doc.getFileSize())
                .storagePath(doc.getStoragePath())
                .storageBucket(doc.getStorageBucket())
                .totalPages(doc.getTotalPages())
                .status(doc.getStatus())
                .description(doc.getDescription())
                .uploadedAt(doc.getUploadedAt())
                .reviewedAt(doc.getReviewedAt())
                .reviewedBy(doc.getReviewedBy())
                .build();
    }
}
