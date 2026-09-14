package com.pathwise.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class ModelTestController {

    @Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/find-working-models")
    public ResponseEntity<Map<String, Object>> findWorkingModels() {
        Map<String, Object> results = new LinkedHashMap<>();
        List<String> workingModels = new ArrayList<>();
        List<String> failedModels = new ArrayList<>();

        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "GEMINI_API_KEY is not configured in backend environment or application.properties"
            ));
        }

        // Test all possible models
        List<String> modelsToTest = List.of(
            // 3.x series
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.1-pro-preview",
            
            // 2.x series
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-001",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash-lite-preview-02-05",
            "gemini-2.0-pro-exp-02-05",
            
            // 1.x series
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            
            // Latest aliases
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-pro-latest"
        );

        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

        for (String model : modelsToTest) {
            try {
                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" 
                    + model + ":generateContent?key=" + geminiApiKey.trim();

                String requestBody = """
                    {
                        "contents": [{
                            "parts": [{
                                "text": "test"
                            }]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 10
                        }
                    }
                    """;

                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJsonBody(requestBody)))
                    .timeout(Duration.ofSeconds(8))
                    .build();

                HttpResponse<String> response = client.send(
                    request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    log.info("✅ Model '{}' works (status {})", model, response.statusCode());
                    workingModels.add(model);
                    results.put(model, Map.of(
                        "status", "WORKING",
                        "statusCode", response.statusCode()
                    ));
                } else {
                    log.warn("❌ Model '{}' failed (status {})", model, response.statusCode());
                    failedModels.add(model);
                    String bodySnippet = response.body() != null ? response.body().substring(0, Math.min(200, response.body().length())) : "";
                    results.put(model, Map.of(
                        "status", "FAILED",
                        "statusCode", response.statusCode(),
                        "body", bodySnippet
                    ));
                }

                // Small delay between calls to avoid burning through 15 RPM
                Thread.sleep(300);

            } catch (Exception e) {
                log.error("❌ Model '{}' exception: {}", model, e.getMessage());
                failedModels.add(model);
                results.put(model, Map.of(
                    "status", "ERROR",
                    "error", e.getMessage() != null ? e.getMessage() : e.toString()
                ));
            }
        }

        results.put("summary", Map.of(
            "totalTested", modelsToTest.size(),
            "workingModels", workingModels,
            "workingCount", workingModels.size(),
            "failedModels", failedModels,
            "failedCount", failedModels.size()
        ));

        return ResponseEntity.ok(results);
    }

    private String requestJsonBody(String defaultJson) {
        return defaultJson;
    }
}
