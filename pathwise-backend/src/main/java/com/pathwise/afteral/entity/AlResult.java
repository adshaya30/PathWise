package com.pathwise.afteral.entity;

import com.pathwise.authentication.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "al_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "user_email", length = 150)
    private String userEmail;

    @Column(name = "anonymous_id", length = 100)
    private String anonymousId;

    @Column(nullable = false, length = 100)
    private String stream;

    @Column(name = "exam_year", nullable = false, length = 20)
    private String examYear;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(name = "attempt_number")
    @Builder.Default
    private Integer attemptNumber = 1;

    // A/L Subjects
    @Column(name = "subject1", nullable = false, length = 150)
    private String subject1;

    @Column(name = "subject1_grade", nullable = false, length = 5)
    private String subject1Grade;

    @Column(name = "subject2", nullable = false, length = 150)
    private String subject2;

    @Column(name = "subject2_grade", nullable = false, length = 5)
    private String subject2Grade;

    @Column(name = "subject3", nullable = false, length = 150)
    private String subject3;

    @Column(name = "subject3_grade", nullable = false, length = 5)
    private String subject3Grade;

    @Column(name = "english_grade", length = 20)
    private String englishGrade;

    @Column(name = "cgt_marks")
    private Integer cgtMarks;

    @Column(name = "z_score", nullable = false)
    private Double zScore;

    // G.C.E (O/L) Requirements
    @Column(name = "ol_english", length = 5)
    private String olEnglish;

    @Column(name = "ol_mathematics", length = 5)
    private String olMathematics;

    @Column(name = "ol_science", length = 5)
    private String olScience;

    @Column(name = "ol_language", length = 5)
    private String olLanguage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
