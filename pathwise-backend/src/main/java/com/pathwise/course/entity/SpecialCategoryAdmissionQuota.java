package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "special_admission_quotas", indexes = {
        @Index(name = "idx_special_uni_year", columnList = "university_name, academic_year"),
        @Index(name = "idx_special_course", columnList = "course_name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecialCategoryAdmissionQuota {

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

    @Column(name = "uni_codes", length = 100)
    private String uniCodes;

    @Column(name = "differently_abled_seats")
    private Integer differentlyAbledSeats;

    @Column(name = "blind_braille_seats")
    private Integer blindBrailleSeats;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
