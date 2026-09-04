package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Represents the official UGC 255 Uni-Codes.
 * Each unique Course + University combination is assigned a distinct Uni-Code (e.g., 001A for Medicine at Colombo).
 */
@Entity
@Table(
    name = "uni_codes",
    indexes = {
        @Index(name = "idx_unicode_code", columnList = "code", unique = true),
        @Index(name = "idx_unicode_stream", columnList = "stream"),
        @Index(name = "idx_unicode_course", columnList = "course_name"),
        @Index(name = "idx_unicode_uni", columnList = "university_name")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UniCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Official UGC Uni-Code (e.g., "001A", "001B", "008A") */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "university_name", nullable = false)
    private String universityName;

    @Column(length = 100)
    private String campus; // e.g. "Main Campus", "Trincomalee Campus", "Vavuniya Campus"

    @Column(nullable = false, length = 100)
    private String stream; // Biological Science, Physical Science, Commerce, Arts, Technology, Indigenous Medicine

    /** Selection methodology: "MERIT_AND_DISTRICT", "ALL_ISLAND_MERIT_ONLY", "APTITUDE_TEST" */
    @Column(name = "selection_method", length = 50)
    @Builder.Default
    private String selectionMethod = "MERIT_AND_DISTRICT";

    @Column(name = "has_aptitude_test")
    @Builder.Default
    private Boolean hasAptitudeTest = false;

    @Column(name = "intake_capacity")
    private Integer intakeCapacity;

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
