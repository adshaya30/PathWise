package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.course.entity.Course;
import com.pathwise.course.entity.CourseCutoffMark;
import com.pathwise.course.entity.University;
import com.pathwise.course.repository.CourseCutoffMarkRepository;
import com.pathwise.course.repository.CourseRepository;
import com.pathwise.course.repository.UniversityRepository;
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
public class CutoffIngestionService {

    private final CourseCutoffMarkRepository cutoffMarkRepository;
    private final UniversityRepository universityRepository;
    private final CourseRepository courseRepository;

    // Pattern to identify markdown table row: | District | Course | University | Cutoff |
    private static final Pattern MARKDOWN_ROW_PATTERN = Pattern.compile("^\\s*\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|([^|]+)\\|?.*$");
    private static final Pattern NUMERIC_ZSCORE_PATTERN = Pattern.compile("[-+]?\\d*\\.?\\d+");

    /**
     * Ingests and saves cutoff marks directly into the course_cutoff_marks table
     * upon document approval, without multi-source conflict staging or comparison.
     *
     * @param document the approved document
     * @return count of cutoff rows ingested
     */
    @Transactional
    public int promoteApprovedDocumentCutoffs(Document document) {
        if (document == null || document.getPages() == null || document.getPages().isEmpty()) {
            return 0;
        }

        log.info("Directly ingesting cutoff marks for Document ID: {} '{}' ({})",
                document.getId(), document.getTitle(), document.getAcademicYear());

        List<CourseCutoffMark> cutoffRows = new ArrayList<>();
        Set<String> distinctUniversities = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> distinctCourses = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        String academicYear = document.getAcademicYear() != null ? document.getAcademicYear().trim() : "2026/2027";

        // 1. Extract all rows from all pages
        for (DocumentPage page : document.getPages()) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            List<CourseCutoffMark> pageRows = parseCutoffRowsFromText(
                    page.getExtractedText(), document.getId(), academicYear, distinctUniversities, distinctCourses);
            cutoffRows.addAll(pageRows);
        }

        // 2. Batch-sync unique universities
        syncUniversities(distinctUniversities);

        // 3. Batch-sync unique courses
        syncCourses(distinctCourses);

        // 4. Save cutoff marks
        cutoffMarkRepository.deleteByDocumentId(document.getId());

        if (!cutoffRows.isEmpty()) {
            cutoffMarkRepository.saveAll(cutoffRows);
            log.info("Successfully saved {} production cutoff mark rows for Document ID: {}", cutoffRows.size(), document.getId());
        }

        return cutoffRows.size();
    }

    /**
     * Parses markdown table text into CourseCutoffMark production entities and collects unique names.
     * Supports BOTH:
     * 1. 4-column format: | District | Course of Study | University | Minimum Z-Score / Cutoff |
     * 2. 2D Pivot Matrix: | DISTRICT | COURSE (UNIVERSITY) 1 | COURSE (UNIVERSITY) 2 | ... |
     */
    public List<CourseCutoffMark> parseCutoffRowsFromText(
            String text, Long documentId, String academicYear,
            Set<String> uniCollector, Set<String> courseCollector) {

        List<CourseCutoffMark> rows = new ArrayList<>();
        if (text == null || text.isBlank()) return rows;

        String[] lines = Arrays.stream(text.split("\\r?\\n"))
                .map(String::trim)
                .filter(l -> l.startsWith("|") && !l.contains("---"))
                .toArray(String[]::new);

        if (lines.length < 2) return rows;

        // Check header line
        List<String> headerCells = parseMarkdownCells(lines[0]);
        if (headerCells.isEmpty()) return rows;

        boolean isStandardFourCol = headerCells.size() == 4 &&
                (headerCells.get(0).toLowerCase().contains("district") &&
                 headerCells.get(1).toLowerCase().contains("course"));

        if (isStandardFourCol) {
            // Mode 1: Standard 4-column format
            for (int i = 1; i < lines.length; i++) {
                List<String> cells = parseMarkdownCells(lines[i]);
                if (cells.size() >= 4) {
                    String district = normalizeDistrict(cells.get(0));
                    String courseName = cells.get(1);
                    String uniName = cells.get(2);
                    String cutoffStr = cells.get(3);

                    if (district.equalsIgnoreCase("District") || courseName.equalsIgnoreCase("Course of Study")) continue;

                    Matcher numMatcher = NUMERIC_ZSCORE_PATTERN.matcher(cutoffStr);
                    if (numMatcher.find()) {
                        try {
                            double val = Double.parseDouble(numMatcher.group());
                            if (isValidName(uniName)) uniCollector.add(uniName);
                            if (isValidName(courseName)) courseCollector.add(courseName);

                            rows.add(CourseCutoffMark.builder()
                                    .documentId(documentId)
                                    .academicYear(academicYear)
                                    .district(district)
                                    .courseName(courseName)
                                    .universityName(uniName)
                                    .cutoffMark(val)
                                    .approvedAt(LocalDateTime.now())
                                    .build());
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        } else {
            // Mode 2: 2D Pivot Matrix format (Header = Courses/Universities, Rows = Districts)
            List<CourseUniHeader> parsedHeaders = new ArrayList<>();
            for (int col = 1; col < headerCells.size(); col++) {
                parsedHeaders.add(extractCourseAndUni(headerCells.get(col)));
            }

            for (int i = 1; i < lines.length; i++) {
                List<String> cells = parseMarkdownCells(lines[i]);
                if (cells.isEmpty()) continue;

                String rawDistrict = cells.get(0);
                if (rawDistrict.equalsIgnoreCase("District")) continue;
                String district = normalizeDistrict(rawDistrict);

                for (int col = 1; col < cells.size() && (col - 1) < parsedHeaders.size(); col++) {
                    String cutoffStr = cells.get(col);
                    Matcher numMatcher = NUMERIC_ZSCORE_PATTERN.matcher(cutoffStr);
                    if (numMatcher.find()) {
                        try {
                            double val = Double.parseDouble(numMatcher.group());
                            CourseUniHeader cu = parsedHeaders.get(col - 1);
                            if (cu != null && !cu.courseName.isBlank()) {
                                if (isValidName(cu.universityName)) uniCollector.add(cu.universityName);
                                if (isValidName(cu.courseName)) courseCollector.add(cu.courseName);

                                rows.add(CourseCutoffMark.builder()
                                        .documentId(documentId)
                                        .academicYear(academicYear)
                                        .district(district)
                                        .courseName(cu.courseName)
                                        .universityName(!cu.universityName.isBlank() ? cu.universityName : "ALL UNIVERSITIES")
                                        .cutoffMark(val)
                                        .approvedAt(LocalDateTime.now())
                                        .build());
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        return rows;
    }

    private List<String> parseMarkdownCells(String line) {
        String[] parts = line.split("\\|");
        return Arrays.stream(parts)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private record CourseUniHeader(String courseName, String universityName) {}

    private CourseUniHeader extractCourseAndUni(String headerText) {
        if (headerText == null || headerText.isBlank()) return new CourseUniHeader("", "");
        String text = headerText.replaceAll("[*#]", "").trim();

        // Check pattern: "COURSE NAME (UNIVERSITY NAME)"
        int openParen = text.lastIndexOf('(');
        int closeParen = text.lastIndexOf(')');
        if (openParen != -1 && closeParen > openParen) {
            String course = text.substring(0, openParen).trim();
            String uni = text.substring(openParen + 1, closeParen).trim();
            return new CourseUniHeader(course, uni);
        }

        // Check pattern: "COURSE NAME - UNIVERSITY NAME"
        if (text.contains(" - ")) {
            String[] parts = text.split(" - ", 2);
            return new CourseUniHeader(parts[0].trim(), parts[1].trim());
        }

        return new CourseUniHeader(text, "");
    }

    private String normalizeDistrict(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String clean = raw.trim().toUpperCase().replaceAll("[^A-Z]", "");
        return switch (clean) {
            case "COLOM", "COLOMBO" -> "COLOMBO";
            case "GAMPA", "GAMPAHA" -> "GAMPAHA";
            case "KALUT", "KALUTA", "KALUTARA" -> "KALUTARA";
            case "MATAL", "MATALI", "MATALE" -> "MATALE";
            case "KANDY" -> "KANDY";
            case "NUWAR", "NUWAF", "NUWARA", "NUWARAELIYA" -> "NUWARA ELIYA";
            case "GALLE" -> "GALLE";
            case "MATAR", "MATARA" -> "MATARA";
            case "HAMBA", "HAMBANTOTA" -> "HAMBANTOTA";
            case "JAFFN", "JAFFNA" -> "JAFFNA";
            case "KILIN", "KILINOCHCHI" -> "KILINOCHCHI";
            case "MANNA", "MANNAR" -> "MANNAR";
            case "VAVUN", "VAVUNIYA" -> "VAVUNIYA";
            case "MULLA", "MULLAITIVU" -> "MULLAITIVU";
            case "BATTI", "BATTICALOA" -> "BATTICALOA";
            case "AMPAR", "AMPARA" -> "AMPARA";
            case "TRINC", "TRINCOMALEE" -> "TRINCOMALEE";
            case "KURUN", "KURUNEGALA" -> "KURUNEGALA";
            case "PUTTA", "PUTTALAM" -> "PUTTALAM";
            case "ANURA", "ANURADHAPURA" -> "ANURADHAPURA";
            case "POLON", "POLONNARUWA" -> "POLONNARUWA";
            case "BADUL", "BADULLA" -> "BADULLA";
            case "MONAR", "MONARAGALA" -> "MONARAGALA";
            case "RATNA", "RATNAPURA" -> "RATNAPURA";
            case "KEGAL", "KEGALLE" -> "KEGALLE";
            default -> raw.trim().toUpperCase();
        };
    }

    private boolean isValidName(String str) {
        if (str == null || str.isBlank()) return false;
        String lower = str.trim().toLowerCase();
        return !lower.equals("university") && !lower.equals("course of study") && !lower.equals("course");
    }

    private void syncUniversities(Set<String> names) {
        if (names == null || names.isEmpty()) return;

        Set<String> existingNames = universityRepository.findAll().stream()
                .map(University::getName)
                .collect(Collectors.toCollection(() -> new TreeSet<>(String.CASE_INSENSITIVE_ORDER)));

        List<University> toSave = new ArrayList<>();
        for (String name : names) {
            if (!existingNames.contains(name)) {
                toSave.add(University.builder()
                        .name(name.trim())
                        .createdAt(LocalDateTime.now())
                        .build());
                existingNames.add(name);
            }
        }

        if (!toSave.isEmpty()) {
            universityRepository.saveAll(toSave);
            log.info("Batch created {} new Universities", toSave.size());
        }
    }

    private void syncCourses(Set<String> names) {
        if (names == null || names.isEmpty()) return;

        Set<String> existingNames = courseRepository.findAll().stream()
                .map(Course::getName)
                .collect(Collectors.toCollection(() -> new TreeSet<>(String.CASE_INSENSITIVE_ORDER)));

        List<Course> toSave = new ArrayList<>();
        for (String name : names) {
            if (!existingNames.contains(name)) {
                toSave.add(Course.builder()
                        .name(name.trim())
                        .createdAt(LocalDateTime.now())
                        .build());
                existingNames.add(name);
            }
        }

        if (!toSave.isEmpty()) {
            courseRepository.saveAll(toSave);
            log.info("Batch created {} new Courses", toSave.size());
        }
    }
}


