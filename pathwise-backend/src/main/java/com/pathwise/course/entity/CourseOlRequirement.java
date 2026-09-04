package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_ol_requirements", indexes = {
        @Index(name = "idx_ol_course_year", columnList = "course_name, academic_year"),
        @Index(name = "idx_ol_unicodes", columnList = "uni_codes")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseOlRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "uni_codes", length = 100)
    private String uniCodes;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "sinhala_lang_grade", length = 10)
    private String sinhalaLangGrade;

    @Column(name = "english_grade", length = 10)
    private String englishGrade;

    @Column(name = "mathematics_grade", length = 10)
    private String mathematicsGrade;

    @Column(name = "science_grade", length = 10)
    private String scienceGrade;

    @Column(name = "tamil_lang_grade", length = 10)
    private String tamilLangGrade;

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
