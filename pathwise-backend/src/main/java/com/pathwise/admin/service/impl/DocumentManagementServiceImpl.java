package com.pathwise.admin.service.impl;

import com.pathwise.admin.dto.DocumentPageResponseDto;
import com.pathwise.admin.dto.DocumentResponseDto;
import com.pathwise.admin.dto.DocumentStatusUpdateRequestDto;
import com.pathwise.admin.dto.DocumentUploadRequestDto;
import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.entity.enums.DocumentStatus;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.repository.DocumentRepository;
import com.pathwise.admin.service.AiTableExtractionService;
import com.pathwise.admin.service.DocumentManagementService;
import com.pathwise.admin.service.FileStorageService;
import com.pathwise.admin.service.PdfExtractionService;
import com.pathwise.course.service.CutoffIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentManagementServiceImpl implements DocumentManagementService {

    private final DocumentRepository documentRepository;
    private final DocumentPageRepository documentPageRepository;
    private final FileStorageService fileStorageService;
    private final PdfExtractionService pdfExtractionService;
    private final AiTableExtractionService aiTableExtractionService;
    private final com.pathwise.admin.service.ApprovedDocumentProcessingService approvedDocumentProcessingService;

    @Override
    public DocumentResponseDto uploadAndProcessDocument(MultipartFile file, DocumentUploadRequestDto dto) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required and cannot be empty.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        log.info("Processing upload request: title='{}', source='{}', file='{}'",
                dto.getTitle(), dto.getSource(), originalFilename);

        // Read file bytes once for extraction and storage
        byte[] fileBytes = file.getBytes();

        // 1. Calculate human-readable file size
        long bytes = file.getSize();
        String fileSizeStr = bytes >= 1024 * 1024
                ? String.format("%.1f MB", bytes / (1024.0 * 1024.0))
                : String.format("%.1f KB", bytes / 1024.0);

        // 2. Upload file to Supabase Storage (Network I/O - OUTSIDE DB Transaction)
        String cleanYear = dto.getAcademicYear().replaceAll("[^a-zA-Z0-9_-]", "_");
        String cleanSource = dto.getSource().replaceAll("[^a-zA-Z0-9_-]", "_");
        String cleanName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storagePath = String.format("documents/%s_%s_%d_%s", cleanYear, cleanSource, System.currentTimeMillis(), cleanName);

        String uploadedPath = fileStorageService.uploadFile(file, storagePath);

        // 3. Save Document Metadata in a fast, dedicated DB transaction
        Document initialDoc = Document.builder()
                .title(dto.getTitle().trim())
                .source(dto.getSource().trim())
                .academicYear(dto.getAcademicYear().trim())
                .documentType(dto.getDocumentType() != null && !dto.getDocumentType().isBlank() ? dto.getDocumentType().trim() : "Admissions")
                .fileName(originalFilename)
                .fileSize(fileSizeStr)
                .storagePath(uploadedPath)
                .storageBucket("PathWise")
                .status(DocumentStatus.PENDING_REVIEW)
                .description(dto.getDescription())
                .uploadedAt(LocalDateTime.now())
                .totalPages(0)
                .build();

        Document savedDoc = saveDocumentMetadata(initialDoc);
        log.info("Saved initial document metadata with ID: {}", savedDoc.getId());

        // 4. Extract text & run Gemini Vision on table pages (CPU & AI Network I/O - OUTSIDE DB Transaction)
        List<DocumentPage> pages = new ArrayList<>();
        try {
            pages = pdfExtractionService.extractPages(fileBytes, savedDoc);

            // Automatically run Gemini Vision extraction on pages detected with tables
            for (DocumentPage page : pages) {
                if (Boolean.TRUE.equals(page.getHasTables())) {
                    log.info("Page {} flagged with table. Automatically applying Gemini Vision table extraction...", page.getPageNumber());
                    try {
                        String aiTableText = aiTableExtractionService.extractTableDirectly(fileBytes, page.getPageNumber());
                        if (aiTableText != null && !aiTableText.isBlank()) {
                            page.setExtractedText(aiTableText);
                            log.info("Successfully auto-extracted table for page {} using Gemini AI.", page.getPageNumber());
                        }
                    } catch (Exception aiEx) {
                        log.warn("Automatic Gemini extraction skipped for page {}: {}", page.getPageNumber(), aiEx.getMessage());
                    }
                }
            }
            log.info("Extracted {} pages from PDF.", pages.size());
        } catch (Exception e) {
            log.warn("Text extraction warning: {}", e.getMessage());
        }

        // 5. Save all extracted pages in a fast, dedicated DB transaction
        Document completedDoc = saveExtractedPages(savedDoc.getId(), pages);
        log.info("Successfully stored document with ID: {} and {} pages", completedDoc.getId(), pages.size());

        return DocumentResponseDto.fromEntity(completedDoc);
    }

    @Transactional
    public Document saveDocumentMetadata(Document doc) {
        return documentRepository.save(doc);
    }

    @Transactional
    public Document saveExtractedPages(Long documentId, List<DocumentPage> pages) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + documentId));
        doc.setTotalPages(pages.size());
        for (DocumentPage page : pages) {
            page.setDocument(doc);
        }
        documentPageRepository.saveAll(pages);
        return documentRepository.save(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponseDto> getAllDocuments(String source, String academicYear, DocumentStatus status, String documentType, String query) {
        List<Document> documents;

        if (query != null && !query.isBlank()) {
            documents = documentRepository.searchDocuments(query.trim());
        } else if (source != null || academicYear != null || status != null || documentType != null) {
            documents = documentRepository.findWithFilters(
                    "All".equalsIgnoreCase(source) ? null : source,
                    "All".equalsIgnoreCase(academicYear) ? null : academicYear,
                    status,
                    "All".equalsIgnoreCase(documentType) ? null : documentType
            );
        } else {
            documents = documentRepository.findAllByOrderByUploadedAtDesc();
        }

        return documents.stream()
                .map(DocumentResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponseDto getDocumentById(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
        return DocumentResponseDto.fromEntity(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentPageResponseDto> getDocumentPages(Long documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new RuntimeException("Document not found with ID: " + documentId);
        }
        return documentPageRepository.findByDocumentIdOrderByPageNumberAsc(documentId).stream()
                .map(DocumentPageResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentPageResponseDto getDocumentPage(Long documentId, Integer pageNumber) {
        DocumentPage page = documentPageRepository.findByDocumentIdAndPageNumber(documentId, pageNumber)
                .orElseThrow(() -> new RuntimeException(String.format("Page %d not found for document ID %d", pageNumber, documentId)));
        return DocumentPageResponseDto.fromEntity(page);
    }

    @Override
    @Transactional
    public DocumentResponseDto updateDocumentStatus(Long id, DocumentStatusUpdateRequestDto dto) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));

        doc.setStatus(dto.getStatus());
        doc.setReviewedAt(LocalDateTime.now());
        if (dto.getReviewedBy() != null && !dto.getReviewedBy().isBlank()) {
            doc.setReviewedBy(dto.getReviewedBy());
        }
        if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
            doc.setDescription(doc.getDescription() != null
                    ? doc.getDescription() + "\n\n[Review Note]: " + dto.getNotes()
                    : "[Review Note]: " + dto.getNotes());
        }

        Document updated = documentRepository.save(doc);
        log.info("Updated document ID: {} status to: {}", id, dto.getStatus());

        // When document is approved, trigger modular domain table promotions
        if (dto.getStatus() == DocumentStatus.APPROVED) {
            try {
                approvedDocumentProcessingService.processApprovedDocument(updated);
            } catch (Exception ex) {
                log.error("Error during post-approval domain processing for Document ID {}: {}", id, ex.getMessage(), ex);
            }
        }

        return DocumentResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    public DocumentResponseDto updateDocumentMetadata(Long id, DocumentUploadRequestDto dto) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) doc.setTitle(dto.getTitle().trim());
        if (dto.getSource() != null && !dto.getSource().isBlank()) doc.setSource(dto.getSource().trim());
        if (dto.getAcademicYear() != null && !dto.getAcademicYear().isBlank()) doc.setAcademicYear(dto.getAcademicYear().trim());
        if (dto.getDocumentType() != null && !dto.getDocumentType().isBlank()) doc.setDocumentType(dto.getDocumentType().trim());
        if (dto.getDescription() != null) doc.setDescription(dto.getDescription());

        Document updated = documentRepository.save(doc);
        return DocumentResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "aiTableExtractions", allEntries = true)
    public void deleteDocument(Long id) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));

        // 1. Delete original PDF file from Supabase Storage / local
        try {
            fileStorageService.deleteFile(doc.getStoragePath());
        } catch (Exception e) {
            log.warn("Failed to delete file from storage: {}", e.getMessage());
        }

        // 2. Delete document entity from PostgreSQL (cascade removes document_pages)
        documentRepository.delete(doc);
        log.info("Deleted document ID: {} from database and storage.", id);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "aiTableExtractions", key = "#documentId + '_' + #pageNumber")
    public DocumentPageResponseDto updatePageText(Long documentId, Integer pageNumber, String newText) {
        DocumentPage page = documentPageRepository.findByDocumentIdAndPageNumber(documentId, pageNumber)
                .orElseThrow(() -> new RuntimeException(String.format("Page %d not found for document ID %d", pageNumber, documentId)));

        page.setExtractedText(newText != null ? newText : "");
        DocumentPage saved = documentPageRepository.save(page);
        log.info("Updated extracted text for document ID: {} page: {}", documentId, pageNumber);
        return DocumentPageResponseDto.fromEntity(saved);
    }

    @Override
    public byte[] downloadDocumentFile(Long id) throws IOException {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + id));
        return fileStorageService.downloadFile(doc.getStoragePath());
    }
}
