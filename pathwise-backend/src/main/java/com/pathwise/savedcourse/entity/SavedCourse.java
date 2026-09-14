package com.pathwise.savedcourse.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "saved_courses",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_saved_course_user", columnNames = {"user_email", "uni_code"}),
                @UniqueConstraint(name = "uk_saved_course_anon", columnNames = {"anonymous_id", "uni_code"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_email", length = 150)
    private String userEmail;

    @Column(name = "anonymous_id", length = 100)
    private String anonymousId;

    @Column(name = "uni_code", nullable = false, length = 50)
    private String uniCode;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private LocalDateTime savedAt;

    @PrePersist
    protected void onCreate() {
        if (this.savedAt == null) {
            this.savedAt = LocalDateTime.now();
        }
    }
}