package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents the official UGC A/L subject pre-requisites for university courses.
 * (e.g., Medicine requires Chemistry, Biology, Physics with at least 'S' or 'C' grades).
 */
@Entity
@Table(
    name = "course_prerequisites",
    indexes = {
        @Index(name = "idx_prereq_course", columnList = "course_name"),
        @Index(name = "idx_prereq_stream", columnList = "stream")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoursePrerequisite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_name", nullable = false)
    private String courseName; // e.g. "MEDICINE", "ENGINEERING", "COMPUTER_SCIENCE"

    @Column(nullable = false, length = 100)
    private String stream; // Biological Science, Physical Science, Commerce, Arts, Technology

    /**
     * Comma-separated or JSON list of required subjects.
     * E.g. "Biology, Chemistry, Physics" or "Combined Mathematics, Physics, Chemistry"
     */
    @Column(name = "required_subjects", nullable = false, columnDefinition = "TEXT")
    private String requiredSubjects;

    /** Minimum required grade for individual subjects, e.g. "S" (Simple Pass) or "C" (Credit) */
    @Column(name = "minimum_grade", length = 10)
    @Builder.Default
    private String minimumGrade = "S";

    /** Alternative subjects allowed (e.g. "Information & Communication Technology (ICT) in place of Chemistry") */
    @Column(name = "alternative_subjects", columnDefinition = "TEXT")
    private String alternativeSubjects;

    /** Special admission criteria (e.g. "Practical test", "English requirement") */
    @Column(name = "special_requirements", columnDefinition = "TEXT")
    private String specialRequirements;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
