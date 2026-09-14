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
     * Comma-separated list of required subjects with each subject's own minimum grade
     * inline, e.g. "Chemistry (C), Physics (B), Biology".
     * A subject without an explicit grade is written plain (e.g. "Biology") when the
     * handbook states no specific grade for it.
     */
    @Column(name = "required_subjects", nullable = false, columnDefinition = "TEXT")
    private String requiredSubjects;

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
