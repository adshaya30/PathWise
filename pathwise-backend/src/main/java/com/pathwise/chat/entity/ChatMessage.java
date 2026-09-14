package com.pathwise.chat.entity;

import com.pathwise.authentication.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "session_id", nullable = false, length = 100)
    private String sessionId;

    @Column(name = "user_email", length = 150)
    private String userEmail;

    @Column(name = "anonymous_id", length = 100)
    private String anonymousId;

    @Column(nullable = false, length = 20)
    private String sender; // "USER" or "AI"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "status_badge", length = 50)
    private String statusBadge; // "Eligible", "Needs review", "Not eligible", etc.

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
