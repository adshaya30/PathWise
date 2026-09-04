package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_intakes", indexes = {
        @Index(name = "idx_intake_course_year", columnList = "course_name, academic_year"),
        @Index(name = "idx_intake_uni_year", columnList = "university_name, academic_year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseIntake {

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

    @Column(name = "proposed_intake", nullable = false)
    private Integer proposedIntake;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
