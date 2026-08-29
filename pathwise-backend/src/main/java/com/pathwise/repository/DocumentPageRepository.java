package com.pathwise.repository;

import com.pathwise.entity.DocumentPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentPageRepository extends JpaRepository<DocumentPage, Long> {

    List<DocumentPage> findByDocumentIdOrderByPageNumberAsc(Long documentId);

    Optional<DocumentPage> findByDocumentIdAndPageNumber(Long documentId, Integer pageNumber);

    long countByDocumentId(Long documentId);

    void deleteByDocumentId(Long documentId);

    @Query("SELECT p FROM DocumentPage p WHERE p.document.id = :documentId AND " +
           "LOWER(p.extractedText) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY p.pageNumber ASC")
    List<DocumentPage> searchInDocumentText(@Param("documentId") Long documentId, @Param("keyword") String keyword);

    @Query("SELECT p FROM DocumentPage p WHERE p.document.status = 'APPROVED' AND " +
           "LOWER(p.extractedText) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY p.document.academicYear DESC, p.pageNumber ASC")
    List<DocumentPage> searchApprovedKnowledge(@Param("query") String query);
}
