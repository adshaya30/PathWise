package com.pathwise.admin.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.service.PdfExtractionService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PdfExtractionServiceImpl implements PdfExtractionService {

    @Override
    public List<DocumentPage> extractPages(InputStream pdfStream, Document document) throws IOException {
        Objects.requireNonNull(pdfStream, "pdfStream must not be null");
        Objects.requireNonNull(document, "document must not be null");

        try (PDDocument pdDocument = Loader.loadPDF(new RandomAccessReadBuffer(pdfStream))) {
            return extractPages(pdDocument, document);
        } catch (Exception e) {
            log.error("Error during PDFBox text extraction from stream: {}", e.getMessage(), e);
            throw new IOException("Failed to extract text from PDF stream: " + e.getMessage(), e);
        }
    }

    @Override
    public List<DocumentPage> extractPages(byte[] pdfBytes, Document document) throws IOException {
        Objects.requireNonNull(pdfBytes, "pdfBytes must not be null");
        Objects.requireNonNull(document, "document must not be null");

        if (pdfBytes.length == 0) {
            throw new IOException("PDF content is empty");
        }

        try (PDDocument pdDocument = Loader.loadPDF(pdfBytes)) {
            return extractPages(pdDocument, document);
        } catch (Exception e) {
            log.error("Error during PDFBox text extraction: {}", e.getMessage(), e);
            throw new IOException("Failed to extract text from PDF: " + e.getMessage(), e);
        }
    }

    private List<DocumentPage> extractPages(PDDocument pdDocument, Document document) throws IOException {
        Objects.requireNonNull(pdDocument, "pdDocument must not be null");
        Objects.requireNonNull(document, "document must not be null");

        List<DocumentPage> pages = new ArrayList<>();
        int totalPages = pdDocument.getNumberOfPages();
        log.info("PDF loaded successfully for document '{}' (ID: {}). Total pages to extract: {}",
                document.getTitle(), document.getId(), totalPages);

        document.setTotalPages(totalPages);

        PDFTextStripper textStripper = new PDFTextStripper();
        textStripper.setSortByPosition(true); // Preserve visual layout reading order

        LocalDateTime extractedAt = LocalDateTime.now();

        for (int pageNum = 1; pageNum <= totalPages; pageNum++) {
            textStripper.setStartPage(pageNum);
            textStripper.setEndPage(pageNum);

            String rawText = textStripper.getText(pdDocument);
            String cleanedText = cleanExtractedText(rawText);
            boolean hasTables = detectTables(cleanedText);

            DocumentPage page = DocumentPage.builder()
                    .document(document)
                    .pageNumber(pageNum)
                    .extractedText(cleanedText.isEmpty() ? "[Blank or Scanned Image Page - No Extractable Text]" : cleanedText)
                    .hasTables(hasTables)
                    .createdAt(extractedAt)
                    .build();

            pages.add(page);

            if (pageNum % 25 == 0 || pageNum == totalPages) {
                log.info("Extracted {} / {} pages for document '{}'", pageNum, totalPages, document.getTitle());
            }
        }

        log.info("Completed extraction of {} pages successfully for document '{}'.", totalPages, document.getTitle());
        return pages;
    }

    @Override
    public int getPageCount(byte[] pdfBytes) throws IOException {
        Objects.requireNonNull(pdfBytes, "pdfBytes must not be null");
        if (pdfBytes.length == 0) {
            throw new IOException("PDF content is empty");
        }

        try (PDDocument pdDocument = Loader.loadPDF(pdfBytes)) {
            return pdDocument.getNumberOfPages();
        }
    }

    /**
     * Cleans extracted text: normalizes line endings and removes non-printable control characters
     */
    private String cleanExtractedText(String text) {
        if (text == null) return "";
        return text
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "") // Remove non-printable control characters
                .trim();
    }

    // Patterns for UGC-specific table detection
    private static final Pattern UNI_CODE_PATTERN = Pattern.compile("\\b\\d{3}[A-Z]\\b");
    private static final Pattern Z_SCORE_PATTERN = Pattern.compile("\\b\\d\\.\\d{3,4}\\b");
    private static final Pattern INTAKE_PATTERN = Pattern.compile("^\\s*\\d{2,3}\\s+[A-Za-z].*?\\b\\d{1,4}\\s*$");
    private static final Pattern GRADE_PATTERN = Pattern.compile("\\b[A-CS]\\b");
    private static final Pattern DISTRICT_PATTERN = Pattern.compile(
        "(?i)\\b(COLOMBO|GAMPAHA|KALUTARA|MATALE|KANDY|NUWARA ELIYA|GALLE|MATARA|HAMBANTOTA|" +
        "JAFFNA|KILINOCHCHI|MANNAR|MULLAITIVU|VAVUNIYA|TRINCOMALEE|BATTICALOA|AMPARA|" +
        "PUTTALAM|KURUNEGALA|ANURADHAPURA|POLONNARUWA|BADULLA|MONARAGALA|KEGALLE|RATNAPURA)\\b"
    );

    /**
     * Strictly checks if the page content contains authentic tabular data using UGC-specific heuristics and scoring.
     */
    private boolean detectTables(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }

        List<String> lines = text.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .toList();

        int tableScore = 0;

        // === 1. Markdown Table Structure (already extracted) ===
        long markdownTableRows = lines.stream()
                .filter(line -> line.startsWith("|") && line.endsWith("|"))
                .count();
        if (markdownTableRows >= 3) {
            return true; // Already a table
        }

        // === 2. Cutoff Matrix (District Z-Scores) ===
        // Look for multiple Z-scores per line + district names
        long zScoreLines = lines.stream()
                .filter(line -> {
                    long zScoreCount = Z_SCORE_PATTERN.matcher(line).results().count();
                    return zScoreCount >= 2;
                })
                .count();

        boolean hasDistrict = DISTRICT_PATTERN.matcher(text).find();
        if (zScoreLines >= 3 && hasDistrict) {
            tableScore += 4; // High confidence for cutoff matrix
        }

        // === 3. Proposed Intake Tables (Annex A & B) ===
        // Pattern: "Code + Course Name + Number" e.g., "001 Medicine 2095"
        long intakeRows = lines.stream()
                .filter(line -> INTAKE_PATTERN.matcher(line).matches())
                .count();

        boolean hasIntakeHeading = text.toLowerCase().contains("places available for admission") ||
                                   text.toLowerCase().contains("proposed intake") ||
                                   text.toLowerCase().contains("annex a") ||
                                   text.toLowerCase().contains("annex b");

        if (intakeRows >= 4 && hasIntakeHeading) {
            tableScore += 3;
        }

        // === 4. Uni-Codes Table ===
        // Pattern: Multiple lines with uni-codes like "001A", "019B"
        long uniCodeRows = lines.stream()
                .filter(line -> UNI_CODE_PATTERN.matcher(line).find() &&
                               !line.startsWith("(") &&
                               !line.toLowerCase().contains("section"))
                .count();

        boolean hasUniCodeHeading = text.toLowerCase().contains("uni-codes assigned") ||
                                    (text.toLowerCase().contains("course of study") &&
                                     text.toLowerCase().contains("university"));

        if (uniCodeRows >= 4 && hasUniCodeHeading) {
            tableScore += 3;
        }

        // === 5. G.C.E. O/L Requirements ===
        // Pattern: Contains subject columns (Eng, Mat, Sci) with letter grades
        boolean hasOlHeading = text.toLowerCase().contains("ordinary level") ||
                              (text.contains("Eng.") && text.contains("Mat.") && text.contains("Sci."));

        long olGradeRows = lines.stream()
                .filter(line -> {
                    boolean hasUniCode = UNI_CODE_PATTERN.matcher(line).find();
                    boolean hasGrade = GRADE_PATTERN.matcher(line).find();
                    return hasUniCode && hasGrade;
                })
                .count();

        if (hasOlHeading && olGradeRows >= 3) {
            tableScore += 3;
        }

        // === 6. Special Admission / Differently Abled ===
        boolean hasSpecialHeading = text.toLowerCase().contains("differently abled") ||
                                   text.toLowerCase().contains("blind (braille)") ||
                                   text.toLowerCase().contains("special admission");

        if (hasSpecialHeading && uniCodeRows >= 2) {
            tableScore += 3;
        }

        // === 7. Aptitude Test / Practical Requirements ===
        boolean hasAptitudeHeading = text.toLowerCase().contains("aptitude test") ||
                                    text.toLowerCase().contains("practical/") ||
                                    text.toLowerCase().contains("requirement to pass");

        long aptitudeRows = lines.stream()
                .filter(line -> UNI_CODE_PATTERN.matcher(line).find() &&
                               (line.toLowerCase().contains("university") ||
                                line.toLowerCase().contains("campus") ||
                                line.toLowerCase().contains("institute")))
                .count();

        if (hasAptitudeHeading && aptitudeRows >= 3) {
            tableScore += 3;
        }

        // === 8. Medium of Instruction ===
        boolean hasMediumHeading = text.toLowerCase().contains("medium of instruction");

        long mediumRows = lines.stream()
                .filter(line -> line.toLowerCase().matches(".*\\b(sinhala|tamil|english)\\b.*") &&
                               (line.toLowerCase().contains("university") ||
                                line.toLowerCase().contains("campus")))
                .count();

        if (hasMediumHeading && mediumRows >= 3) {
            tableScore += 3;
        }

        // === 9. Additional Heuristics ===
        // University names repeated in structured format
        long universityRows = lines.stream()
                .filter(line -> line.toLowerCase().contains("university of") &&
                               (line.matches(".*\\d+.*") || UNI_CODE_PATTERN.matcher(line).find()))
                .count();

        if (universityRows >= 3) {
            tableScore += 2;
        }

        // Threshold for table detection
        return tableScore >= 3;
    }
}
