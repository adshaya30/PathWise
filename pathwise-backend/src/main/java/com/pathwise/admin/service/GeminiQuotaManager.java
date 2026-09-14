package com.pathwise.admin.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Manages daily API quota usage for Google Gemini API
 */
@Component
@Slf4j
public class GeminiQuotaManager {

    // Daily quota limit for free tier
    private static final int DAILY_QUOTA_LIMIT = 1000;

    // Today's usage count
    private final AtomicInteger dailyUsage = new AtomicInteger(0);

    // Last reset date (resets automatically every new day)
    private LocalDate lastResetDate = LocalDate.now();

    /**
     * Check if we can make another API request
     */
    public synchronized boolean canMakeRequest() {
        LocalDate today = LocalDate.now();

        // Reset counter if new day
        if (!today.equals(lastResetDate)) {
            dailyUsage.set(0);
            lastResetDate = today;
        }

        int remaining = DAILY_QUOTA_LIMIT - dailyUsage.get();
        return remaining > 0;
    }

    /**
     * Increment usage counter after successful API call
     */
    public synchronized void incrementUsage() {
        dailyUsage.incrementAndGet();
    }

    /**
     * Get remaining quota for today
     */
    public synchronized int getRemainingQuota() {
        LocalDate today = LocalDate.now();

        if (!today.equals(lastResetDate)) {
            dailyUsage.set(0);
            lastResetDate = today;
        }

        return Math.max(0, DAILY_QUOTA_LIMIT - dailyUsage.get());
    }

    /**
     * Get today's usage
     */
    public synchronized int getTodayUsage() {
        LocalDate today = LocalDate.now();

        if (!today.equals(lastResetDate)) {
            dailyUsage.set(0);
            lastResetDate = today;
            return 0;
        }

        return dailyUsage.get();
    }

    /**
     * Get quota limit
     */
    public int getDailyLimit() {
        return DAILY_QUOTA_LIMIT;
    }

    /**
     * Get quota status as percentage
     */
    public synchronized double getUsagePercentage() {
        return ((double) getTodayUsage() / DAILY_QUOTA_LIMIT) * 100;
    }
}
