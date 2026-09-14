package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.repository.DocumentRepository;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CutoffIngestionService {

    private final CourseCutoffMarkRepository cutoffRepository;
    private final DocumentRepository documentRepository;
    private final DocumentPageRepository documentPageRepository;
    private final UniversityRepository universityRepository;
    private final CourseRepository courseRepository;

    private static final Pattern NUMERIC_ZSCORE_PATTERN = Pattern.compile("[-+]?\\d*\\.?\\d+");

    /**
     * Parse extracted markdown table and save to database in batches
     */
    @Transactional
    public int ingestCutoffMarks(Long documentId, String markdownTable) {
        log.info("Starting cutoff ingestion for Document ID: {}", documentId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        // Parse markdown table
        List<CourseCutoffMark> cutoffMarks = parseMarkdownTable(markdownTable, document);

        log.info("Parsed {} cutoff marks from markdown table", cutoffMarks.size());

        // Bulk save in batches
        int savedCount = saveCutoffMarksInBatches(cutoffMarks);

        log.info("Successfully saved {} cutoff marks to database", savedCount);

        return savedCount;
    }

    private static final Set<String> VALID_DISTRICTS = Set.of(
            "COLOMBO", "GAMPAHA", "KALUTARA", "MATALE", "KANDY",
            "NUWARA ELIYA", "GALLE", "MATARA", "HAMBANTOTA", "JAFFNA",
            "KILINOCHCHI", "MANNAR", "VAVUNIYA", "MULLAITIVU", "TRINCOMALEE",
            "BATTICALOA", "AMPARA", "PUTTALAM", "KURUNEGALA", "ANURADHAPURA",
            "POLONNARUWA", "BADULLA", "MONARAGALA", "KEGALLE", "RATNAPURA"
    );

    /**
     * Parse markdown table to list of entities
     */
    public List<CourseCutoffMark> parseMarkdownTable(String markdownTable, Document document) {
        List<CourseCutoffMark> cutoffMarks = new ArrayList<>();
        if (markdownTable == null || markdownTable.isBlank()) {
            return cutoffMarks;
        }

        String[] lines = markdownTable.split("\\r?\\n");

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();

            // Skip header rows & separator lines
            if (line.startsWith("| District") || line.startsWith("|----------") || line.startsWith("|:--") || line.startsWith("| ---")) {
                continue;
            }

            // Skip empty lines
            if (line.isBlank() || !line.startsWith("|")) {
                continue;
            }

            try {
                // Parse: | District | Course | University | Z-Score |
                String[] cells = line.split("\\|");

                if (cells.length >= 5) {
                    String rawDistrict = cells[1].trim();
                    String district = normalizeDistrict(rawDistrict);

                    // Strict District Check: Only accept genuine Sri Lankan districts
                    if (district.isBlank() || !VALID_DISTRICTS.contains(district.toUpperCase())) {
                        continue;
                    }

                    if (district.length() > 50) {
                        district = district.substring(0, 50);
                    }

                    String course = cells[2].trim();
                    String university = cells[3].trim();
                    String zScoreStr = cells[4].trim();

                    // Skip warning messages, headers, or empty cells
                    if (course.isBlank() || university.isBlank() ||
                            course.equalsIgnoreCase("Course of Study") ||
                            university.equalsIgnoreCase("University") ||
                            course.startsWith("⚠️") || course.contains("WARNING")) {
                        continue;
                    }

                    // Clean course and university if course contains parenthesized university name
                    Matcher uniParen = Pattern.compile("\\(([^)]*(?:University|Campus|Institute|School of|Sri Lanka|UOC|UOM|UOP|USJ|UOK|RUH|JFN|SEUSL|EUSL|RUSL|WUSL|SUSL|UWU|OUSL|UVPA|GWUIM|VAV|UCSC)[^)]*)\\)$", Pattern.CASE_INSENSITIVE).matcher(course);
                    if (uniParen.find()) {
                        String inside = uniParen.group(1).trim();
                        course = course.substring(0, uniParen.start()).trim();
                        if (university.equalsIgnoreCase(cells[2].trim()) || university.isBlank()) {
                            university = inside;
                        }
                    }

                    Matcher uniCellParen = Pattern.compile("\\(([^)]*(?:University|Campus|Institute|School of|Sri Lanka|UOC|UOM|UOP|USJ|UOK|RUH|JFN|SEUSL|EUSL|RUSL|WUSL|SUSL|UWU|OUSL|UVPA|GWUIM|VAV|UCSC)[^)]*)\\)$", Pattern.CASE_INSENSITIVE).matcher(university);
                    if (uniCellParen.find()) {
                        String inside = uniCellParen.group(1).trim();
                        university = inside;
                    }

                    if (course.length() > 195) course = course.substring(0, 195);
                    if (university.length() > 195) university = university.substring(0, 195);

                    // Parse Z-score
                    BigDecimal zScore = null;
                    if (!zScoreStr.equalsIgnoreCase("N/A") && !zScoreStr.equalsIgnoreCase("NQC") && !zScoreStr.equals("-") && !zScoreStr.isBlank()) {
                        Matcher numMatcher = NUMERIC_ZSCORE_PATTERN.matcher(zScoreStr);
                        if (numMatcher.find()) {
                            try {
                                zScore = new BigDecimal(numMatcher.group());
                                // Real GCE A/L cutoffs are strictly between -1.0 and 3.0.
                                // Any number > 3.0 (such as 5, 8, 10, 50) is an intake seat quota or student count from Table 2/3, not a cutoff!
                                if (zScore.compareTo(new BigDecimal("3.0")) > 0 || zScore.compareTo(new BigDecimal("-1.0")) < 0) {
                                    log.warn("Skipping non-cutoff row at line {}: value={} (outside valid Z-score range -1.0 to 3.0)", i + 1, zScore);
                                    continue;
                                }
                            } catch (NumberFormatException e) {
                                log.warn("Invalid Z-score '{}' at line {}: {}", zScoreStr, i + 1, e.getMessage());
                            }
                        }
                    }

                    String academicYear = resolveCutoffAcademicYear(document, markdownTable);
                    if (academicYear != null && academicYear.length() > 45) {
                        academicYear = academicYear.substring(0, 45);
                    }

                    // Create entity
                    CourseCutoffMark cutoff = CourseCutoffMark.builder()
                            .document(document)
                            .district(district)
                            .courseOfStudy(course)
                            .university(university)
                            .minimumZScore(zScore)
                            .academicYear(academicYear)
                            .build();

                    cutoffMarks.add(cutoff);
                }

            } catch (Exception e) {
                log.error("Error parsing line {}: {}", i + 1, e.getMessage());
            }
        }

        return cutoffMarks;
    }

    /**
     * Resolves the academic year for cutoff marks.
     * ONLY when the document is a HANDBOOK, converts to the preceding academic year (e.g. 2025/26 -> 2024/25).
     * For standalone CUTOFF documents, stores the academic year as-is.
     */
    private String resolveCutoffAcademicYear(Document document, String markdownTable) {
        String docYear = document.getAcademicYear() != null && !document.getAcademicYear().isBlank()
                ? document.getAcademicYear().replaceAll("\\s+", "").trim()
                : "2025/26";

        String docType = document.getDocumentType() != null ? document.getDocumentType().toUpperCase() : "";
        String rawTitle = document.getTitle() != null ? document.getTitle().toUpperCase() : "";
        String normalizedTitle = rawTitle.replaceAll("[\\s-_]", "");

        boolean isHandbook = docType.contains("HANDBOOK") || docType.contains("HAND BOOK") ||
                docType.contains("ADMISSION") || docType.contains("POLICY") ||
                normalizedTitle.contains("HANDBOOK") || rawTitle.contains("HAND BOOK") ||
                rawTitle.contains("ADMISSION") || rawTitle.contains("STUDENT HAND");

        // ONLY apply previous-year conversion for HANDBOOK documents
        if (isHandbook) {
            // Pattern 1: 4-digit / 4-digit (e.g. 2025/2026 or 2025-2026)
            Matcher ym4 = Pattern.compile("(20\\d{2})[/-](20\\d{2})").matcher(docYear);
            if (ym4.find()) {
                try {
                    int y1 = Integer.parseInt(ym4.group(1)) - 1;
                    int y2 = Integer.parseInt(ym4.group(2)) - 1;
                    return y1 + "/" + y2;
                } catch (Exception ignored) {}
            }

            // Pattern 2: 4-digit / 2-digit (e.g. 2025/26 or 2025-26)
            Matcher ym2 = Pattern.compile("(20\\d{2})[/-](\\d{2})").matcher(docYear);
            if (ym2.find()) {
                try {
                    int y1 = Integer.parseInt(ym2.group(1)) - 1;
                    int y2 = Integer.parseInt(ym2.group(2)) - 1;
                    return y1 + "/" + String.format("%02d", y2);
                } catch (Exception ignored) {}
            }

            // Pattern 3: Single 4-digit year (e.g. 2025 or 2026)
            Matcher ymSingle = Pattern.compile("\\b(20\\d{2})\\b").matcher(docYear);
            if (ymSingle.find()) {
                try {
                    int y = Integer.parseInt(ymSingle.group(1)) - 1;
                    int yPrev = y - 1;
                    return yPrev + "/" + String.format("%02d", y % 100);
                } catch (Exception ignored) {}
            }
        }

        // For non-handbook CUTOFF documents, store year as-is
        return docYear;
    }

    /**
     * Save in batches to avoid memory and timeout issues
     */
    public int saveCutoffMarksInBatches(List<CourseCutoffMark> cutoffMarks) {
        if (cutoffMarks == null || cutoffMarks.isEmpty()) {
            return 0;
        }

        int batchSize = 100;
        int savedCount = 0;

        for (int i = 0; i < cutoffMarks.size(); i += batchSize) {
            int end = Math.min(i + batchSize, cutoffMarks.size());
            List<CourseCutoffMark> batch = cutoffMarks.subList(i, end);

            cutoffRepository.saveAllAndFlush(batch);
            savedCount += batch.size();
            log.info("Saved batch {}/{} ({} records)",
                    (i / batchSize) + 1,
                    (cutoffMarks.size() + batchSize - 1) / batchSize,
                    batch.size());
        }

        return savedCount;
    }

    /**
     * Ingests and saves cutoff marks directly into the course_cutoff_marks table upon document approval
     */
    @Transactional
    public int promoteApprovedDocumentCutoffs(Document document) {
        if (document == null || document.getId() == null) {
            return 0;
        }

        List<DocumentPage> pages = (document.getPages() != null && !document.getPages().isEmpty())
                ? document.getPages()
                : documentPageRepository.findByDocumentIdOrderByPageNumberAsc(document.getId());

        if (pages == null || pages.isEmpty()) {
            log.warn("No pages found to ingest for Document ID: {}", document.getId());
            return 0;
        }

        log.info("Directly ingesting cutoff marks for Document ID: {} '{}' ({}) across {} pages",
                document.getId(), document.getTitle(), document.getAcademicYear(), pages.size());

        List<CourseCutoffMark> cutoffRows = new ArrayList<>();
        Set<String> distinctUniversities = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> distinctCourses = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        // 1. Extract all rows from all pages
        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            List<CourseCutoffMark> pageRows = parseMarkdownTable(page.getExtractedText(), document);
            pageRows.forEach(row -> row.setDocumentPage(page));
            cutoffRows.addAll(pageRows);

            pageRows.forEach(r -> {
                if (isValidName(r.getUniversity())) distinctUniversities.add(r.getUniversity());
                if (isValidName(r.getCourseOfStudy())) distinctCourses.add(r.getCourseOfStudy());
            });
        }

        // 2. Batch-sync unique universities & courses
        syncUniversities(distinctUniversities);
        syncCourses(distinctCourses);

        // 3. Deduplicate across pages to satisfy unique constraint on (district, course_of_study, university, academic_year, medium_of_instruction)
        Map<String, CourseCutoffMark> deduplicatedMap = new LinkedHashMap<>();
        for (CourseCutoffMark mark : cutoffRows) {
            if (mark.getDistrict() == null || mark.getDistrict().isBlank() ||
                    mark.getCourseOfStudy() == null || mark.getCourseOfStudy().isBlank() ||
                    mark.getUniversity() == null || mark.getUniversity().isBlank()) {
                continue;
            }
            String key = mark.getDistrict().trim().toUpperCase() + "||"
                    + mark.getCourseOfStudy().trim().toUpperCase() + "||"
                    + mark.getUniversity().trim().toUpperCase() + "||"
                    + (mark.getAcademicYear() != null ? mark.getAcademicYear().trim().toUpperCase() : "") + "||"
                    + (mark.getMediumOfInstruction() != null ? mark.getMediumOfInstruction().trim().toUpperCase() : "");

            deduplicatedMap.put(key, mark);
        }
        List<CourseCutoffMark> uniqueCutoffRows = new ArrayList<>(deduplicatedMap.values());

        // 4. Save cutoff marks
        cutoffRepository.deleteByDocumentId(document.getId());

        int savedCount = 0;
        if (!uniqueCutoffRows.isEmpty()) {
            savedCount = saveCutoffMarksInBatches(uniqueCutoffRows);
            log.info("Successfully saved {} unique cutoff mark rows (from {} raw rows) for Document ID: {}",
                    savedCount, cutoffRows.size(), document.getId());
        }

        return savedCount;
    }

    private String normalizeDistrict(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String clean = raw.trim().toUpperCase().replaceAll("[^A-Z]", "");
        String mapped = switch (clean) {
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
            default -> {
                for (String expected : VALID_DISTRICTS) {
                    if (clean.equals(expected.replaceAll("[^A-Z]", "")) || clean.contains(expected.replaceAll("[^A-Z]", ""))) {
                        yield expected;
                    }
                }
                yield clean.length() > 50 ? clean.substring(0, 50) : clean;
            }
        };
        return mapped;
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
