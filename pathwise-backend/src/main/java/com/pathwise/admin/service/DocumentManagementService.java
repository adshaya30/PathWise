package com.pathwise.admin.service;

import com.pathwise.admin.dto.DocumentPageResponseDto;
import com.pathwise.admin.dto.DocumentResponseDto;
import com.pathwise.admin.dto.DocumentStatusUpdateRequestDto;
import com.pathwise.admin.dto.DocumentUploadRequestDto;
import com.pathwise.admin.entity.enums.DocumentStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface DocumentManagementService {

    /**
     * Uploads PDF file, stores it in Supabase Storage, extracts text page-by-page with PDFBox,
     * and saves document metadata and pages in PostgreSQL.
     */
    DocumentResponseDto uploadAndProcessDocument(MultipartFile file, DocumentUploadRequestDto dto) throws IOException;

    /**
     * Retrieves all documents with optional filters and search query
     */
    List<DocumentResponseDto> getAllDocuments(String source, String academicYear, DocumentStatus status, String documentType, String query);

    /**
     * Retrieves a single document by ID
     */
    DocumentResponseDto getDocumentById(Long id);

    /**
     * Retrieves all extracted pages for a document
     */
    List<DocumentPageResponseDto> getDocumentPages(Long documentId);

    /**
     * Retrieves a specific page for a document
     */
    DocumentPageResponseDto getDocumentPage(Long documentId, Integer pageNumber);

    /**
     * Updates verification status (e.g. APPROVED, REJECTED)
     */
    DocumentResponseDto updateDocumentStatus(Long id, DocumentStatusUpdateRequestDto dto);

    /**
     * Updates document metadata (title, source, year, type, description)
     */
    DocumentResponseDto updateDocumentMetadata(Long id, DocumentUploadRequestDto dto);

    /**
     * Deletes a document, its extracted pages from PostgreSQL, and its file from Supabase Storage
     */
    void deleteDocument(Long id);

    /**
     * Updates the extracted text of a specific document page
     */
    DocumentPageResponseDto updatePageText(Long documentId, Integer pageNumber, String newText);

    /**
     * Downloads raw document PDF bytes
     */
    byte[] downloadDocumentFile(Long id) throws IOException;
}
