package com.pathwise.admin.repository;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.enums.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByStatus(DocumentStatus status);

    List<Document> findBySource(String source);

    List<Document> findByAcademicYear(String academicYear);

    List<Document> findByDocumentType(String documentType);

    List<Document> findAllByOrderByUploadedAtDesc();

    @Query("SELECT d FROM Document d WHERE " +
           "LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.source) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.fileName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY d.uploadedAt DESC")
    List<Document> searchDocuments(@Param("query") String query);

    @Query("SELECT d FROM Document d WHERE " +
           "(:source IS NULL OR d.source = :source) AND " +
           "(:academicYear IS NULL OR d.academicYear = :academicYear) AND " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:documentType IS NULL OR d.documentType = :documentType) " +
           "ORDER BY d.uploadedAt DESC")
    List<Document> findWithFilters(
            @Param("source") String source,
            @Param("academicYear") String academicYear,
            @Param("status") DocumentStatus status,
            @Param("documentType") String documentType
    );
}
