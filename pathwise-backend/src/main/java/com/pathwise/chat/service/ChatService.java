package com.pathwise.chat.service;

import com.pathwise.chat.dto.ChatRequestDTO;
import com.pathwise.chat.dto.ChatResponseDTO;
import com.pathwise.chat.entity.ChatMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface ChatService {

    ChatResponseDTO sendMessage(ChatRequestDTO request, String userEmail);

    SseEmitter streamMessage(ChatRequestDTO request, String userEmail);

    List<ChatMessage> getSessionHistory(String sessionId);

    void clearSession(String sessionId);
}

