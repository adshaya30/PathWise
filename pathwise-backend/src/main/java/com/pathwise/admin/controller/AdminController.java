package com.pathwise.admin.controller;

import com.pathwise.admin.service.GeminiQuotaManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}, allowCredentials = "true")
@RequiredArgsConstructor
public class AdminController {

    private final GeminiQuotaManager quotaManager;

    /**
     * Get Gemini API daily quota status and consumption
     */
    @GetMapping("/quota-status")
    public ResponseEntity<Map<String, Object>> getQuotaStatus() {
        Map<String, Object> status = Map.of(
                "dailyLimit", quotaManager.getDailyLimit(),
                "usedToday", quotaManager.getTodayUsage(),
                "remaining", quotaManager.getRemainingQuota(),
                "usagePercentage", Math.round(quotaManager.getUsagePercentage() * 10.0) / 10.0,
                "canMakeRequests", quotaManager.canMakeRequest(),
                "resetTime", "Midnight (IST)"
        );

        return ResponseEntity.ok(status);
    }
}
