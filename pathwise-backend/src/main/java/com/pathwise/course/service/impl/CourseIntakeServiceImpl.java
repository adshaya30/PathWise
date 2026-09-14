package com.pathwise.course.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.course.entity.Course;
import com.pathwise.course.entity.CourseIntake;
import com.pathwise.course.entity.University;
import com.pathwise.course.repository.CourseIntakeRepository;
import com.pathwise.course.repository.CourseRepository;
import com.pathwise.course.repository.UniversityRepository;
import com.pathwise.course.service.CourseIntakeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseIntakeServiceImpl implements CourseIntakeService {

    private final CourseIntakeRepository courseIntakeRepository;
    private final DocumentPageRepository documentPageRepository;
    private final UniversityRepository universityRepository;
    private final CourseRepository courseRepository;

    private static final Pattern NUMERIC_INTAKE_PATTERN = Pattern.compile("\\b\\d+\\b");

    @Override
    @Transactional
    public int promoteHandbookIntakes(Document document) {
        if (document == null || document.getId() == null) {
            return 0;
        }

        List<DocumentPage> pages = (document.getPages() != null && !document.getPages().isEmpty())
                ? document.getPages()
                : documentPageRepository.findByDocumentIdOrderByPageNumberAsc(document.getId());

        if (pages == null || pages.isEmpty()) {
            log.warn("No pages found for Document ID: {}", document.getId());
            return 0;
        }

        String academicYear = document.getAcademicYear() != null ? document.getAcademicYear().trim() : "2025/2026";
        log.info("Processing Course Intakes from Document ID: {} '{}' for Academic Year: {} across {} pages",
                document.getId(), document.getTitle(), academicYear, pages.size());

        List<CourseIntake> intakeRows = new ArrayList<>();
        Set<String> distinctUniversities = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> distinctCourses = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            List<CourseIntake> pageRows = parsePageForIntakes(
                    page.getExtractedText(), document.getId(), academicYear, distinctUniversities, distinctCourses);
            intakeRows.addAll(pageRows);
        }

        if (!intakeRows.isEmpty()) {
            syncUniversities(distinctUniversities);
            syncCourses(distinctCourses);

            courseIntakeRepository.deleteByDocumentId(document.getId());
            courseIntakeRepository.saveAll(intakeRows);
            log.info("Successfully ingested {} course intake records for Document ID: {}", intakeRows.size(), document.getId());
        }

        return intakeRows.size();
    }

    private List<CourseIntake> parsePageForIntakes(
            String text, Long documentId, String academicYear,
            Set<String> uniCollector, Set<String> courseCollector) {

        List<CourseIntake> rows = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) {
                continue;
            }

            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();

            if (cells.size() >= 3) {
                String col1 = cells.get(0);
                String col2 = cells.get(1);
                String col3 = cells.get(2);

                // Check for Annex (b): | University | Course of Study | Proposed Intake |
                if (isUniversityName(col1) && isValidCourse(col2)) {
                    Matcher numMatcher = NUMERIC_INTAKE_PATTERN.matcher(col3);
                    if (numMatcher.find()) {
                        try {
                            int intakeVal = Integer.parseInt(numMatcher.group());
                            uniCollector.add(col1);
                            courseCollector.add(col2);

                            rows.add(CourseIntake.builder()
                                    .documentId(documentId)
                                    .academicYear(academicYear)
                                    .universityName(col1)
                                    .courseName(col2)
                                    .proposedIntake(intakeVal)
                                    .createdAt(LocalDateTime.now())
                                    .build());
                        } catch (NumberFormatException ignored) {}
                    }
                }
                // Check for Annex (a): | Course Code | Course of Study | Proposed Intake |
                else if (isCourseCode(col1) && isValidCourse(col2)) {
                    Matcher numMatcher = NUMERIC_INTAKE_PATTERN.matcher(col3);
                    if (numMatcher.find()) {
                        try {
                            int intakeVal = Integer.parseInt(numMatcher.group());
                            courseCollector.add(col2);

                            rows.add(CourseIntake.builder()
                                    .documentId(documentId)
                                    .academicYear(academicYear)
                                    .courseCode(col1)
                                    .universityName("ALL UNIVERSITIES (TOTAL)")
                                    .courseName(col2)
                                    .proposedIntake(intakeVal)
                                    .createdAt(LocalDateTime.now())
                                    .build());
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }
        return rows;
    }

    private boolean isUniversityName(String name) {
        if (name == null || name.isBlank()) return false;
        String lower = name.toLowerCase();
        return lower.contains("university") || lower.contains("campus") || lower.contains("institute");
    }

    private boolean isCourseCode(String code) {
        if (code == null || code.isBlank()) return false;
        return code.trim().matches("^\\d{1,3}[A-Za-z]?$");
    }

    private boolean isValidCourse(String name) {
        if (name == null || name.isBlank()) return false;
        String lower = name.toLowerCase();
        return !lower.equals("course of study") && !lower.equals("course") && !lower.equals("total");
    }

    private void syncUniversities(Set<String> names) {
        if (names == null || names.isEmpty()) return;
        Set<String> existing = universityRepository.findAll().stream()
                .map(University::getName)
                .collect(Collectors.toCollection(() -> new TreeSet<>(String.CASE_INSENSITIVE_ORDER)));

        List<University> toSave = new ArrayList<>();
        for (String name : names) {
            if (!existing.contains(name) && !name.equalsIgnoreCase("ALL UNIVERSITIES (TOTAL)")) {
                toSave.add(University.builder().name(name.trim()).createdAt(LocalDateTime.now()).build());
                existing.add(name);
            }
        }
        if (!toSave.isEmpty()) {
            universityRepository.saveAll(toSave);
        }
    }

    private void syncCourses(Set<String> names) {
        if (names == null || names.isEmpty()) return;
        Set<String> existing = courseRepository.findAll().stream()
                .map(Course::getName)
                .collect(Collectors.toCollection(() -> new TreeSet<>(String.CASE_INSENSITIVE_ORDER)));

        List<Course> toSave = new ArrayList<>();
        for (String name : names) {
            if (!existing.contains(name)) {
                toSave.add(Course.builder().name(name.trim()).createdAt(LocalDateTime.now()).build());
                existing.add(name);
            }
        }
        if (!toSave.isEmpty()) {
            courseRepository.saveAll(toSave);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseIntake> getIntakesByAcademicYear(String academicYear) {
        return courseIntakeRepository.findByAcademicYear(academicYear);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseIntake> getIntakesForCourse(String academicYear, String courseName) {
        return courseIntakeRepository.findByAcademicYearAndCourseNameIgnoreCase(academicYear, courseName);
    }
}
