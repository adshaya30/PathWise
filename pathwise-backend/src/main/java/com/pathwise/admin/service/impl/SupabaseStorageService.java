package com.pathwise.admin.service.impl;

import com.pathwise.admin.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@Slf4j
public class SupabaseStorageService implements FileStorageService {

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.key:}")
    private String supabaseKey;

    @Value("${supabase.bucket:PathWise}")
    private String bucket;

    @Value("${storage.local.dir:./uploads}")
    private String localDir;

    private final RestClient restClient;

    public SupabaseStorageService() {
        this.restClient = RestClient.builder().build();
    }

    private boolean isSupabaseConfigured() {
        return supabaseUrl != null && !supabaseUrl.isBlank() &&
               supabaseKey != null && !supabaseKey.isBlank();
    }

    @Override
    public String uploadFile(MultipartFile file, String destinationPath) throws IOException {
        String cleanPath = destinationPath.startsWith("/") ? destinationPath.substring(1) : destinationPath;

        if (isSupabaseConfigured()) {
            try {
                log.info("Uploading to Supabase Storage bucket: {} path: {}", bucket, cleanPath);
                String uploadUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucket, cleanPath);

                byte[] fileBytes = file.getBytes();
                String contentType = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

                restClient.post()
                        .uri(uploadUrl)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("apiKey", supabaseKey)
                        .header("x-upsert", "true")
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(fileBytes)
                        .retrieve()
                        .toBodilessEntity();

                log.info("Successfully uploaded file to Supabase Storage: {}", cleanPath);
                return cleanPath;
            } catch (Exception e) {
                log.error("Supabase Storage upload failed, falling back to local storage: {}", e.getMessage());
            }
        }

        // Local Storage Fallback
        log.info("Saving file to local storage path: {}/{}", localDir, cleanPath);
        Path targetPath = Paths.get(localDir, cleanPath);
        Files.createDirectories(targetPath.getParent());
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Successfully saved file to local storage: {}", targetPath.toAbsolutePath());
        return cleanPath;
    }

    @Override
    public byte[] downloadFile(String storagePath) throws IOException {
        String cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;

        if (isSupabaseConfigured()) {
            try {
                String downloadUrl = String.format("%s/storage/v1/object/authenticated/%s/%s", supabaseUrl, bucket, cleanPath);
                log.info("Downloading file from Supabase Storage: {}", downloadUrl);

                return restClient.get()
                        .uri(downloadUrl)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("apiKey", supabaseKey)
                        .retrieve()
                        .body(byte[].class);
            } catch (Exception e) {
                log.warn("Failed to download from Supabase Storage, checking local fallback: {}", e.getMessage());
            }
        }

        // Check local storage
        Path localPath = Paths.get(localDir, cleanPath);
        if (Files.exists(localPath)) {
            return Files.readAllBytes(localPath);
        }

        throw new IOException("File not found in storage: " + storagePath);
    }

    @Override
    public void deleteFile(String storagePath) {
        String cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;

        if (isSupabaseConfigured()) {
            try {
                String deleteUrl = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucket, cleanPath);
                restClient.delete()
                        .uri(deleteUrl)
                        .header("Authorization", "Bearer " + supabaseKey)
                        .header("apiKey", supabaseKey)
                        .retrieve()
                        .toBodilessEntity();
                log.info("Deleted file from Supabase Storage: {}", cleanPath);
            } catch (Exception e) {
                log.error("Failed to delete from Supabase Storage: {}", e.getMessage());
            }
        }

        // Also clean up local file if exists
        try {
            Path localPath = Paths.get(localDir, cleanPath);
            Files.deleteIfExists(localPath);
        } catch (Exception e) {
            log.warn("Could not delete local fallback file: {}", e.getMessage());
        }
    }

    @Override
    public String getFileUrl(String storagePath) {
        String cleanPath = storagePath.startsWith("/") ? storagePath.substring(1) : storagePath;
        if (isSupabaseConfigured()) {
            return String.format("%s/storage/v1/object/public/%s/%s", supabaseUrl, bucket, cleanPath);
        }
        return "/api/admin/documents/files/" + cleanPath;
    }
}
