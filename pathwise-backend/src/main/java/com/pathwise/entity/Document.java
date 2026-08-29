package com.pathwise.entity;

import com.pathwise.entity.enums.DocumentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 100)
    private String source; // e.g. "UGC", "NIE", "MoHE", "DoE"

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear; // e.g. "2026/27", "2026"

    @Column(name = "document_type", length = 100)
    private String documentType; // e.g. "Admissions", "Curriculum"

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size", length = 50)
    private String fileSize;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath; // Path in Supabase Storage

    @Column(name = "storage_bucket", length = 100)
    @Builder.Default
    private String storageBucket = "PathWise";

    @Column(name = "total_pages")
    @Builder.Default
    private Integer totalPages = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.PENDING_REVIEW;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DocumentPage> pages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.uploadedAt == null) {
            this.uploadedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = DocumentStatus.PENDING_REVIEW;
        }
    }

    public void addPage(DocumentPage page) {
        pages.add(page);
        page.setDocument(this);
    }

    public void removePage(DocumentPage page) {
        pages.remove(page);
        page.setDocument(null);
    }
}
