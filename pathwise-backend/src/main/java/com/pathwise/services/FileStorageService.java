package com.pathwise.services;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageService {

    /**
     * Uploads a file to storage (Supabase bucket or local storage fallback)
     * @param file the MultipartFile to upload
     * @param destinationPath relative path in bucket e.g. "documents/ugc_2026_27.pdf"
     * @return the saved storage path
     */
    String uploadFile(MultipartFile file, String destinationPath) throws IOException;

    /**
     * Downloads file bytes from storage for processing (e.g. PDFBox extraction)
     * @param storagePath relative path in bucket
     * @return raw file bytes
     */
    byte[] downloadFile(String storagePath) throws IOException;

    /**
     * Deletes a file from storage
     * @param storagePath relative path in bucket
     */
    void deleteFile(String storagePath);

    /**
     * Gets a publicly accessible or downloadable URL for the file
     * @param storagePath relative path in bucket
     * @return file URL
     */
    String getFileUrl(String storagePath);
}
