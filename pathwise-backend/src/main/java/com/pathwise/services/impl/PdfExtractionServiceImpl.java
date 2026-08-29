package com.pathwise.services.impl;

import com.pathwise.entity.Document;
import com.pathwise.entity.DocumentPage;
import com.pathwise.services.PdfExtractionService;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PdfExtractionServiceImpl implements PdfExtractionService {

    // Pattern to detect potential tabular data (e.g. course cutoffs, z-scores, multiple column structures)
    private static final Pattern TABLE_INDICATOR_PATTERN = Pattern.compile("(?m)(\\b\\d+\\.\\d{2,4}\\b.*\\b\\d+\\.\\d{2,4}\\b|\\|.*\\|)");

    @Override
    public List<DocumentPage> extractPages(InputStream pdfStream, Document document) throws IOException {
        byte[] pdfBytes = pdfStream.readAllBytes();
        return extractPages(pdfBytes, document);
    }

    @Override
    public List<DocumentPage> extractPages(byte[] pdfBytes, Document document) throws IOException {
        List<DocumentPage> pages = new ArrayList<>();

        log.info("Starting PDFBox page-by-page extraction for document: '{}' ({} bytes)",
                document != null ? document.getTitle() : "unnamed", pdfBytes.length);

        try (PDDocument pdDocument = Loader.loadPDF(pdfBytes)) {
            int totalPages = pdDocument.getNumberOfPages();
            log.info("PDF loaded successfully. Total pages to extract: {}", totalPages);

            if (document != null) {
                document.setTotalPages(totalPages);
            }

            PDFTextStripper textStripper = new PDFTextStripper();
            textStripper.setSortByPosition(true); // Preserve visual layout reading order

            for (int pageNum = 1; pageNum <= totalPages; pageNum++) {
                textStripper.setStartPage(pageNum);
                textStripper.setEndPage(pageNum);

                String pageText = textStripper.getText(pdDocument);
                String cleanedText = cleanExtractedText(pageText);
                boolean hasTables = detectTables(cleanedText);

                DocumentPage page = DocumentPage.builder()
                        .document(document)
                        .pageNumber(pageNum)
                        .extractedText(cleanedText.isEmpty() ? "[Blank or Scanned Image Page - No Extractable Text]" : cleanedText)
                        .hasTables(hasTables)
                        .createdAt(LocalDateTime.now())
                        .build();

                pages.add(page);

                if (pageNum % 25 == 0 || pageNum == totalPages) {
                    log.info("Extracted {} / {} pages for document '{}'", pageNum, totalPages,
                            document != null ? document.getTitle() : "unnamed");
                }
            }

            log.info("Completed extraction of {} pages successfully.", totalPages);
        } catch (Exception e) {
            log.error("Error during PDFBox text extraction: {}", e.getMessage(), e);
            throw new IOException("Failed to extract text from PDF: " + e.getMessage(), e);
        }

        return pages;
    }

    @Override
    public int getPageCount(byte[] pdfBytes) throws IOException {
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

    /**
     * Checks if the page content likely contains tabular data (e.g. Z-score lists, district quotas)
     */
    private boolean detectTables(String text) {
        if (text == null || text.isBlank()) return false;
        return TABLE_INDICATOR_PATTERN.matcher(text).find() ||
               text.lines().filter(line -> line.matches(".*\\d+\\s+\\d+.*")).count() > 3;
    }
}
