package com.pathwise.services;

import com.pathwise.entity.Document;
import com.pathwise.entity.DocumentPage;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface PdfExtractionService {

    /**
     * Extracts text page-by-page from a PDF input stream and associates with the document
     * @param pdfStream the PDF file stream
     * @param document the parent Document entity
     * @return list of DocumentPage entities with extracted text
     */
    List<DocumentPage> extractPages(InputStream pdfStream, Document document) throws IOException;

    /**
     * Extracts text page-by-page from raw PDF bytes
     * @param pdfBytes raw PDF byte array
     * @param document the parent Document entity
     * @return list of DocumentPage entities with extracted text
     */
    List<DocumentPage> extractPages(byte[] pdfBytes, Document document) throws IOException;

    /**
     * Gets the total page count of a PDF without full extraction
     * @param pdfBytes raw PDF byte array
     * @return total pages
     */
    int getPageCount(byte[] pdfBytes) throws IOException;
}
