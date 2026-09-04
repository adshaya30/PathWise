package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "university_mediums", indexes = {
        @Index(name = "idx_medium_uni_year", columnList = "university_name, academic_year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UniversityMediumOfInstruction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "academic_year", nullable = false, length = 50)
    private String academicYear;

    @Column(name = "university_number", length = 20)
    private String universityNumber; // e.g. "01", "05"

    @Column(name = "university_name", nullable = false)
    private String universityName; // e.g. "University of Colombo"

    @Column(name = "medium_of_instruction", nullable = false)
    private String mediumOfInstruction; // e.g. "Sinhala/ Tamil/ English"

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
