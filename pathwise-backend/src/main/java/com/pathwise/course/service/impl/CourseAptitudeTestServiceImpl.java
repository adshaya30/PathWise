package com.pathwise.course.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.course.entity.CourseAptitudeTestRequirement;
import com.pathwise.course.repository.CourseAptitudeTestRequirementRepository;
import com.pathwise.course.service.CourseAptitudeTestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseAptitudeTestServiceImpl implements CourseAptitudeTestService {

    private final CourseAptitudeTestRequirementRepository repository;

    @Override
    @Transactional
    public int promoteHandbookAptitudeTests(Document document) {
        if (document == null || document.getPages() == null || document.getPages().isEmpty()) {
            return 0;
        }

        String academicYear = document.getAcademicYear() != null ? document.getAcademicYear().trim() : "2025/2026";
        log.info("Processing Aptitude/Practical Test Requirements from Document ID: {} '{}' ({})",
                document.getId(), document.getTitle(), academicYear);

        List<CourseAptitudeTestRequirement> testRows = new ArrayList<>();

        for (DocumentPage page : document.getPages()) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            String text = page.getExtractedText();
            String lower = text.toLowerCase();

            if (lower.contains("aptitude") || lower.contains("practical test") || lower.contains("sripalee") || lower.contains("swamy vipulananda")) {
                testRows.addAll(parsePageForAptitudeTests(text, document.getId(), academicYear));
            }
        }

        if (!testRows.isEmpty()) {
            repository.deleteByDocumentId(document.getId());
            repository.saveAll(testRows);
            log.info("Successfully ingested {} Aptitude Test requirement records for Document ID: {}", testRows.size(), document.getId());
        }

        return testRows.size();
    }

    private List<CourseAptitudeTestRequirement> parsePageForAptitudeTests(
            String text, Long documentId, String academicYear) {

        List<CourseAptitudeTestRequirement> rows = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) continue;

            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts).map(String::trim).filter(s -> !s.isEmpty()).toList();

            // Schema: | Course of Study | University / Campus / Institute | Uni-Code |
            if (cells.size() >= 3) {
                String col1 = cells.get(0);
                String col2 = cells.get(1);
                String col3 = cells.get(2);

                if (col1.equalsIgnoreCase("Course of Study") || col2.equalsIgnoreCase("University")) {
                    continue;
                }

                String courseName = col1;
                String uniName = col2;
                String uniCode = col3;

                // Support flipped columns if needed
                if (col3.matches("^\\d{3}[A-Za-z]$") || col3.matches("^[A-Za-z0-9/]+$")) {
                    uniCode = col3;
                    courseName = col1;
                    uniName = col2;
                }

                if (isValidCourse(courseName) && !uniName.isBlank()) {
                    String testType = "APTITUDE_TEST";
                    if (courseName.toLowerCase().contains("performing") || courseName.toLowerCase().contains("music") || courseName.toLowerCase().contains("dance") || courseName.toLowerCase().contains("drama")) {
                        testType = "PRACTICAL_AND_APTITUDE_TEST";
                    }

                    rows.add(CourseAptitudeTestRequirement.builder()
                            .documentId(documentId)
                            .academicYear(academicYear)
                            .courseName(courseName)
                            .universityName(uniName)
                            .uniCode(uniCode)
                            .testType(testType)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }
        return rows;
    }

    private boolean isValidCourse(String name) {
        if (name == null || name.isBlank()) return false;
        String lower = name.toLowerCase();
        return !lower.equals("course of study") && !lower.equals("course") && !lower.equals("total");
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseAptitudeTestRequirement> getAptitudeTestsByAcademicYear(String academicYear) {
        return repository.findByAcademicYear(academicYear);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseAptitudeTestRequirement> getAptitudeTestsForCourse(String academicYear, String courseName) {
        return repository.findByAcademicYearAndCourseNameIgnoreCase(academicYear, courseName);
    }
}
