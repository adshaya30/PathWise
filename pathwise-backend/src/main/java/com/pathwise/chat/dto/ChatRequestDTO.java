package com.pathwise.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDTO {

    @NotBlank(message = "Message content is required")
    private String message;

    private String sessionId;

    private String anonymousId;

    // Optional override parameters if sent by frontend
    private String district;
    private String stream;
    private Double zScore;
}
