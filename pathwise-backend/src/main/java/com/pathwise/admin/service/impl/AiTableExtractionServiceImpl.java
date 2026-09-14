package com.pathwise.admin.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pathwise.admin.dto.DocumentPageResponseDto;
import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.exception.CourseCountMismatchException;
import com.pathwise.admin.exception.MissingDistrictsException;
import com.pathwise.admin.exception.ValidationException;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.repository.DocumentRepository;
import com.pathwise.admin.service.AiTableExtractionService;
import com.pathwise.admin.service.FileStorageService;
import com.pathwise.admin.service.GeminiQuotaManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiTableExtractionServiceImpl implements AiTableExtractionService {

    private final DocumentRepository documentRepository;
    private final DocumentPageRepository documentPageRepository;
    private final FileStorageService fileStorageService;
    private final GeminiQuotaManager quotaManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    @Override
    public DocumentPageResponseDto extractPageTableWithAi(Long documentId, Integer pageNumber) {
        log.info("Starting AI-powered table extraction for Document ID: {} Page: {}", documentId, pageNumber);

        // 1. Find existing page entity
        DocumentPage page = documentPageRepository.findByDocumentIdAndPageNumber(documentId, pageNumber)
                .orElseThrow(() -> new RuntimeException(String.format("Page %d not found for document ID %d", pageNumber, documentId)));

        // 2. Fetch original PDF bytes directly from storage (Network I/O - Outside Transaction)
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + documentId));

        byte[] pdfBytes = null;
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                pdfBytes = fileStorageService.downloadFile(doc.getStoragePath());
                break;
            } catch (Exception e) {
                if (i == maxRetries - 1) {
                    log.error("Failed to download PDF bytes for document {} after {} attempts: {}", documentId, maxRetries, e.getMessage());
                    throw new RuntimeException("Could not retrieve document PDF file: " + e.getMessage(), e);
                }
                log.warn("Attempt {}/{} failed to download PDF for document {}. Retrying in {} ms...", i + 1, maxRetries, documentId, 1000L * (i + 1));
                try {
                    Thread.sleep(1000L * (i + 1)); // Exponential backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting to retry PDF download", ie);
                }
            }
        }

        // 3. Render the specific page as high-res PNG image (CPU - Outside Transaction)
        String base64Image;
        try (PDDocument pdDocument = Loader.loadPDF(pdfBytes)) {
            if (pageNumber < 1 || pageNumber > pdDocument.getNumberOfPages()) {
                throw new IllegalArgumentException(String.format("Page number %d out of bounds (1..%d)", pageNumber, pdDocument.getNumberOfPages()));
            }

            PDFRenderer renderer = new PDFRenderer(pdDocument);
            // Render at 250 DPI for ultra-sharp OCR/AI detection of vertical/rotated text
            BufferedImage image = renderer.renderImageWithDPI(pageNumber - 1, 250, ImageType.RGB);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            base64Image = Base64.getEncoder().encodeToString(baos.toByteArray());
            log.info("Successfully rendered page {} to high-res PNG ({} bytes base64)", pageNumber, base64Image.length());
        } catch (Exception e) {
            log.error("Error rendering PDF page {} to image: {}", pageNumber, e.getMessage(), e);
            throw new RuntimeException("Failed to render PDF page as image: " + e.getMessage(), e);
        }

        // 4. Call Gemini AI Vision API to extract table (AI Network I/O - Outside Transaction)
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured in backend .env or application.properties. Please add your Gemini API key to enable live AI vision extraction.");
        }

        // 5. Intelligent Page Classification: Check if this page is a 25-district Cutoff Marks table or a UGC Handbook domain table
        boolean isCutoffTable = isCutoffMarksPage(doc, page, pageNumber);
        String extractedTableContent;

        if (isCutoffTable) {
            log.info("Page {} detected as District Cutoff Marks Table for Document '{}'. Running 5-chunk partitioned extraction...",
                    pageNumber, doc.getTitle());
            extractedTableContent = extractTableWithPagination(base64Image, pageNumber);

            // COMPLETE VALIDATION WITH AUTO-RETRY ONLY FOR CUTOFF TABLES
            try {
                validateExtractedTable(extractedTableContent, documentId, pageNumber);
                log.info("All validations passed for Cutoff page {}", pageNumber);
            } catch (MissingDistrictsException | CourseCountMismatchException | ValidationException e) {
                log.error("Validation failed for Cutoff page {}. Error: {}", pageNumber, e.getMessage());

                // Auto-retry once
                log.info("Attempting one more retry for Cutoff page {}...", pageNumber);
                try {
                    extractedTableContent = extractTableWithPagination(base64Image, pageNumber);
                    validateExtractedTable(extractedTableContent, documentId, pageNumber);
                    log.info("Retry successful for Cutoff page {}", pageNumber);
                } catch (Exception retryEx) {
                    log.error("Retry also failed for Cutoff page {}. Saving available extraction results.", pageNumber);
                }
            }
        } else {
            log.info("Page {} detected as UGC Handbook domain/content table (Intake, Uni-Code, O/L, Medium, or Aptitude) for Document '{}'. Running targeted single-pass OCR...",
                    pageNumber, doc.getTitle());
            extractedTableContent = extractHandbookPageTable(base64Image, pageNumber, doc);
        }

        // 6. Save result
        return saveExtractedPageResult(documentId, pageNumber, extractedTableContent);
    }

    private static final List<String> NON_UNIVERSITY_DISTRICT_NAMES = List.of(
            "GAMPAHA", "KALUTARA", "MATALE", "NUWARA ELIYA", "GALLE", "MATARA",
            "HAMBANTOTA", "KILINOCHCHI", "MANNAR", "MULLAITIVU", "PUTTALAM",
            "KURUNEGALA", "ANURADHAPURA", "POLONNARUWA", "BADULLA", "MONARAGALA",
            "KEGALLE", "RATNAPURA"
    );

    /**
     * Strictly determines whether a specific page is a 25-district Cutoff Marks matrix table.
     * Prevents false positives from university names containing city/district names (e.g. University of Colombo).
     */
    private boolean isCutoffMarksPage(Document doc, DocumentPage page, int pageNumber) {
        String docType = doc.getDocumentType() != null ? doc.getDocumentType().toUpperCase() : "";

        // If document is exclusively a standalone Cutoff Document
        if (docType.contains("CUTOFF") || docType.contains("RANK") || docType.contains("CUT-OFF")) {
            return true;
        }

        if (page == null || page.getExtractedText() == null || page.getExtractedText().isBlank()) {
            return false;
        }

        String text = page.getExtractedText();
        String lower = text.toLowerCase();

        // 1. Explicit Handbook Table Exclusions: Uni-Codes, Places Available / Intake, O/L Requirements, Mediums, Aptitudes
        if (lower.contains("uni - code") || lower.contains("uni-code") || lower.contains("uni-codes assigned") ||
                lower.contains("places available for admission") || lower.contains("proposed intake") ||
                lower.contains("distribution of places") || lower.contains("distribution of the total number of places") ||
                lower.contains("ordinary level") || lower.contains("sin. lang.") || lower.contains("tam. lang.") ||
                lower.contains("medium of instruction") || lower.contains("differently abled") ||
                lower.contains("blind (braille)") || lower.contains("aptitude test") || lower.contains("practical test")) {
            return false;
        }

        // 2. Strict Cutoff Matrix Signatures:
        // Check for presence of non-university district names (Sri Lanka has no "University of Gampaha/Kalutara/Matale/Kegalle")
        long uniqueDistrictCount = NON_UNIVERSITY_DISTRICT_NAMES.stream()
                .filter(d -> lower.contains(d.toLowerCase()))
                .count();

        boolean hasCutoffHeading = lower.contains("minimum z-score") || lower.contains("minimum 'z' - score") ||
                lower.contains("minimum 'z' score") || lower.contains("minimum z - score") ||
                lower.contains("cutoff mark") || lower.contains("cut-off mark") ||
                lower.contains("minimum marks for university admission") ||
                (lower.contains("minimum marks") && lower.contains("admission")) ||
                lower.contains("district");

        // Allow flexible decimal matching for raw PDFBox text kerning (e.g. "2. 3517", "2.3517")
        long zScoreDecimalCount = Pattern.compile("[-+]?\\d\\s*\\.\\s*\\d{2,4}\\b").matcher(text).results().count();
        long nqcCount = Pattern.compile("(?i)\\b(NQC|N/A)\\b").matcher(text).results().count();

        // If page has at least 2 distinct Sri Lankan districts (e.g. Gampaha, Kalutara, Matale, Kegalle)
        if (uniqueDistrictCount >= 2) {
            return true;
        }

        if (hasCutoffHeading && (zScoreDecimalCount >= 2 || nqcCount >= 2 || uniqueDistrictCount >= 1)) {
            return true;
        }

        // High density of decimal Z-Scores across columns
        if (zScoreDecimalCount >= 6) {
            return true;
        }

        return false;
    }

    /**
     * Single-pass targeted table extraction for UGC Handbook pages (Places Available, Uni-Codes, O/L, Mediums, Aptitudes, Cutoffs)
     */
    private String extractHandbookPageTable(String base64Image, int pageNumber, Document doc) {
        String prompt = """
            You are an expert OCR table extractor specialized in UGC Sri Lanka University Admission Handbooks.
            Carefully inspect this page image and extract ANY structured table present into clean Markdown format.

            UGC TABLE SPECIFICATIONS:
            1. PLACES AVAILABLE FOR ADMISSION (Annex A - Total Proposed Intake per Course):
               `| Course Code | Course of Study | Proposed Intake |`
            2. DISTRIBUTION OF PLACES PROPOSED FOR ADMISSION (Annex B - University-Wise Intake):
               `| University | Course of Study | Proposed Intake |`
               CRITICAL UNPIVOTING RULE FOR ANNEX B:
               - When this page contains side-by-side University boxes (e.g. 'University of Colombo', 'University of Sri Jayewardenepura', 'University of Peradeniya', etc.), unpivot every box into standard rows:
                 | University | Course of Study | Proposed Intake |
                 | University of Colombo | Medicine | 224 |
                 | University of Colombo | Biological Science | 155 |
                 | University of Sri Jayewardenepura | Medicine | 194 |
                 | University of Sri Jayewardenepura | Dental Surgery | 30 |
                 | University of Peradeniya | Medicine | 238 |
               - Do NOT make university names separate column headers or empty header rows. Always standardize to the 3 columns: `University | Course of Study | Proposed Intake`.
            3. UNI-CODES ASSIGNED FOR EACH COURSE OF STUDY:
               `| Course of Study | University | Uni - Code |`
            4. MEDIUM OF INSTRUCTION:
               `| No | University | Medium of Instruction |`
            5. SPECIAL ADMISSION / DIFFERENTLY ABLED CATEGORIES:
               `| University | Course of Study | Uni-Codes | Differently Abled | Blind (Braille) |`
            6. G.C.E. (O/L) EXAMINATION REQUIREMENTS:
               `| Uni-Codes | Course of Study | Sin. Lang. | Eng. | Mat. | Sci. | Tam. Lang. |`
            7. REQUIREMENT TO PASS THE PRACTICAL/ APTITUDE TEST:
               `| Course of Study | University / Campus / Institute | Uni-Code |`
            8. DISTRICT CUTOFF MARKS TABLE (if present on this page):
               - Unpivot each course & university column into standard 4-column rows:
                 `| District | Course of Study | University | Minimum Z-Score / Cutoff |`
               - Example:
                 | COLOMBO | MEDICINE | University of Colombo | 2.3517 |
                 | COLOMBO | MEDICINE | University of Peradeniya | 2.1679 |
                 | COLOMBO | MEDICINE | University of Sri Jayewardenepura | 2.1207 |
                 | GAMPAHA | MEDICINE | University of Colombo | 2.4035 |
                 | GAMPAHA | MEDICINE | University of Peradeniya | 2.2114 |
               - CRITICAL: Never output a wide table with separate university columns. Always unpivot into standard 4 columns: District, Course of Study, University, Minimum Z-Score / Cutoff.

            RULES:
            - If this page contains a table, output ONLY the clean Markdown table starting with `|`.
            - If this page contains descriptive text, clauses, or guidelines, transcribe it in clean high-fidelity Markdown.
            - Do NOT include markdown code fences (no ```).
            - Do NOT add conversational introductory or concluding text.
            """;

        return callGeminiVisionWithCustomPrompt(base64Image, pageNumber, prompt);
    }

    @Transactional
    public DocumentPageResponseDto saveExtractedPageResult(Long documentId, Integer pageNumber, String extractedTableContent) {
        DocumentPage page = documentPageRepository.findByDocumentIdAndPageNumber(documentId, pageNumber)
                .orElseThrow(() -> new RuntimeException(String.format("Page %d not found for document ID %d", pageNumber, documentId)));
        page.setExtractedText(extractedTableContent);
        page.setHasTables(true);
        DocumentPage savedPage = documentPageRepository.save(page);

        // Identify which of the 8 UGC Table Specifications was extracted
        String tableType = identifyTableType(extractedTableContent);
        long totalDataRows = extractedTableContent != null ? extractedTableContent.lines()
                .filter(line -> line.trim().startsWith("|") && !line.contains("---") &&
                        !line.toLowerCase().contains("district |") &&
                        !line.toLowerCase().contains("uni-code |") &&
                        !line.toLowerCase().contains("university |") &&
                        !line.toLowerCase().contains("course of study |"))
                .count() : 0;

        if (tableType.contains("DISTRICT CUTOFF")) {
            Set<String> foundDistricts = extractDistrictsFromText(extractedTableContent);
            Map<String, Integer> courseCountPerDistrict = getCourseCountPerDistrict(extractedTableContent);
            log.info("Saved page {} [Type: {}] -> {} districts, {} courses/district, {} total rows for Document ID: {}",
                    pageNumber, tableType, foundDistricts.size(),
                    courseCountPerDistrict.values().stream().findFirst().orElse(0),
                    totalDataRows, documentId);
        } else {
            log.info("Saved page {} [Type: {}] -> {} structured rows for Document ID: {}",
                    pageNumber, tableType, totalDataRows, documentId);
        }

        return DocumentPageResponseDto.fromEntity(savedPage);
    }

    /**
     * Identifies which of the 8 UGC Table Specifications or handbook sections is present in extracted markdown
     */
    public static String identifyTableType(String content) {
        if (content == null || content.isBlank()) {
            return "GENERAL CONTENT / TEXT";
        }
        String lower = content.toLowerCase();

        // Extract first table header line if present for column inspection
        String headerLine = content.lines()
                .filter(l -> l.trim().startsWith("|") && !l.contains("---"))
                .findFirst()
                .orElse("")
                .toLowerCase();

        // 8. DISTRICT CUTOFF MARKS TABLE
        boolean hasCutoffKeyword = lower.contains("minimum z-score") || lower.contains("minimum 'z' - score") ||
                lower.contains("minimum 'z' score") || lower.contains("minimum z - score") ||
                lower.contains("cutoff mark") || lower.contains("cut-off mark") ||
                lower.contains("minimum marks for university admission") ||
                headerLine.contains("z-score") || headerLine.contains("cutoff");
        long decimalZScoreCount = Pattern.compile("[-+]?\\d\\.\\d{3,4}\\b").matcher(content).results().count();
        long nqcCount = Pattern.compile("(?i)\\b(NQC|N/A)\\b").matcher(content).results().count();

        boolean hasDistrictHeaderOrRows = headerLine.contains("district") ||
                (lower.contains("colombo") && lower.contains("gampaha") && lower.contains("kalutara") && (decimalZScoreCount >= 2 || nqcCount >= 2));

        if (hasDistrictHeaderOrRows && (decimalZScoreCount >= 2 || nqcCount >= 2 || hasCutoffKeyword)) {
            return "8. DISTRICT CUTOFF MARKS TABLE";
        }
        if (hasCutoffKeyword && (decimalZScoreCount >= 2 || nqcCount >= 2 || headerLine.contains("district"))) {
            return "8. DISTRICT CUTOFF MARKS TABLE";
        }
        if (decimalZScoreCount >= 5) {
            return "8. DISTRICT CUTOFF MARKS TABLE";
        }

        // 2. DISTRIBUTION OF PLACES (ANNEX B / UNIVERSITY-WISE INTAKE)
        if (!hasDistrictHeaderOrRows && decimalZScoreCount == 0 &&
                (lower.contains("distribution of the total number of places") ||
                lower.contains("distribution of places") ||
                lower.contains("annex (b)") || lower.contains("annex b") ||
                (headerLine.contains("university") && (headerLine.contains("intake") || headerLine.contains("places") || headerLine.contains("proposed") || headerLine.contains("no."))) ||
                ((lower.contains("medicine") || lower.contains("biological science")) && lower.contains("university of colombo") && (lower.contains("224") || lower.contains("155") || lower.contains("proposed") || lower.contains("places") || lower.contains("intake"))))) {
            return "2. DISTRIBUTION OF PLACES (ANNEX B / UNIVERSITY-WISE INTAKE)";
        }

        // 1. PLACES AVAILABLE FOR ADMISSION (PROPOSED INTAKE / ANNEX A)
        if (!hasDistrictHeaderOrRows && decimalZScoreCount == 0 &&
                (lower.contains("places available for admission") || lower.contains("proposed intake") ||
                lower.contains("annex (a)") || lower.contains("annex a") ||
                lower.contains("total proposed intake") || lower.contains("total intake") ||
                (headerLine.contains("course") && (headerLine.contains("intake") || headerLine.contains("places") || headerLine.contains("proposed"))) ||
                (headerLine.contains("code") && headerLine.contains("course") && headerLine.contains("intake")))) {
            return "1. PLACES AVAILABLE FOR ADMISSION (PROPOSED INTAKE / ANNEX A)";
        }

        // 6. G.C.E. (O/L) EXAMINATION REQUIREMENTS
        if (lower.contains("ordinary level") || lower.contains("o/l requirement") || lower.contains("g.c.e. (o/l)") ||
                headerLine.contains("sin. lang") || headerLine.contains("tam. lang") ||
                (headerLine.contains("eng.") && headerLine.contains("mat.") && headerLine.contains("sci.")) ||
                (lower.contains("sin. lang.") && lower.contains("tam. lang."))) {
            return "6. G.C.E. (O/L) EXAMINATION REQUIREMENTS";
        }

        // 5. SPECIAL ADMISSION / DIFFERENTLY ABLED CATEGORIES
        if (lower.contains("differently abled") || lower.contains("blind (braille)") || lower.contains("blind") ||
                lower.contains("braille") || lower.contains("special admission") || lower.contains("disabled categories")) {
            return "5. SPECIAL ADMISSION / DIFFERENTLY ABLED CATEGORIES";
        }

        // 4. MEDIUM OF INSTRUCTION
        if (lower.contains("medium of instruction") || headerLine.contains("medium of instruction") ||
                (lower.contains("sinhala") && lower.contains("tamil") && lower.contains("english") && lower.contains("medium"))) {
            return "4. MEDIUM OF INSTRUCTION";
        }

        // 3. UNI-CODES ASSIGNED FOR EACH COURSE OF STUDY
        if (headerLine.contains("uni - code") || headerLine.contains("uni-code") || headerLine.contains("unicode") ||
                headerLine.contains("uni code") || lower.contains("uni-codes assigned") || lower.contains("uni - codes assigned") ||
                (headerLine.contains("university") && headerLine.contains("course") && (lower.contains("001a") || lower.contains("012c") || lower.contains("013d")))) {
            return "3. UNI-CODES ASSIGNED FOR EACH COURSE OF STUDY";
        }

        // 7. REQUIREMENT TO PASS THE PRACTICAL/ APTITUDE TEST
        if (lower.contains("requirement to pass the practical") || lower.contains("aptitude test requirements") ||
                (headerLine.contains("aptitude") || (lower.contains("aptitude test") && !lower.contains("distribution of") && !lower.contains("proposed intake")))) {
            return "7. REQUIREMENT TO PASS THE PRACTICAL/ APTITUDE TEST";
        }

        if (content.lines().anyMatch(l -> l.trim().startsWith("|"))) {
            return "UGC HANDBOOK STRUCTURED TABLE";
        }

        return "UGC HANDBOOK COURSE DETAILS & GUIDELINES";
    }

    private static final int DEFAULT_MAX_PAGES = 25;
    private static final int BULK_CONCURRENCY = 3;
    private static final long PER_PAGE_TIMEOUT_SECONDS = 60;
    private static final long OVERALL_BULK_TIMEOUT_SECONDS = 240;

    @Override
    public List<DocumentPageResponseDto> extractAllTablesWithAi(Long documentId) {
        return extractAllTablesWithAi(documentId, DEFAULT_MAX_PAGES);
    }

    @Override
    public List<DocumentPageResponseDto> extractAllTablesWithAi(Long documentId, Integer maxPages) {
        int limit = (maxPages != null && maxPages > 0) ? maxPages : DEFAULT_MAX_PAGES;
        log.info("Starting concurrent bulk AI Table Extraction for Document ID: {} (Max Pages: {}, Concurrency: {})",
                documentId, limit, BULK_CONCURRENCY);

        List<DocumentPage> allPages = documentPageRepository.findByDocumentIdOrderByPageNumberAsc(documentId);
        List<DocumentPage> tablePages = allPages.stream()
                .filter(p -> Boolean.TRUE.equals(p.getHasTables()))
                .limit(limit)
                .toList();

        if (tablePages.isEmpty()) {
            log.info("No pages flagged with tables for document ID: {}, checking first {} pages...", documentId, limit);
            tablePages = allPages.stream().limit(limit).toList();
        }

        log.info("Processing {} table pages in parallel for Document ID: {}", tablePages.size(), documentId);

        // Controlled thread pool to respect Gemini API rate limits (max 3 concurrent calls)
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(
                Math.min(BULK_CONCURRENCY, Math.max(1, tablePages.size())));

        try {
            List<java.util.concurrent.CompletableFuture<Void>> futures = new ArrayList<>();

            for (DocumentPage tablePage : tablePages) {
                final int pageNum = tablePage.getPageNumber();
                java.util.concurrent.CompletableFuture<Void> future = java.util.concurrent.CompletableFuture.runAsync(() -> {
                    try {
                        log.info("Starting background AI extraction for Document ID: {} Page: {}", documentId, pageNum);
                        extractPageTableWithAi(documentId, pageNum);
                    } catch (Exception e) {
                        log.warn("Failed background AI extraction for page {} in Document ID {}: {}", pageNum, documentId, e.getMessage());
                    }
                }, executor);
                futures.add(future);
            }

            // Wait for all futures with overall timeout guard
            java.util.concurrent.CompletableFuture<Void> allOf = java.util.concurrent.CompletableFuture.allOf(
                    futures.toArray(new java.util.concurrent.CompletableFuture[0]));

            try {
                allOf.get(OVERALL_BULK_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
                log.info("All {} table pages successfully processed for Document ID: {}", tablePages.size(), documentId);
            } catch (java.util.concurrent.TimeoutException te) {
                log.warn("Bulk table extraction reached timeout ({}s) for Document ID: {}. Returning partial results.",
                        OVERALL_BULK_TIMEOUT_SECONDS, documentId);
            } catch (Exception ex) {
                log.warn("Exception during parallel bulk extraction for Document ID {}: {}", documentId, ex.getMessage());
            }

        } finally {
            executor.shutdown();
        }

        return documentPageRepository.findByDocumentIdOrderByPageNumberAsc(documentId).stream()
                .map(DocumentPageResponseDto::fromEntity)
                .toList();
    }

    @Override
    public String extractTableDirectly(byte[] pdfBytes, int pageNumber) {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            log.warn("Gemini API key not configured, skipping automatic AI table extraction.");
            return null;
        }

        try (PDDocument pdDocument = Loader.loadPDF(pdfBytes)) {
            if (pageNumber < 1 || pageNumber > pdDocument.getNumberOfPages()) {
                log.warn("Invalid page number {} for PDF with {} pages", pageNumber, pdDocument.getNumberOfPages());
                return null;
            }

            PDFRenderer renderer = new PDFRenderer(pdDocument);
            BufferedImage image = renderer.renderImageWithDPI(pageNumber - 1, 250, ImageType.RGB);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            String base64Image = Base64.getEncoder().encodeToString(baos.toByteArray());

            log.info("Auto-extracting table for page {} via Gemini Vision with pagination...", pageNumber);
            return extractTableWithPagination(base64Image, pageNumber);
        } catch (Exception e) {
            log.warn("Direct Gemini table extraction failed for page {}: {}", pageNumber, e.getMessage());
            return null;
        }
    }

    private static final List<List<String>> DISTRICT_GROUPS = List.of(
            // Chunk 1/5: Western + Central (5 Districts)
            List.of("COLOMBO", "GAMPAHA", "KALUTARA", "MATALE", "KANDY"),

            // Chunk 2/5: Central + Southern (5 Districts)
            List.of("NUWARA ELIYA", "GALLE", "MATARA", "HAMBANTOTA", "JAFFNA"),

            // Chunk 3/5: Northern + Eastern (5 Districts)
            List.of("KILINOCHCHI", "MANNAR", "MULLAITIVU", "VAVUNIYA", "TRINCOMALEE"),

            // Chunk 4/5: Eastern + North Western + North Central (5 Districts)
            List.of("BATTICALOA", "AMPARA", "PUTTALAM", "KURUNEGALA", "ANURADHAPURA"),

            // Chunk 5/5: North Central + Uva + Sabaragamuwa (5 Districts)
            List.of("POLONNARUWA", "BADULLA", "MONARAGALA", "KEGALLE", "RATNAPURA")
    );

    /**
     * ⭐ 2-pass extraction for page using 5-Chunk Strategy
     */
    private String extractTableWithPagination(String base64Image, int pageNumber) {
        log.info("Starting 2-pass 5-chunk extraction for page {}", pageNumber);

        // PASS 1: Extract all 3 chunks
        List<String> extractedParts = new ArrayList<>();
        Set<String> foundDistricts = new HashSet<>();

        for (int groupIndex = 0; groupIndex < DISTRICT_GROUPS.size(); groupIndex++) {
            List<String> districtsInGroup = DISTRICT_GROUPS.get(groupIndex);
            int part = groupIndex + 1;
            int totalParts = DISTRICT_GROUPS.size();

            try {
                log.info("Extracting districts {} (Chunk {}/{}) for page {}",
                        districtsInGroup, part, totalParts, pageNumber);

                String partResult = callGeminiWithRetry(
                        base64Image, pageNumber, districtsInGroup, part, totalParts);

                extractedParts.add(partResult);

                // Track found districts
                extractDistrictsFromText(partResult).forEach(foundDistricts::add);

                Thread.sleep(500);

            } catch (Exception e) {
                log.error("Chunk {} failed: {}", part, e.getMessage());
                extractedParts.add("");
            }
        }

        log.info("Pass 1 completed. Found {}/25 districts: {}",
                foundDistricts.size(), foundDistricts);

        // PASS 2: Extract missing districts individually
        Set<String> allExpectedDistricts = new HashSet<>(ALL_EXPECTED_DISTRICTS);
        allExpectedDistricts.removeAll(foundDistricts);

        if (!allExpectedDistricts.isEmpty()) {
            log.warn("Pass 2: Extracting {} missing districts individually: {}",
                    allExpectedDistricts.size(), allExpectedDistricts);

            String missingResults = extractMissingDistricts(
                    base64Image, pageNumber, new ArrayList<>(allExpectedDistricts));

            if (missingResults != null && !missingResults.isBlank()) {
                extractedParts.add(missingResults);
            }
        } else {
            log.info("✅ All districts found in Pass 1! No need for Pass 2.");
        }

        // Combine all parts
        String combinedResult = combineExtractedParts(extractedParts, extractedParts.size());

        // ✅ FINAL VALIDATION
        validateAllDistrictsPresent(combinedResult, null, pageNumber);

        return combinedResult;
    }

    /**
     * ⭐ Extract missing districts individually with retry queue tracking on 429 rate limit
     */
    private String extractMissingDistricts(String base64Image, int pageNumber, List<String> missingDistricts) {
        StringBuilder allResults = new StringBuilder();
        List<String> failedDistricts = new ArrayList<>();

        for (int i = 0; i < missingDistricts.size(); i++) {
            String district = missingDistricts.get(i);

            try {
                log.info("Extracting district {}/{}: {}", i + 1, missingDistricts.size(), district);

                String result = extractSingleDistrict(base64Image, pageNumber, district);
                if (result != null && !result.isBlank() && !result.startsWith("[")) {
                    allResults.append(result).append("\n");
                }

                // 2 second delay between EVERY district API call to prevent rate limit
                log.info("Waiting 2 seconds before next district (Rate limit prevention)...");
                Thread.sleep(2000);

            } catch (IllegalStateException e) {
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.error("Rate limit hit during district extraction. Adding remaining districts to retry queue.");
                    failedDistricts.add(district);
                    if (i + 1 < missingDistricts.size()) {
                        failedDistricts.addAll(missingDistricts.subList(i + 1, missingDistricts.size()));
                    }
                    break; // Stop processing to allow API quota to cool down
                } else {
                    failedDistricts.add(district);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted during missing districts extraction", ie);
            } catch (Exception e) {
                log.error("Failed to extract district {}: {}", district, e.getMessage());
                failedDistricts.add(district);
            }
        }

        // Save failed districts for background retry queue
        if (!failedDistricts.isEmpty()) {
            log.warn("Saving {} failed districts to retry queue for page {}: {}",
                    failedDistricts.size(), pageNumber, failedDistricts);
            saveToRetryQueue(pageNumber, failedDistricts);
        }

        return allResults.toString().trim();
    }

    private void saveToRetryQueue(int pageNumber, List<String> failedDistricts) {
        log.info("Registered {} districts for page {} in background retry queue: {}",
                failedDistricts.size(), pageNumber, failedDistricts);
    }

    private String normalizeDistrictName(String rawDistrict) {
        if (rawDistrict == null || rawDistrict.isBlank()) {
            return "";
        }
        String d = rawDistrict.trim().toUpperCase()
                .replaceAll("[^A-Z ]", "")
                .trim();

        if (d.startsWith("KEGAL") || d.equals("KEGALLA") || d.equals("KEGALLE") || d.equals("KEG")) {
            return "KEGALLE";
        }
        if (d.startsWith("RATNA") || d.startsWith("RATHNA") || d.contains("NAPURA") || d.equals("RATNA") || d.equals("RATHNA")) {
            return "RATNAPURA";
        }
        if (d.startsWith("KURUNE") || d.startsWith("KURU") || d.contains("NEGALA")) {
            return "KURUNEGALA";
        }
        if (d.startsWith("NUWARA") || d.contains("ELIYA") || d.equals("NELIYA")) {
            return "NUWARA ELIYA";
        }
        if (d.startsWith("KILINOCH") || d.startsWith("KILINO")) {
            return "KILINOCHCHI";
        }
        if (d.startsWith("MULLAI") || d.contains("TIVU")) {
            return "MULLAITIVU";
        }
        if (d.startsWith("MONARA") || d.contains("GALA")) {
            return "MONARAGALA";
        }
        if (d.startsWith("POLONNA") || d.contains("RUWA") || d.startsWith("POLON")) {
            return "POLONNARUWA";
        }
        if (d.startsWith("ANURADHA") || d.contains("PURA") || d.startsWith("ANURA")) {
            return "ANURADHAPURA";
        }
        if (d.startsWith("TRINCO") || d.contains("MALEE")) {
            return "TRINCOMALEE";
        }
        if (d.startsWith("BATTICA") || d.contains("LOA") || d.startsWith("BATTI")) {
            return "BATTICALOA";
        }
        if (d.startsWith("HAMBAN") || d.contains("TOTA") || d.startsWith("HAMBA")) {
            return "HAMBANTOTA";
        }

        for (String expected : ALL_EXPECTED_DISTRICTS) {
            if (d.equalsIgnoreCase(expected) || d.contains(expected) || expected.contains(d)) {
                return expected;
            }
        }
        return d;
    }

    private Set<String> extractDistrictsFromText(String text) {
        Set<String> districts = new HashSet<>();
        if (text == null || text.isBlank()) {
            return districts;
        }

        text.lines()
                .filter(line -> line.trim().startsWith("|"))
                .filter(line -> !line.contains("District") && !line.contains("---"))
                .forEach(line -> {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 2) {
                        String rawDistrict = cells[1].trim();
                        String normalized = normalizeDistrictName(rawDistrict);
                        if (!normalized.isBlank() && ALL_EXPECTED_DISTRICTS.contains(normalized)) {
                            districts.add(normalized);
                        }
                    }
                });

        return districts;
    }

    /**
     * ⭐ Extract a single district's cutoff rows with exponential backoff on 429 rate limit
     */
    private String extractSingleDistrict(String base64Image, int pageNumber, String district) {
        int maxRetries = 5;
        long delayMs = 3000; // 3 seconds initial backoff

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                log.info("Extracting district {} (Attempt {}/{}) for page {}", district, attempt, maxRetries, pageNumber);

                String prompt = String.format("""
                    You are an expert OCR table extractor specialized in UGC Sri Lanka University Admission Handbooks and Cutoff Documents.

                    Extract cutoff marks for THIS DISTRICT ONLY: %s
                    (Important column aliases in UGC Handbooks:
                     - For RATNAPURA: Column header may be printed as 'RATNAPURA' / 'RATHNAPURA' / 'RATNA.'. Output district as 'RATNAPURA'.
                     - For KURUNEGALA: Column header may be printed as 'KURUNEGALA' / 'KURU.' / 'KURUN.'. Output district as 'KURUNEGALA'.
                     - For KEGALLE: Column header may be printed as 'KEGALLA' / 'KEGALLE' / 'KEG.'. Output district as 'KEGALLE'.
                     Extract this district column and label the District column as '%s').

                    TABLE FORMAT:
                    | District | Course of Study | University | Minimum Z-Score / Cutoff |

                    Extract ALL courses and universities visible on this page for district: %s

                    Rules:
                    1. DO NOT include other districts. ONLY extract rows for %s.
                    2. Do NOT include table headers, markdown fences (no ```), or intro text.
                    3. Return ONLY data rows starting with `|`.
                    4. Include all rows even if cutoff is 'NQC', '-', or blank.
                    """, district, district, district, district);

                return callGeminiVisionWithCustomPrompt(base64Image, pageNumber, prompt);

            } catch (IllegalStateException e) {
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.warn("Rate limit hit for {}. Attempt {}/{}. Waiting {}ms...",
                            district, attempt, maxRetries, delayMs);

                    try {
                        Thread.sleep(delayMs);
                        delayMs *= 2; // Exponential backoff: 3s, 6s, 12s, 24s, 48s
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during rate limit backoff", ie);
                    }

                } else {
                    // Other errors - don't retry
                    throw e;
                }
            }
        }

        throw new RuntimeException("Max retries exceeded for district: " + district);
    }

    /**
     * ⭐ Call Gemini Vision with specific Province District list
     */
    private String callGeminiVisionWithDistricts(String base64Image, int pageNumber,
                                                List<String> districts, int part, int totalParts) {
        // STEP 1: Check quota BEFORE making API call
        if (!quotaManager.canMakeRequest()) {
            throw new RuntimeException("Daily API quota exceeded. Please try again tomorrow or upgrade your plan.");
        }

        String prompt = String.format("""
            You are an expert OCR table extractor specialized in UGC Sri Lanka University Admission Handbooks and Cutoff Documents.

            CRITICAL PROVINCE GROUP EXTRACTION (Part %d of %d):
            You MUST extract ALL course and university columns visible on this page ONLY for the following specific districts:
            %s

            Format as standard 4-column Markdown rows:
            `| District | Course of Study | University | Minimum Z-Score / Cutoff |`

            Rules:
            1. Extract ALL courses & universities on this page for EVERY one of the listed districts (%s).
            2. Special column aliases:
               - For RATNAPURA: Column header may be printed as 'RATNAPURA' / 'RATHNAPURA' / 'RATNA.'. Output district as 'RATNAPURA'.
               - For KURUNEGALA: Column header may be printed as 'KURUNEGALA' / 'KURU.' / 'KURUN.'. Output district as 'KURUNEGALA'.
               - For KEGALLE: Column header may be printed as 'KEGALLA' / 'KEGALLE' / 'KEG.'. Output district as 'KEGALLE'.
            3. Do NOT include table headers or markdown code fences (no ```).
            4. Return ONLY data rows starting with `|`.
            5. If a cutoff mark is 'NQC', '-', or blank, still include the row with that value.
            6. Do NOT extract districts that are not in this group.
            """, part, totalParts, String.join(", ", districts), String.join(", ", districts));

        return callGeminiVisionWithCustomPrompt(base64Image, pageNumber, prompt);
    }

    /**
     * ⭐ Call Gemini with retry and exponential backoff on 429 rate limit
     */
    private String callGeminiWithRetry(String base64Image, int pageNumber, List<String> districts, int part, int totalParts) {
        int maxRetries = 3;
        long backoffMs = 1000; // 1 second

        for (int i = 0; i < maxRetries; i++) {
            try {
                return callGeminiVisionWithDistricts(base64Image, pageNumber, districts, part, totalParts);
            } catch (IllegalStateException e) {
                if (e.getMessage() != null && e.getMessage().contains("429")) {
                    log.warn("Rate limit hit (429) for page {} part {}/{}. Retrying in {}ms (attempt {}/{})...",
                            pageNumber, part, totalParts, backoffMs, i + 1, maxRetries);
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during rate limit backoff", ie);
                    }
                    backoffMs *= 2; // Exponential backoff: 1s, 2s, 4s
                } else {
                    throw e; // Other auth errors - don't retry
                }
            } catch (Exception e) {
                if (i == maxRetries - 1) {
                    throw e;
                }
                log.warn("Attempt {}/{} failed for page {} part {}/{}: {}. Retrying in {}ms...",
                        i + 1, maxRetries, pageNumber, part, totalParts, e.getMessage(), backoffMs);
                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during backoff", ie);
                }
                backoffMs *= 2;
            }
        }

        throw new RuntimeException("Max retries exceeded due to rate limits for page " + pageNumber + " part " + part);
    }

    // Approved clean model list for table extraction (hierarchical fallback with rate limit tiers)
    private static final List<String> APPROVED_MODELS = List.of(
            "gemini-3.5-flash-lite",   // 🥇 Primary: 15 RPM, 500 RPD
            "gemini-3.1-flash-lite",   // 🥈 Fallback: 15 RPM, 500 RPD
            "gemini-3.6-flash",        // 🥉 Difficult chunk fallback only: 5 RPM, 20 RPD
            "gemini-3.5-flash",        // 4️⃣ Difficult chunk fallback only: 5 RPM, 20 RPD
            "gemini-2.0-flash",        // 🛡️ Safety fallback
            "gemini-1.5-flash"         // 🛡️ Safety fallback
    );

    /**
     * ⭐ Core method: Call Gemini Vision with custom prompt and approved models fallback
     */
    private String callGeminiVisionWithCustomPrompt(String base64Image, int pageNumber, String prompt) {
        // Check quota BEFORE making API call
        if (!quotaManager.canMakeRequest()) {
            throw new RuntimeException("Daily API quota exceeded. Please try again tomorrow or upgrade your plan.");
        }

        log.info("Sending page {} image to Google Gemini Vision API...", pageNumber);

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt),
                                    Map.of("inlineData", Map.of(
                                            "mimeType", "image/png",
                                            "data", base64Image
                                    ))
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.0,
                            "maxOutputTokens", 8192
                    )
            );

            String requestJson = objectMapper.writeValueAsString(requestBody);
            String cleanKey = geminiApiKey.trim();

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .build();

            String lastError = "";
            for (String modelName : APPROVED_MODELS) {
                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + modelName + ":generateContent";
                try {
                    String url = endpoint + "?key=" + cleanKey;
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Content-Type", "application/json")
                            .header("x-goog-api-key", cleanKey)
                            .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                            .timeout(Duration.ofSeconds(120))
                            .build();

                    HttpResponse<String> response = client.send(
                            request, HttpResponse.BodyHandlers.ofString());
                    int statusCode = response.statusCode();

                    if (statusCode >= 200 && statusCode < 300) {
                        JsonNode root = objectMapper.readTree(response.body());
                        JsonNode candidates = root.path("candidates");
                        if (candidates.isArray() && !candidates.isEmpty()) {
                            JsonNode textNode = candidates.get(0)
                                    .path("content")
                                    .path("parts")
                                    .get(0)
                                    .path("text");
                            String resultText = textNode.asText().trim();
                            log.info("Gemini Vision successfully extracted {} chars using model '{}'",
                                    resultText.length(), modelName);

                            // Increment quota counter upon successful extraction
                            quotaManager.incrementUsage();

                            return cleanMarkdownFences(resultText);
                        }
                    }

                    // Error handling
                    if (statusCode == 401 || statusCode == 403) {
                        log.error("Gemini API key is invalid or unauthorized (Status {})", statusCode);
                        throw new IllegalStateException(
                                "Gemini API Authentication Failed (" + statusCode + ")");
                    }

                    if (statusCode == 429) {
                        log.warn("Gemini API Quota / Rate Limit exceeded (429)");
                        throw new IllegalStateException(
                                "Gemini API Rate Limit / Quota Exceeded (Status 429)");
                    }

                    lastError = String.format("Status %d for '%s': %s",
                            statusCode, modelName, response.body());
                    log.info("Gemini model '{}' returned {}. Skipping to next model...",
                            modelName, statusCode);

                } catch (IllegalStateException e) {
                    throw e;
                } catch (Exception modelEx) {
                    lastError = modelEx.getMessage();
                    log.warn("Exception calling Gemini model '{}': {}", modelName, lastError);
                }
            }

            log.error("All Gemini extraction models failed for page {}", pageNumber);
            throw new RuntimeException("Gemini Vision API error: " + lastError);

        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to extract table for page {} via Gemini API: {}",
                    pageNumber, e.getMessage(), e);
            throw new RuntimeException("AI Table Extraction failed for page " + pageNumber + ": " + e.getMessage(), e);
        }
    }

    private static final List<String> ALL_EXPECTED_DISTRICTS = List.of(
            "COLOMBO", "GAMPAHA", "KALUTARA", "MATALE", "KANDY", "NUWARA ELIYA",
            "GALLE", "MATARA", "HAMBANTOTA", "JAFFNA", "KILINOCHCHI", "MANNAR",
            "MULLAITIVU", "VAVUNIYA", "TRINCOMALEE", "BATTICALOA", "AMPARA",
            "PUTTALAM", "KURUNEGALA", "ANURADHAPURA", "POLONNARUWA",
            "BADULLA", "MONARAGALA", "KEGALLE", "RATNAPURA"
    );

    /**
     * ⭐ Helper to combine paginated table parts cleanly into a single Markdown table/document
     */
    private String combineExtractedParts(List<String> parts, int totalParts) {
        if (parts == null || parts.isEmpty()) {
            return "";
        }

        log.info("Combining {} extracted parts...", parts.size());

        StringBuilder combined = new StringBuilder();

        // Add header row (only once, at the beginning)
        combined.append("| District | Course of Study | University | Minimum Z-Score / Cutoff |\n");
        combined.append("|----------|----------------|------------|--------------------------|\n");

        // Add rows from each part
        for (int i = 0; i < parts.size(); i++) {
            String part = parts.get(i);
            if (part == null || part.isBlank() || (part.startsWith("[PART ") && part.endsWith("EXTRACTION FAILED]"))) {
                continue;
            }

            String cleanedPart = cleanMarkdownFences(part);

            // Remove any header rows from parts (if Gemini included them)
            List<String> lines = cleanedPart.lines()
                    .filter(line -> !line.trim().startsWith("| District") &&
                            !line.trim().startsWith("| Course") &&
                            !line.trim().startsWith("| Uni") &&
                            !line.trim().startsWith("|----------") &&
                            !line.trim().startsWith("|:--") &&
                            !line.trim().startsWith("| ---"))
                    .filter(line -> !line.trim().isEmpty())
                    .toList();

            for (String line : lines) {
                // Validate it's a data row (starts with | and contains data)
                if (line.trim().startsWith("|") && line.contains("|")) {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 2) {
                        String rawDistrict = cells[1].trim();
                        String normalized = normalizeDistrictName(rawDistrict);
                        if (!normalized.isBlank() && ALL_EXPECTED_DISTRICTS.contains(normalized)) {
                            cells[1] = " " + normalized + " ";
                            combined.append(String.join("|", cells)).append("\n");
                            continue;
                        }
                    }
                    combined.append(line.trim()).append("\n");
                }
            }

            log.info("Part {}/{} added {} rows to combined table",
                    i + 1, totalParts,
                    cleanedPart.lines()
                            .filter(line -> line.trim().startsWith("|") && !line.contains("District") && !line.contains("---"))
                            .count());
        }

        String result = combined.toString().trim();
        log.info("Combined table has {} lines", result.lines().count());

        // VALIDATION: Check if all 25 districts are present
        Set<String> foundDistricts = new HashSet<>();
        result.lines()
                .filter(line -> line.trim().startsWith("|") && !line.contains("District") && !line.contains("---"))
                .forEach(line -> {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 2) {
                        String rawDistrict = cells[1].trim();
                        String normalized = normalizeDistrictName(rawDistrict);
                        if (!normalized.isBlank() && ALL_EXPECTED_DISTRICTS.contains(normalized)) {
                            foundDistricts.add(normalized);
                        }
                    }
                });

        // Check missing districts
        Set<String> missingDistricts = new HashSet<>(ALL_EXPECTED_DISTRICTS);
        missingDistricts.removeAll(foundDistricts);

        if (!missingDistricts.isEmpty()) {
            log.warn(" MISSING DISTRICTS in extracted table: {}", missingDistricts);
            log.info("Found districts ({}): {}", foundDistricts.size(), foundDistricts);
            log.info("Total data rows: {}", Math.max(0, result.lines().count() - 2)); // minus header
        } else {
            log.info("All {} expected districts found successfully!", foundDistricts.size());
        }

        return result;
    }

    /**
     * Validate that all 25 districts exist in extracted table
     */
    private void validateAllDistrictsPresent(String extractedTable, Long documentId, Integer pageNumber) {
        log.info("Validating all 25 districts present for Document ID: {} Page: {}", documentId, pageNumber);

        if (extractedTable == null || extractedTable.isBlank()) {
            throw new MissingDistrictsException(
                    String.format("Missing all 25 districts on page %d: Extracted content is empty", pageNumber),
                    new ArrayList<>(ALL_EXPECTED_DISTRICTS)
            );
        }

        // Extract all districts from table
        Set<String> foundDistricts = new HashSet<>();

        extractedTable.lines()
                .filter(line -> line.trim().startsWith("|"))
                .filter(line -> !line.contains("District")) // Skip header
                .filter(line -> !line.contains("WARNING"))  // Skip warning messages
                .forEach(line -> {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 2) {
                        String rawDistrict = cells[1].trim();
                        String normalized = normalizeDistrictName(rawDistrict);
                        if (!normalized.isBlank() && ALL_EXPECTED_DISTRICTS.contains(normalized)) {
                            foundDistricts.add(normalized);
                        }
                    }
                });

        // Find missing districts
        Set<String> missingDistricts = new HashSet<>(ALL_EXPECTED_DISTRICTS);
        missingDistricts.removeAll(foundDistricts);

        // Log results
        log.info("Page {} validation: Found {}/25 districts", pageNumber, foundDistricts.size());

        if (missingDistricts.isEmpty()) {
            log.info("SUCCESS: All 25 districts found on page {}!", pageNumber);
            log.info("Districts: {}", foundDistricts);
        } else {
            log.error("FAILED: {} districts missing on page {}", missingDistricts.size(), pageNumber);
            log.error("Missing districts: {}", missingDistricts);
            log.error("Found districts ({}): {}", foundDistricts.size(), foundDistricts);

            // Throw exception to trigger retry
            throw new MissingDistrictsException(
                    String.format("Missing %d districts on page %d: %s",
                            missingDistricts.size(), pageNumber, missingDistricts),
                    new ArrayList<>(missingDistricts)
            );
        }
    }

    /**
     * Validate that all districts have the same number of courses
     */
    private void validateCourseCountPerDistrict(String extractedTable, Long documentId, Integer pageNumber) {
        log.info("Validating course count per district for Document ID: {} Page: {}", documentId, pageNumber);

        if (extractedTable == null || extractedTable.isBlank()) {
            throw new ValidationException("No courses found in extracted table (content is empty)");
        }

        // Map: District -> List of courses
        Map<String, List<String>> districtCourses = new HashMap<>();

        // Parse table
        extractedTable.lines()
                .filter(line -> line.trim().startsWith("|"))
                .filter(line -> !line.contains("District") && !line.contains("---")) // Skip header & divider
                .filter(line -> !line.contains("WARNING"))  // Skip warnings
                .forEach(line -> {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 3) {
                        String rawDistrict = cells[1].trim();
                        String normalized = normalizeDistrictName(rawDistrict);
                        String course = cells[2].trim();

                        if (!normalized.isBlank() && ALL_EXPECTED_DISTRICTS.contains(normalized) && !course.isBlank()) {
                            districtCourses.computeIfAbsent(normalized, k -> new ArrayList<>())
                                    .add(course);
                        }
                    }
                });

        // Find expected course count (median or most common)
        List<Integer> courseCounts = districtCourses.values().stream()
                .map(List::size)
                .sorted()
                .toList();

        if (courseCounts.isEmpty()) {
            log.error("No courses found in table!");
            throw new ValidationException("No courses found in extracted table");
        }

        // Use median as expected count
        int medianIndex = courseCounts.size() / 2;
        int expectedCourseCount = courseCounts.get(medianIndex);

        log.info("Expected course count per district: {}", expectedCourseCount);

        // Find districts with wrong course count
        Map<String, Integer> districtsWithWrongCount = new HashMap<>();

        for (Map.Entry<String, List<String>> entry : districtCourses.entrySet()) {
            String district = entry.getKey();
            int actualCount = entry.getValue().size();

            if (actualCount != expectedCourseCount) {
                districtsWithWrongCount.put(district, actualCount);
                log.warn("District {} has {} courses (expected: {})",
                        district, actualCount, expectedCourseCount);
            }
        }

        // Check for missing districts
        Set<String> foundDistricts = districtCourses.keySet();
        Set<String> missingDistricts = new HashSet<>(ALL_EXPECTED_DISTRICTS);
        missingDistricts.removeAll(foundDistricts);

        // Final validation
        if (!missingDistricts.isEmpty()) {
            log.error("FAILED: {} districts missing", missingDistricts.size());
            log.error("Missing districts: {}", missingDistricts);
            throw new MissingDistrictsException(
                    String.format("Missing %d districts on page %d: %s", missingDistricts.size(), pageNumber, missingDistricts),
                    new ArrayList<>(missingDistricts)
            );
        }

        if (!districtsWithWrongCount.isEmpty()) {
            log.error("FAILED: {} districts have wrong course count", districtsWithWrongCount.size());
            log.error("Districts with wrong count: {}", districtsWithWrongCount);
            throw new CourseCountMismatchException(
                    String.format("%d districts have wrong course count: %s",
                            districtsWithWrongCount.size(), districtsWithWrongCount),
                    districtsWithWrongCount
            );
        }

        log.info("SUCCESS: All {} districts have {} courses each!",
                foundDistricts.size(), expectedCourseCount);
    }

    /**
     * Validate total row count within expected boundaries
     */
    private void validateTotalRowCount(String extractedTable, Long documentId, Integer pageNumber) {
        if (extractedTable == null || extractedTable.isBlank()) return;

        long totalRows = extractedTable.lines()
                .filter(line -> line.trim().startsWith("|"))
                .filter(line -> !line.contains("District") && !line.contains("---"))
                .filter(line -> !line.contains("WARNING"))
                .count();

        // Expected: 25 districts × ~50 courses = ~1250 rows
        int expectedMinRows = 1000;
        int expectedMaxRows = 1500;

        if (totalRows < expectedMinRows || totalRows > expectedMaxRows) {
            log.warn("Total rows ({}) outside typical expected range ({}-{}) for page {}",
                    totalRows, expectedMinRows, expectedMaxRows, pageNumber);
        } else {
            log.info("Total rows: {} (within expected range) for page {}", totalRows, pageNumber);
        }
    }

    /**
     * Complete validation: Districts + Course Count + Total Rows
     */
    private void validateExtractedTable(String extractedTable, Long documentId, Integer pageNumber) {
        log.info("Starting complete validation for Document ID: {} Page: {}", documentId, pageNumber);

        try {
            // Validation 1: All 25 districts present
            validateAllDistrictsPresent(extractedTable, documentId, pageNumber);

            // Validation 2: All districts have same course count
            validateCourseCountPerDistrict(extractedTable, documentId, pageNumber);

            // Validation 3: Total rows check
            validateTotalRowCount(extractedTable, documentId, pageNumber);

            log.info("ALL VALIDATIONS PASSED for page {}", pageNumber);

        } catch (MissingDistrictsException | CourseCountMismatchException | ValidationException e) {
            log.error("VALIDATION FAILED for page {}: {}", pageNumber, e.getMessage());
            throw e;
        }
    }

    private Map<String, Integer> getCourseCountPerDistrict(String extractedTable) {
        if (extractedTable == null || extractedTable.isBlank()) return Map.of();
        Map<String, Set<String>> districtCourses = new HashMap<>();

        extractedTable.lines()
                .filter(line -> line.trim().startsWith("|"))
                .filter(line -> !line.contains("District") && !line.contains("---"))
                .forEach(line -> {
                    String[] cells = line.split("\\|");
                    if (cells.length >= 3) {
                        String district = cells[1].trim().toUpperCase();
                        String course = cells[2].trim();

                        if (!district.isBlank() && !course.isBlank()) {
                            districtCourses.computeIfAbsent(district, k -> new HashSet<>())
                                    .add(course);
                        }
                    }
                });

        return districtCourses.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().size()
                ));
    }

    private String cleanMarkdownFences(String text) {
        if (text == null) return "";
        String cleaned = text.trim();
        if (cleaned.startsWith("```markdown")) {
            cleaned = cleaned.substring("```markdown".length());
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
