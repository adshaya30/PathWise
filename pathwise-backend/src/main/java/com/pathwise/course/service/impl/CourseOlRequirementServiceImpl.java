package com.pathwise.course.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.course.entity.CourseOlRequirement;
import com.pathwise.course.repository.CourseOlRequirementRepository;
import com.pathwise.course.service.CourseOlRequirementService;
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
public class CourseOlRequirementServiceImpl implements CourseOlRequirementService {

    private final CourseOlRequirementRepository courseOlRequirementRepository;
    private final DocumentPageRepository documentPageRepository;

    @Override
    @Transactional
    public int promoteHandbookOlRequirements(Document document) {
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
        log.info("Processing G.C.E. (O/L) Requirements from Document ID: {} '{}' ({}) across {} pages",
                document.getId(), document.getTitle(), academicYear, pages.size());

        List<CourseOlRequirement> olRows = new ArrayList<>();

        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            List<CourseOlRequirement> pageRows = parsePageForOlRequirements(
                    page.getExtractedText(), document.getId(), academicYear);
            olRows.addAll(pageRows);
        }

        if (!olRows.isEmpty()) {
            courseOlRequirementRepository.deleteByDocumentId(document.getId());
            courseOlRequirementRepository.saveAll(olRows);
            log.info("Successfully ingested {} O/L subject requirement rows for Document ID: {}", olRows.size(), document.getId());
        }

        return olRows.size();
    }

    private List<CourseOlRequirement> parsePageForOlRequirements(
            String text, Long documentId, String academicYear) {

        List<CourseOlRequirement> rows = new ArrayList<>();
        if (!text.toLowerCase().contains("eng") && !text.toLowerCase().contains("mat") && !text.toLowerCase().contains("sci")) {
            return rows;
        }

        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) {
                continue;
            }

            // Split on pipes
            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();

            // Expected schema: | Uni-Codes | Course of Study | Sin. Lang. | Eng. | Mat. | Sci. | Tam. Lang. |
            if (cells.size() >= 4) {
                String uniCodes = cells.get(0);
                String courseName = cells.get(1);

                if (uniCodes.equalsIgnoreCase("Uni-Codes") || courseName.equalsIgnoreCase("Course of Study")) {
                    continue; // header
                }

                // Check if this row looks like an O/L requirement row
                if (isValidCourseName(courseName)) {
                    String sinLang = cells.size() > 2 ? cleanGrade(cells.get(2)) : "";
                    String eng = cells.size() > 3 ? cleanGrade(cells.get(3)) : "";
                    String mat = cells.size() > 4 ? cleanGrade(cells.get(4)) : "";
                    String sci = cells.size() > 5 ? cleanGrade(cells.get(5)) : "";
                    String tamLang = cells.size() > 6 ? cleanGrade(cells.get(6)) : "";

                    rows.add(CourseOlRequirement.builder()
                            .documentId(documentId)
                            .academicYear(academicYear)
                            .uniCodes(uniCodes)
                            .courseName(courseName)
                            .sinhalaLangGrade(sinLang)
                            .englishGrade(eng)
                            .mathematicsGrade(mat)
                            .scienceGrade(sci)
                            .tamilLangGrade(tamLang)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }
        return rows;
    }

    private String cleanGrade(String val) {
        if (val == null || val.isBlank() || val.equals("-") || val.equals("–")) return "";
        return val.trim();
    }

    private boolean isValidCourseName(String name) {
        if (name == null || name.isBlank()) return false;
        String lower = name.toLowerCase();
        return !lower.equals("course of study") && !lower.equals("course");
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseOlRequirement> getOlRequirementsByAcademicYear(String academicYear) {
        return courseOlRequirementRepository.findByAcademicYear(academicYear);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseOlRequirement> getOlRequirementsForCourse(String academicYear, String courseName) {
        return courseOlRequirementRepository.findByAcademicYearAndCourseNameIgnoreCase(academicYear, courseName);
    }
}
