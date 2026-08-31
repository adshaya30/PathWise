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
import com.pathwise.admin.service.DocumentManagementService;
import com.pathwise.admin.service.FileStorageService;
import com.pathwise.admin.service.PdfExtractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
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

    @Override
    @Transactional
    public DocumentResponseDto uploadAndProcessDocument(MultipartFile file, DocumentUploadRequestDto dto) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required and cannot be empty.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        log.info("Processing upload request: title='{}', source='{}', file='{}'",
                dto.getTitle(), dto.getSource(), originalFilename);

        // 1. Calculate human-readable file size
        long bytes = file.getSize();
        String fileSizeStr = bytes >= 1024 * 1024
                ? String.format("%.1f MB", bytes / (1024.0 * 1024.0))
                : String.format("%.1f KB", bytes / 1024.0);

        // 2. Generate clean storage path for Supabase Storage
        String cleanYear = dto.getAcademicYear().replaceAll("[^a-zA-Z0-9_-]", "_");
        String cleanSource = dto.getSource().replaceAll("[^a-zA-Z0-9_-]", "_");
        String cleanName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String storagePath = String.format("documents/%s_%s_%d_%s", cleanYear, cleanSource, System.currentTimeMillis(), cleanName);

        // 3. Upload file to Supabase Storage (with local fallback)
        String uploadedPath = fileStorageService.uploadFile(file, storagePath);

        // 4. Create Document Entity
        Document document = Document.builder()
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
                .build();

        // 5. Extract text page-by-page using Apache PDFBox
        try {
            List<DocumentPage> pages = pdfExtractionService.extractPages(file.getInputStream(), document);
            document.setTotalPages(pages.size());
            document.setPages(pages);
            log.info("Extracted {} pages from PDF.", pages.size());
        } catch (Exception e) {
            log.warn("Text extraction warning: {}", e.getMessage());
            document.setTotalPages(0);
        }

        // 6. Save Document and cascade save DocumentPage entities to PostgreSQL
        Document savedDocument = documentRepository.save(document);
        log.info("Successfully stored document with ID: {} and status: PENDING_REVIEW", savedDocument.getId());

        return DocumentResponseDto.fromEntity(savedDocument);
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
