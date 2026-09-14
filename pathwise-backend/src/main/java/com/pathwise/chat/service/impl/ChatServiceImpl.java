package com.pathwise.chat.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pathwise.afteral.entity.AlResult;
import com.pathwise.afteral.repository.AlResultRepository;
import com.pathwise.authentication.entity.User;
import com.pathwise.authentication.repository.UserRepository;
import com.pathwise.chat.dto.ChatRequestDTO;
import com.pathwise.chat.dto.ChatResponseDTO;
import com.pathwise.chat.entity.ChatMessage;
import com.pathwise.chat.repository.ChatMessageRepository;
import com.pathwise.chat.service.ChatService;
import com.pathwise.course.entity.CourseCutoffMark;
import com.pathwise.course.repository.CourseCutoffMarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final AlResultRepository alResultRepository;
    private final CourseCutoffMarkRepository cutoffMarkRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    private static final List<String> GEMINI_MODELS = List.of(
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-flash-latest"
    );

    @Override
    @Transactional
    public ChatResponseDTO sendMessage(ChatRequestDTO request, String userEmail) {
        String sessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : UUID.randomUUID().toString();

        User user = null;
        if (userEmail != null && !userEmail.isBlank()) {
            user = userRepository.findByEmail(userEmail).orElse(null);
        }

        // 1. Fetch Student Profile Context
        AlResult profile = null;
        if (user != null) {
            profile = alResultRepository.findTopByUserEmailOrderByUpdatedAtDesc(user.getEmail()).orElse(null);
        } else if (request.getAnonymousId() != null && !request.getAnonymousId().isBlank()) {
            profile = alResultRepository.findTopByAnonymousIdOrderByUpdatedAtDesc(request.getAnonymousId()).orElse(null);
        }

        String district = request.getDistrict();
        String stream = request.getStream();
        Double zScore = request.getZScore();

        if (profile != null) {
            if (district == null || district.isBlank()) district = profile.getDistrict();
            if (stream == null || stream.isBlank()) stream = profile.getStream();
            if (zScore == null && profile.getZScore() != null) zScore = profile.getZScore();
        }

        if (district == null || district.isBlank()) district = "Colombo";
        if (stream == null || stream.isBlank()) stream = "Physical Science";
        if (zScore == null) zScore = 1.7842;

        // 2. Perform SQL Queries to retrieve Grounded Cutoff & Course Information
        List<CourseCutoffMark> relevantCutoffs = retrieveCutoffData(request.getMessage(), district, stream);

        // 3. Save User Message
        ChatMessage userMsg = ChatMessage.builder()
                .user(user)
                .sessionId(sessionId)
                .userEmail(userEmail)
                .anonymousId(request.getAnonymousId())
                .sender("USER")
                .content(request.getMessage())
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(userMsg);

        // 4. Build Grounded Direct RAG Prompt
        String prompt = buildGroundedPrompt(request.getMessage(), district, stream, zScore, profile, relevantCutoffs, sessionId);

        // 5. Call Gemini AI API
        String aiReply = callGeminiAI(prompt);

        // 6. Determine status badge if mentioned in AI response or calculation
        String statusBadge = determineStatusBadge(aiReply, zScore, relevantCutoffs);

        // 7. Save AI Reply
        ChatMessage aiMsg = ChatMessage.builder()
                .user(user)
                .sessionId(sessionId)
                .userEmail(userEmail)
                .anonymousId(request.getAnonymousId())
                .sender("AI")
                .content(aiReply)
                .statusBadge(statusBadge)
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(aiMsg);

        List<String> matchedDegrees = relevantCutoffs.stream()
                .map(CourseCutoffMark::getCourseOfStudy)
                .filter(Objects::nonNull)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());

        List<String> matchedUnis = relevantCutoffs.stream()
                .map(CourseCutoffMark::getUniversity)
                .filter(Objects::nonNull)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());

        List<String> followUps = generateFollowUps(stream, matchedDegrees);

        return ChatResponseDTO.builder()
                .sessionId(sessionId)
                .reply(aiReply)
                .statusBadge(statusBadge)
                .matchedDegrees(matchedDegrees)
                .matchedUniversities(matchedUnis)
                .suggestedFollowUps(followUps)
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Override
    public SseEmitter streamMessage(ChatRequestDTO request, String userEmail) {
        SseEmitter emitter = new SseEmitter(120000L); // 2 mins timeout

        String sessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : UUID.randomUUID().toString();

        User user = null;
        if (userEmail != null && !userEmail.isBlank()) {
            user = userRepository.findByEmail(userEmail).orElse(null);
        }

        // 1. Fetch Student Profile Context
        AlResult profile = null;
        if (user != null) {
            profile = alResultRepository.findTopByUserEmailOrderByUpdatedAtDesc(user.getEmail()).orElse(null);
        } else if (request.getAnonymousId() != null && !request.getAnonymousId().isBlank()) {
            profile = alResultRepository.findTopByAnonymousIdOrderByUpdatedAtDesc(request.getAnonymousId()).orElse(null);
        }

        String district = request.getDistrict();
        String stream = request.getStream();
        Double zScore = request.getZScore();

        if (profile != null) {
            if (district == null || district.isBlank()) district = profile.getDistrict();
            if (stream == null || stream.isBlank()) stream = profile.getStream();
            if (zScore == null && profile.getZScore() != null) zScore = profile.getZScore();
        }

        if (district == null || district.isBlank()) district = "Colombo";
        if (stream == null || stream.isBlank()) stream = "Physical Science";
        if (zScore == null) zScore = 1.7842;

        List<CourseCutoffMark> relevantCutoffs = retrieveCutoffData(request.getMessage(), district, stream);

        // 2. Save User Message
        ChatMessage userMsg = ChatMessage.builder()
                .user(user)
                .sessionId(sessionId)
                .userEmail(userEmail)
                .anonymousId(request.getAnonymousId())
                .sender("USER")
                .content(request.getMessage())
                .createdAt(LocalDateTime.now())
                .build();
        chatMessageRepository.save(userMsg);

        String prompt = buildGroundedPrompt(request.getMessage(), district, stream, zScore, profile, relevantCutoffs, sessionId);

        final User finalUser = user;
        final Double finalZScore = zScore;
        final String finalSessionId = sessionId;
        final String finalStream = stream;

        // Run streaming in background thread
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                StringBuilder fullResponse = new StringBuilder();
                boolean streamedSuccessfully = streamGeminiAI(prompt, (token) -> {
                    fullResponse.append(token);
                    try {
                        emitter.send(SseEmitter.event().data(Map.of("delta", token, "sessionId", finalSessionId)));
                    } catch (Exception e) {
                        log.debug("Error sending SSE token: {}", e.getMessage());
                    }
                });

                if (!streamedSuccessfully) {
                    String fallbackReply = callGeminiAI(prompt);
                    fullResponse.append(fallbackReply);
                    emitter.send(SseEmitter.event().data(Map.of("delta", fallbackReply, "sessionId", finalSessionId)));
                }

                String completeReply = fullResponse.toString();
                String statusBadge = determineStatusBadge(completeReply, finalZScore, relevantCutoffs);

                List<String> matchedDegrees = relevantCutoffs.stream()
                        .map(CourseCutoffMark::getCourseOfStudy)
                        .filter(Objects::nonNull)
                        .distinct()
                        .limit(5)
                        .collect(Collectors.toList());

                List<String> matchedUnis = relevantCutoffs.stream()
                        .map(CourseCutoffMark::getUniversity)
                        .filter(Objects::nonNull)
                        .distinct()
                        .limit(5)
                        .collect(Collectors.toList());

                List<String> followUps = generateFollowUps(finalStream, matchedDegrees);

                // Save AI Message
                ChatMessage aiMsg = ChatMessage.builder()
                        .user(finalUser)
                        .sessionId(finalSessionId)
                        .userEmail(userEmail)
                        .anonymousId(request.getAnonymousId())
                        .sender("AI")
                        .content(completeReply)
                        .statusBadge(statusBadge)
                        .createdAt(LocalDateTime.now())
                        .build();
                chatMessageRepository.save(aiMsg);

                // Send complete event with metadata
                emitter.send(SseEmitter.event()
                        .name("complete")
                        .data(Map.of(
                                "sessionId", finalSessionId,
                                "reply", completeReply,
                                "statusBadge", statusBadge != null ? statusBadge : "",
                                "matchedDegrees", matchedDegrees,
                                "matchedUniversities", matchedUnis,
                                "suggestedFollowUps", followUps
                        )));

                emitter.complete();
            } catch (Exception ex) {
                log.error("Streaming error: {}", ex.getMessage());
                try {
                    emitter.completeWithError(ex);
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    @Override
    public List<ChatMessage> getSessionHistory(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Override
    @Transactional
    public void clearSession(String sessionId) {
        chatMessageRepository.deleteBySessionId(sessionId);
    }

    private List<CourseCutoffMark> retrieveCutoffData(String query, String district, String stream) {
        String lowerQuery = query.toLowerCase();
        List<CourseCutoffMark> results = new ArrayList<>();

        // 1. Search for matching course/degree keywords
        String[] keywords = lowerQuery.split("\\s+");
        for (String kw : keywords) {
            if (kw.length() >= 4 && !List.of("what", "which", "where", "about", "degree", "course", "from", "with", "have", "offer", "university").contains(kw)) {
                List<CourseCutoffMark> matches = cutoffMarkRepository.searchCutoffs(null, district, kw);
                if (matches != null && !matches.isEmpty()) {
                    results.addAll(matches);
                }
            }
        }

        // 2. If no specific course match found, fetch top district cutoffs
        if (results.isEmpty()) {
            results = cutoffMarkRepository.findByDistrictAndAcademicYearOrderByMinimumZScoreDesc(district, "2025/26");
            if (results.isEmpty()) {
                results = cutoffMarkRepository.findByDistrictIgnoreCaseAndAcademicYear(district, "2025/26");
            }
        }

        // Limit results to top 15 most relevant
        return results.stream()
                .filter(c -> c.getMinimumZScore() != null && c.getMinimumZScore().doubleValue() <= 3.0 && c.getMinimumZScore().doubleValue() >= -1.0)
                .distinct()
                .limit(15)
                .collect(Collectors.toList());
    }

    private String buildGroundedPrompt(
            String userMessage,
            String district,
            String stream,
            Double zScore,
            AlResult profile,
            List<CourseCutoffMark> cutoffs,
            String sessionId
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are PathWise AI, an expert Sri Lankan University Admissions Assistant for state universities under the UGC (University Grants Commission).\n\n");
        sb.append("### OFFICIAL GROUNDED CONTEXT (FROM DATABASE):\n");
        sb.append("- Student District: ").append(district).append("\n");
        sb.append("- Student A/L Stream: ").append(stream).append("\n");
        sb.append("- Student Z-Score: ").append(String.format("%.4f", zScore)).append("\n");

        if (profile != null) {
            sb.append("- Subject 1: ").append(profile.getSubject1()).append(" (").append(profile.getSubject1Grade()).append(")\n");
            sb.append("- Subject 2: ").append(profile.getSubject2()).append(" (").append(profile.getSubject2Grade()).append(")\n");
            sb.append("- Subject 3: ").append(profile.getSubject3()).append(" (").append(profile.getSubject3Grade()).append(")\n");
            if (profile.getOlEnglish() != null) {
                sb.append("- O/L English: ").append(profile.getOlEnglish()).append("\n");
            }
        }

        sb.append("\n### PUBLISHED UGC CUTOFF MARKS & UNIVERSITY DATA:\n");
        if (cutoffs.isEmpty()) {
            sb.append("No specific cutoffs found in database for query.\n");
        } else {
            for (CourseCutoffMark c : cutoffs) {
                sb.append(String.format("- University: %s | Degree: %s | District: %s | Min Z-Score Cutoff: %.4f | Academic Year: %s\n",
                        c.getUniversity(), c.getCourseOfStudy(), c.getDistrict(),
                        c.getMinimumZScore().doubleValue(),
                        c.getAcademicYear() != null ? c.getAcademicYear() : "2025/26"));
            }
        }

        sb.append("\n### INSTRUCTIONS & RULES:\n");
        sb.append("1. Answer the student's question accurately, politely, and concisely using the grounded data above.\n");
        sb.append("2. NEVER invent, guess, or hallucinate cutoff Z-scores or university quotas.\n");
        sb.append("3. If comparing Z-scores, state whether the student is Eligible (Z-score >= Cutoff), Needs Review (e.g. requires Aptitude Test, Practical test, or O/L English 'C'), or Not Eligible (Z-score < Cutoff).\n");
        sb.append("4. For Aptitude Test courses (e.g. Architecture, Design, Information Technology / Data Science at Moratuwa, Sports Science), always remind the student they must sit for the university aptitude test.\n");
        sb.append("5. Use clean markdown with bullet points and bold highlights.\n\n");
        sb.append("### STUDENT QUESTION:\n");
        sb.append(userMessage);

        return sb.toString();
    }

    private String callGeminiAI(String prompt) {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            return "I am currently running in offline database-assisted mode. Based on the official UGC data: You are viewing cutoff records for your stream and district. Please configure GEMINI_API_KEY to enable dynamic AI conversation.";
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        for (String model : GEMINI_MODELS) {
            try {
                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent?key=" + geminiApiKey.trim();

                Map<String, Object> payload = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(Map.of("text", prompt)))
                        ),
                        "generationConfig", Map.of(
                                "temperature", 0.3,
                                "maxOutputTokens", 1000
                        )
                );

                String jsonPayload = objectMapper.writeValueAsString(payload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .timeout(Duration.ofSeconds(15))
                        .build();

                HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
                    if (!textNode.isMissingNode()) {
                        return textNode.asText();
                    }
                } else {
                    log.warn("Gemini model {} returned status {}: {}", model, response.statusCode(), response.body());
                }
            } catch (Exception e) {
                log.warn("Failed calling Gemini model {}: {}", model, e.getMessage());
            }
        }

        return "I retrieved your UGC data from our database, but could not reach the AI generative service. Please verify your connection or retry in a few moments.";
    }

    private boolean streamGeminiAI(String prompt, java.util.function.Consumer<String> tokenConsumer) {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            return false;
        }

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        for (String model : GEMINI_MODELS) {
            try {
                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":streamGenerateContent?alt=sse&key=" + geminiApiKey.trim();

                Map<String, Object> payload = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(Map.of("text", prompt)))
                        ),
                        "generationConfig", Map.of(
                                "temperature", 0.3,
                                "maxOutputTokens", 1000
                        )
                );

                String jsonPayload = objectMapper.writeValueAsString(payload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .timeout(Duration.ofSeconds(30))
                        .build();

                HttpResponse<java.io.InputStream> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

                if (response.statusCode() == 200) {
                    try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(response.body(), java.nio.charset.StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.startsWith("data:")) {
                                String jsonData = line.substring(5).trim();
                                if (!jsonData.isEmpty()) {
                                    try {
                                        JsonNode root = objectMapper.readTree(jsonData);
                                        JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
                                        if (!textNode.isMissingNode()) {
                                            String text = textNode.asText();
                                            if (!text.isEmpty()) {
                                                tokenConsumer.accept(text);
                                            }
                                        }
                                    } catch (Exception parseEx) {
                                        log.debug("Chunk parse error: {}", parseEx.getMessage());
                                    }
                                }
                            }
                        }
                        return true;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed streaming Gemini model {}: {}", model, e.getMessage());
            }
        }
        return false;
    }

    private String determineStatusBadge(String aiReply, Double zScore, List<CourseCutoffMark> cutoffs) {
        String lower = aiReply.toLowerCase();
        if (lower.contains("needs review") || lower.contains("aptitude test") || lower.contains("practical test")) {
            return "Needs review";
        }
        if (lower.contains("you are eligible") || lower.contains("eligible for") || lower.contains("status: eligible")) {
            return "Eligible";
        }
        if (lower.contains("not eligible") || lower.contains("below the cutoff")) {
            return "Not eligible";
        }

        if (!cutoffs.isEmpty() && zScore != null) {
            double minCutoff = cutoffs.get(0).getMinimumZScore().doubleValue();
            return zScore >= minCutoff ? "Eligible" : "Not eligible";
        }

        return null;
    }

    private List<String> generateFollowUps(String stream, List<String> degrees) {
        List<String> list = new ArrayList<>();
        if (degrees != null && !degrees.isEmpty()) {
            list.add("What is the minimum Z-score for " + degrees.get(0) + "?");
            list.add("Which universities offer " + degrees.get(0) + "?");
        } else {
            list.add("What degrees can I apply for in " + stream + "?");
            list.add("What programs require an Aptitude Test?");
        }
        list.add("How do I calculate my chances for Moratuwa?");
        return list;
    }
}
