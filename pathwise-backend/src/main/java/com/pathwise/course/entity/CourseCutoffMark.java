package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_cutoff_marks", indexes = {
        @Index(name = "idx_cutoff_district_year", columnList = "district, academic_year"),
        @Index(name = "idx_cutoff_course", columnList = "course_name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseCutoffMark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "university_name", nullable = false)
    private String universityName;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "course_code", length = 50)
    private String courseCode;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(name = "cutoff_mark", nullable = false)
    private Double cutoffMark;

    @Column(length = 255)
    private String notes;

    @Column(name = "approved_at", nullable = false)
    private LocalDateTime approvedAt;

    @PrePersist
    protected void onCreate() {
        if (approvedAt == null) {
            approvedAt = LocalDateTime.now();
        }
    }
}
