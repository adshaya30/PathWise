package com.pathwise.course.entity;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "course_cutoff_marks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_cutoff",
                        columnNames = {"district", "course_of_study", "university", "academic_year", "medium_of_instruction"}
                )
        },
        indexes = {
                @Index(name = "idx_cutoff_district", columnList = "district"),
                @Index(name = "idx_cutoff_course", columnList = "course_of_study"),
                @Index(name = "idx_cutoff_university", columnList = "university"),
                @Index(name = "idx_cutoff_zscore", columnList = "minimum_z_score"),
                @Index(name = "idx_cutoff_academic_year", columnList = "academic_year"),
                @Index(name = "idx_cutoff_document", columnList = "document_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class CourseCutoffMark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Foreign Keys
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_page_id")
    private DocumentPage documentPage;

    // Core Data
    @Column(name = "district", nullable = false, length = 50)
    private String district;

    @Column(name = "course_of_study", nullable = false, length = 200)
    private String courseOfStudy;

    @Column(name = "university", nullable = false, length = 200)
    private String university;

    @Column(name = "minimum_z_score", precision = 10, scale = 4)
    private BigDecimal minimumZScore;

    // Metadata
    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "medium_of_instruction", length = 20)
    private String mediumOfInstruction;

    // Audit
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    // ─── Backward Compatibility Aliases & Helpers ───────────────────────────

    public Long getDocumentId() {
        return this.document != null ? this.document.getId() : null;
    }

    public String getCourseName() {
        return this.courseOfStudy;
    }

    public void setCourseName(String courseName) {
        this.courseOfStudy = courseName;
    }

    public String getUniversityName() {
        return this.university;
    }

    public void setUniversityName(String universityName) {
        this.university = universityName;
    }

    public Double getCutoffMark() {
        return this.minimumZScore != null ? this.minimumZScore.doubleValue() : null;
    }

    public void setCutoffMark(Double cutoffMark) {
        this.minimumZScore = cutoffMark != null ? BigDecimal.valueOf(cutoffMark) : null;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public static class CourseCutoffMarkBuilder {
        public CourseCutoffMarkBuilder courseName(String courseName) {
            this.courseOfStudy = courseName;
            return this;
        }

        public CourseCutoffMarkBuilder universityName(String universityName) {
            this.university = universityName;
            return this;
        }

        public CourseCutoffMarkBuilder cutoffMark(Double cutoffMark) {
            this.minimumZScore = cutoffMark != null ? BigDecimal.valueOf(cutoffMark) : null;
            return this;
        }

        public CourseCutoffMarkBuilder documentId(Long docId) {
            if (docId != null) {
                this.document = Document.builder().id(docId).build();
            }
            return this;
        }

        public CourseCutoffMarkBuilder approvedAt(LocalDateTime approvedAt) {
            this.createdAt = approvedAt;
            this.updatedAt = approvedAt;
            return this;
        }
    }
}
