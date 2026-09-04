package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_aptitude_test_requirements", indexes = {
        @Index(name = "idx_aptitude_course_year", columnList = "course_name, academic_year"),
        @Index(name = "idx_aptitude_unicode", columnList = "uni_code")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseAptitudeTestRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "course_name", nullable = false)
    private String courseName; // e.g. "ARCHITECTURE", "DESIGN", "MUSIC"

    @Column(name = "university_name", nullable = false)
    private String universityName; // e.g. "UNIVERSITY OF MORATUWA", "UNIVERSITY OF JAFFNA"

    @Column(name = "uni_code", length = 50)
    private String uniCode; // e.g. "023G", "068C"

    @Column(name = "test_type", length = 50)
    @Builder.Default
    private String testType = "APTITUDE_TEST"; // "APTITUDE_TEST" or "PRACTICAL_TEST"

    @Column(length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
