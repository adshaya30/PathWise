package com.pathwise.admin.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pathwise.admin.dto.DocumentPageResponseDto;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.entity.Document;
import com.pathwise.admin.repository.DocumentRepository;
import com.pathwise.admin.service.AiTableExtractionService;
import com.pathwise.admin.service.FileStorageService;
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
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiTableExtractionServiceImpl implements AiTableExtractionService {

    private final DocumentRepository documentRepository;
    private final DocumentPageRepository documentPageRepository;
    private final FileStorageService fileStorageService;
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

        String extractedTableContent = callGeminiVision(base64Image, pageNumber);

        // 5. Update and persist page extracted text in a fast DB transaction
        return saveExtractedPageResult(documentId, pageNumber, extractedTableContent);
    }

    @Transactional
    public DocumentPageResponseDto saveExtractedPageResult(Long documentId, Integer pageNumber, String extractedTableContent) {
        DocumentPage page = documentPageRepository.findByDocumentIdAndPageNumber(documentId, pageNumber)
                .orElseThrow(() -> new RuntimeException(String.format("Page %d not found for document ID %d", pageNumber, documentId)));
        page.setExtractedText(extractedTableContent);
        page.setHasTables(true);
        DocumentPage savedPage = documentPageRepository.save(page);
        log.info("AI Table Extraction successfully completed and saved for Document ID: {} Page: {}", documentId, pageNumber);
        return DocumentPageResponseDto.fromEntity(savedPage);
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
            BufferedImage image = renderer.renderImageWithDPI(pageNumber - 1, 300, ImageType.RGB);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            String base64Image = Base64.getEncoder().encodeToString(baos.toByteArray());

            log.info("Auto-extracting table for page {} via Gemini Vision (300 DPI)...", pageNumber);
            return callGeminiVision(base64Image, pageNumber);
        } catch (Exception e) {
            log.warn("Direct Gemini table extraction failed for page {}: {}", pageNumber, e.getMessage());
            return null;
        }
    }

    // Approved clean model list for table extraction (flash prioritized for fast visual OCR accuracy)
    private static final List<String> APPROVED_MODELS = List.of(
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-3.6-flash"
    );

    private String callGeminiVision(String base64Image, int pageNumber) {
        log.info("Sending page {} image to Google Gemini Vision API for table extraction...", pageNumber);
        try {
            String prompt = """
                You are an expert OCR table extractor specialized in UGC Sri Lanka University Admission Handbooks and Cutoff Documents.
                Carefully analyze the image of this page and extract the exact table structure according to these UGC specifications:

                1. "PLACES AVAILABLE FOR ADMISSION" (PROPOSED INTAKE / ANNEX A):
                - Columns: `| Course Code | Course of Study | Proposed Intake |`
                - Example:
                  | 001 | Medicine | 2095 |
                  | 008 | Engineering | 2238 |

                2. "DISTRIBUTION OF PLACES PROPOSED FOR ADMISSION" (ANNEX B / UNIVERSITY-WISE INTAKE):
                - Unpivot the side-by-side University boxes into standard rows:
                  `| University | Course of Study | Proposed Intake |`
                - Example:
                  | University of Colombo | Medicine | 224 |
                  | University of Colombo | Biological Science | 155 |
                  | University of Peradeniya | Medicine | 238 |
                  | University of Peradeniya | Engineering | 455 |
                  | University of Sri Jayewardenepura | Medicine | 194 |

                3. "UNI-CODES ASSIGNED FOR EACH COURSE OF STUDY OF UNIVERSITY":
                - Columns: `| Course of Study | University | Uni - Code |`
                - Example:
                  | MEDICINE | UNIVERSITY OF COLOMBO | 001A |
                  | ENGINEERING | UNIVERSITY OF MORATUWA | 008A |

                4. "MEDIUM OF INSTRUCTION":
                - Columns: `| No | University | Medium of Instruction |`
                - Example:
                  | 01 | University of Colombo | Sinhala/ Tamil/ English |
                  | 05 | University of Jaffna | Tamil |

                5. "SPECIAL ADMISSION / DIFFERENTLY ABLED CATEGORIES":
                - Columns: `| University | Course of Study | Uni-Codes | Differently Abled | Blind (Braille) |`
                - Example:
                  | University of Colombo | Arts | 019A | 12 | 08 |

                6. "G.C.E. (ORDINARY LEVEL) EXAMINATION REQUIREMENTS":
                - Columns: `| Uni-Codes | Course of Study | Sin. Lang. | Eng. | Mat. | Sci. | Tam. Lang. |`
                - Example:
                  | 011G | Quantity Surveying | | C | C | S | |
                  | 023G | Architecture | | S | C | | |
                  | 024G | Design | | S | C | C | |
                  | 025A/025B/025E | Law | C* | C | | | C* |
                  | 027D | Management and Information Technology (MIT) | | C | B | | |
                  | 034G | Fashion Design & Product Development | | C | C | C | |

                7. "REQUIREMENT TO PASS THE PRACTICAL/ APTITUDE TEST":
                - Columns: `| Course of Study | University / Campus / Institute | Uni-Code |`
                - Example:
                  | ARTS (SP) - MASS MEDIA | SRIPALEE CAMPUS, UNIVERSITY OF COLOMBO | 020S |
                  | ARTS (SP) - PERFORMING ARTS | SRIPALEE CAMPUS, UNIVERSITY OF COLOMBO | 041S |
                  | ARCHITECTURE | UNIVERSITY OF MORATUWA | 023G |
                  | DESIGN | UNIVERSITY OF MORATUWA | 024G |
                  | FASHION DESIGN & PRODUCT DEVELOPMENT | UNIVERSITY OF MORATUWA | 034G |
                  | MUSIC | UNIVERSITY OF SRI JAYEWARDENEPURA | 068C |
                  | FILM & TELEVISION STUDIES | UNIVERSITY OF KELANIYA | 100D |

                8. "DISTRICT CUTOFF MARKS TABLE" (UGC Cutoff Document / PDF):
                - Columns: `| District | Course of Study | University | Minimum Z-Score / Cutoff |`
                - Unpivot each course & university column header into standard 4-column rows.
                - Use clean names without enclosing brackets (e.g. University: "University of Peradeniya", Course: "BIOLOGICAL SCIENCE").
                - For each row, specify full District name (COLOMBO, GAMPAHA, KALUTARA, MATALE, KANDY, NUWARA ELIYA, GALLE, MATARA, HAMBANTOTA, JAFFNA, KILINOCHCHI, MANNAR, MULLAITIVU, VAVUNIYA, TRINCOMALEE, BATTICALOA, AMPARA, PUTTALAM, KURUNEGALA, ANURADHAPURA, POLONNARUWA, BADULLA, MONARAGALA, KEGALLE, RATNAPURA), Course of Study, University, and exact Z-score (e.g. 1.5223) or NQC.
                - Example:
                  | District | Course of Study | University | Minimum Z-Score / Cutoff |
                  | COLOMBO | BIOLOGICAL SCIENCE | University of Peradeniya | 1.5223 |
                  | GAMPAHA | BIOLOGICAL SCIENCE | University of Peradeniya | 1.5237 |
                  | KALUTARA | BIOLOGICAL SCIENCE | University of Peradeniya | 1.5303 |
                  | MATALE | BIOLOGICAL SCIENCE | University of Peradeniya | 1.5303 |
                  | GALLE | BIOLOGICAL SCIENCE | University of Peradeniya | 1.5220 |
                  | KILINOCHCHI | BIOLOGICAL SCIENCE | University of Peradeniya | NQC |

                GENERAL RULES:
                1. If this page contains one of the above structured tables, extract it as a clean, complete Markdown table starting with the header row `| Col 1 | Col 2 | ... |`.
                2. Do NOT truncate rows; extract all visible table entries on this page completely.
                3. If the page contains descriptive text, clauses, course descriptions, or eligibility guidelines (Section 2 Course Details), transcribe the text cleanly in high-fidelity Markdown (with clear headings, bullet points, and exact wording) for RAG AI search without forcing it into a table.
                4. NEVER return conversational responses (e.g. NEVER say "I cannot generate..." or "Here is the table...").
                5. Do NOT include markdown code fences (no ```), no intro, and no conversational outro.
                """;

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
                            "temperature", 0.1,
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
                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent";
                try {
                    String url = endpoint + "?key=" + cleanKey;
                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Content-Type", "application/json")
                            .header("x-goog-api-key", cleanKey)
                            .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                            .timeout(Duration.ofSeconds(120)) // 120s for large full-page tables
                            .build();

                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    int statusCode = response.statusCode();

                    // 1. Success (200 OK)
                    if (statusCode >= 200 && statusCode < 300) {
                        JsonNode root = objectMapper.readTree(response.body());
                        JsonNode candidates = root.path("candidates");
                        if (candidates.isArray() && !candidates.isEmpty()) {
                            JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                            String resultText = textNode.asText().trim();
                            log.info("Gemini Vision successfully extracted {} chars using model '{}'",
                                    resultText.length(), modelName);
                            return resultText;
                        }
                    }

                    // 2. Authentication / Permission Error (401 / 403) - Stop immediately
                    if (statusCode == 401 || statusCode == 403) {
                        log.error("Gemini API key is invalid or unauthorized (Status {}): {}", statusCode, response.body());
                        throw new IllegalStateException("Gemini API Authentication Failed (" + statusCode + "). Please check your GEMINI_API_KEY.");
                    }

                    // 3. Quota Exceeded / Rate Limit (429) - Stop immediately to prevent key burnout
                    if (statusCode == 429) {
                        log.warn("Gemini API Quota / Rate Limit exceeded (429): {}", response.body());
                        throw new IllegalStateException("Gemini API Rate Limit / Quota Exceeded (Status 429). Please wait a few seconds or check your quota limit.");
                    }

                    // 4. Temporary Server Unavailable (503 / 500) - Short backoff retry once
                    if (statusCode == 503 || statusCode == 500) {
                        log.warn("Gemini service temporary issue (Status {}). Performing short backoff retry...", statusCode);
                        try {
                            Thread.sleep(1200); // 1.2s backoff
                            HttpResponse<String> retryResponse = client.send(request, HttpResponse.BodyHandlers.ofString());
                            if (retryResponse.statusCode() >= 200 && retryResponse.statusCode() < 300) {
                                JsonNode root = objectMapper.readTree(retryResponse.body());
                                JsonNode textNode = root.path("candidates").get(0).path("content").path("parts").get(0).path("text");
                                return textNode.asText().trim();
                            }
                        } catch (Exception retryEx) {
                            log.warn("Retry failed for {}: {}", modelName, retryEx.getMessage());
                        }
                    }

                    // 5. Model Not Found / Bad Request (404 / 400) - Skip cleanly to next model
                    lastError = String.format("Status %d for '%s': %s", statusCode, modelName, response.body());
                    log.info("Gemini model '{}' returned {}. Skipping to next approved model...", modelName, statusCode);

                } catch (IllegalStateException e) {
                    throw e; // Propagate auth and quota exceptions directly
                } catch (Exception modelEx) {
                    lastError = modelEx.getMessage();
                    log.warn("Exception calling Gemini model '{}': {}", modelName, lastError);
                }
            }

            log.error("All approved Gemini extraction models failed. Last response: {}", lastError);
            throw new RuntimeException("Gemini Vision API error: " + lastError);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to extract table via Gemini API: {}", e.getMessage(), e);
            throw new RuntimeException("AI Table Extraction failed: " + e.getMessage(), e);
        }
    }
}
