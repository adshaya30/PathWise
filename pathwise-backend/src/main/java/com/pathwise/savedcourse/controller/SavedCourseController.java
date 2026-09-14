package com.pathwise.savedcourse.controller;

import com.pathwise.savedcourse.dto.SavedCourseDto;
import com.pathwise.savedcourse.service.SavedCourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/saved-courses")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class SavedCourseController {

    private final SavedCourseService savedCourseService;

    /**
     * GET /api/saved-courses
     * List all saved course codes for the active student
     */
    @GetMapping
    public ResponseEntity<List<SavedCourseDto>> getSavedCourses(
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        String userEmail = resolveUserEmail(authentication);
        String anonymousId = anonymousIdParam != null && !anonymousIdParam.isBlank() ? anonymousIdParam : anonymousIdHeader;
        return ResponseEntity.ok(savedCourseService.getSavedCourses(userEmail, anonymousId));
    }

    /**
     * POST /api/saved-courses
     * Save a course for later (idempotent)
     */
    @PostMapping
    public ResponseEntity<SavedCourseDto> saveCourse(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            Authentication authentication
    ) {
        String userEmail = resolveUserEmail(authentication);
        String anonymousId = anonymousIdHeader != null && !anonymousIdHeader.isBlank()
                ? anonymousIdHeader
                : body.get("anonymousId");
        String uniCode = body.get("uniCode");
        return ResponseEntity.ok(savedCourseService.saveCourse(userEmail, anonymousId, uniCode));
    }

    /**
     * DELETE /api/saved-courses/{uniCode}
     * Remove a saved course
     */
    @DeleteMapping("/{uniCode}")
    public ResponseEntity<Void> removeCourse(
            @PathVariable String uniCode,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            @RequestParam(value = "anonymousId", required = false) String anonymousIdParam,
            Authentication authentication
    ) {
        String userEmail = resolveUserEmail(authentication);
        String anonymousId = anonymousIdParam != null && !anonymousIdParam.isBlank() ? anonymousIdParam : anonymousIdHeader;
        savedCourseService.removeCourse(userEmail, anonymousId, uniCode);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/saved-courses/merge
     * Merge anonymous saved courses into the authenticated user's account
     */
    @PostMapping("/merge")
    public ResponseEntity<Map<String, Object>> merge(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Anonymous-Id", required = false) String anonymousIdHeader,
            Authentication authentication
    ) {
        String userEmail = resolveUserEmail(authentication);
        if (userEmail == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Merge requires a logged-in user",
                    "merged", 0
            ));
        }
        String anonymousId = body.get("anonymousId") != null && !body.get("anonymousId").isBlank()
                ? body.get("anonymousId")
                : anonymousIdHeader;
        int merged = savedCourseService.mergeAnonymousToUser(userEmail, anonymousId);
        return ResponseEntity.ok(Map.of("merged", merged));
    }

    private String resolveUserEmail(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !authentication.getName().equalsIgnoreCase("anonymousUser")
                ? authentication.getName()
                : null;
    }
}