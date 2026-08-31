package com.pathwise.admin.controller;

import com.pathwise.admin.dto.DocumentPageResponseDto;
import com.pathwise.admin.dto.DocumentResponseDto;
import com.pathwise.admin.dto.DocumentStatusUpdateRequestDto;
import com.pathwise.admin.dto.DocumentUploadRequestDto;
import com.pathwise.admin.entity.enums.DocumentStatus;
import com.pathwise.admin.service.DocumentManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/documents")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AdminDocumentController {

    private final DocumentManagementService documentManagementService;

    /**
     * Upload a new official PDF document (UGC, NIE, etc.)
     * Stores PDF in Supabase Storage, extracts text page-by-page with PDFBox, and saves metadata into PostgreSQL.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponseDto> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("source") String source,
            @RequestParam("academicYear") String academicYear,
            @RequestParam(value = "documentType", required = false) String documentType,
            @RequestParam(value = "description", required = false) String description
    ) throws IOException {
        DocumentUploadRequestDto requestDto = DocumentUploadRequestDto.builder()
                .title(title)
                .source(source)
                .academicYear(academicYear)
                .documentType(documentType != null ? documentType : "Admissions")
                .description(description)
                .build();

        log.info("Received document upload request: title='{}', source='{}', file='{}'",
                title, source, file.getOriginalFilename());

        DocumentResponseDto response = documentManagementService.uploadAndProcessDocument(file, requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * List all documents with optional filtering and keyword search
     */
    @GetMapping
    public ResponseEntity<List<DocumentResponseDto>> getAllDocuments(
            @RequestParam(value = "source", required = false) String source,
            @RequestParam(value = "academicYear", required = false) String academicYear,
            @RequestParam(value = "status", required = false) DocumentStatus status,
            @RequestParam(value = "documentType", required = false) String documentType,
            @RequestParam(value = "query", required = false) String query
    ) {
        List<DocumentResponseDto> documents = documentManagementService.getAllDocuments(
                source, academicYear, status, documentType, query
        );
        return ResponseEntity.ok(documents);
    }

    /**
     * Get single document details
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponseDto> getDocumentById(@PathVariable Long id) {
        return ResponseEntity.ok(documentManagementService.getDocumentById(id));
    }

    /**
     * Get all extracted pages with text for review / verification
     */
    @GetMapping("/{id}/pages")
    public ResponseEntity<List<DocumentPageResponseDto>> getDocumentPages(@PathVariable Long id) {
        return ResponseEntity.ok(documentManagementService.getDocumentPages(id));
    }

    /**
     * Get specific page text
     */
    @GetMapping("/{id}/pages/{pageNumber}")
    public ResponseEntity<DocumentPageResponseDto> getDocumentPage(
            @PathVariable Long id,
            @PathVariable Integer pageNumber
    ) {
        return ResponseEntity.ok(documentManagementService.getDocumentPage(id, pageNumber));
    }

    /**
     * Update extracted text of a specific page (Human-in-the-Loop Correction)
     */
    @PutMapping("/{id}/pages/{pageNumber}")
    public ResponseEntity<DocumentPageResponseDto> updatePageText(
            @PathVariable Long id,
            @PathVariable Integer pageNumber,
            @RequestBody Map<String, String> payload
    ) {
        String newText = payload.getOrDefault("extractedText", "");
        return ResponseEntity.ok(documentManagementService.updatePageText(id, pageNumber, newText));
    }

    /**
     * Admin Review Action: Update Document Status (e.g. APPROVED, REJECTED)
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<DocumentResponseDto> updateDocumentStatus(
            @PathVariable Long id,
            @RequestBody @Valid DocumentStatusUpdateRequestDto request
    ) {
        return ResponseEntity.ok(documentManagementService.updateDocumentStatus(id, request));
    }

    /**
     * Update Document metadata
     */
    @PutMapping("/{id}")
    public ResponseEntity<DocumentResponseDto> updateDocumentMetadata(
            @PathVariable Long id,
            @RequestBody @Valid DocumentUploadRequestDto request
    ) {
        return ResponseEntity.ok(documentManagementService.updateDocumentMetadata(id, request));
    }

    /**
     * Delete document and all its extracted pages
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDocument(@PathVariable Long id) {
        documentManagementService.deleteDocument(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document and associated extracted pages deleted successfully.",
                "id", id
        ));
    }

    /**
     * Download or view original PDF
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadDocumentFile(@PathVariable Long id) throws IOException {
        DocumentResponseDto doc = documentManagementService.getDocumentById(id);
        byte[] pdfBytes = documentManagementService.downloadDocumentFile(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFileName() + "\"")
                .body(pdfBytes);
    }
}
