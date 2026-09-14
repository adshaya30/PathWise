package com.pathwise.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponseDTO {

    private String sessionId;

    private String reply;

    private String statusBadge; // "Eligible", "Needs review", "Not eligible", or null

    private List<String> matchedDegrees;

    private List<String> matchedUniversities;

    private List<String> suggestedFollowUps;

    private LocalDateTime timestamp;
}
