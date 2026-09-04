package com.pathwise.admin.service;

import com.pathwise.admin.dto.DocumentPageResponseDto;
import java.util.List;

public interface AiTableExtractionService {

    /**
     * Extracts tabular and cutoff data from a specific page of a PDF document using AI Vision / OCR.
     *
     * @param documentId Document ID
     * @param pageNumber Page number to extract
     * @return Updated DocumentPageResponseDto with clean extracted table markdown
     */
    DocumentPageResponseDto extractPageTableWithAi(Long documentId, Integer pageNumber);

    /**
     * Bulk auto-extracts all pages containing tables in the given document.
     *
     * @param documentId Document ID
     * @return List of all updated DocumentPageResponseDto items
     */
    List<DocumentPageResponseDto> extractAllTablesWithAi(Long documentId);

    /**
     * Bulk auto-extracts pages containing tables with a safety page limit.
     *
     * @param documentId Document ID
     * @param maxPages Maximum number of table pages to process
     * @return List of all updated DocumentPageResponseDto items
     */
    List<DocumentPageResponseDto> extractAllTablesWithAi(Long documentId, Integer maxPages);

    /**
     * Directly extracts structured table markdown from raw PDF bytes for a given page number.
     * Used during automatic document upload processing.
     *
     * @param pdfBytes Raw PDF byte array
     * @param pageNumber 1-indexed page number
     * @return Structured Markdown table, or null if extraction is skipped/fails
     */
    String extractTableDirectly(byte[] pdfBytes, int pageNumber);
}
