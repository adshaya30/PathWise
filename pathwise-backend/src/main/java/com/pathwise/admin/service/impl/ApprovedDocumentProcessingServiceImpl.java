package com.pathwise.admin.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.repository.DocumentRepository;
import com.pathwise.admin.service.ApprovedDocumentProcessingService;
import com.pathwise.course.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovedDocumentProcessingServiceImpl implements ApprovedDocumentProcessingService {

    private final DocumentRepository documentRepository;
    private final DocumentPageRepository documentPageRepository;
    private final CutoffIngestionService cutoffIngestionService;
    private final CourseIntakeService courseIntakeService;
    private final CourseOlRequirementService courseOlRequirementService;
    private final CoursePrerequisiteService coursePrerequisiteService;
    private final SpecialQuotaAndMediumService specialQuotaAndMediumService;
    private final CourseAptitudeTestService courseAptitudeTestService;
    private final UniCodeService uniCodeService;

    @Async("documentPromotionExecutor")
    @Override
    public void processApprovedDocument(Document document) {
        if (document == null || document.getId() == null) {
            throw new IllegalArgumentException("document must be persisted (id required)");
        }

        Long docId = document.getId();

        // 1. Fetch fresh Document and Pages from DB inside this async thread's transaction
        Document freshDoc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found with ID: " + docId));

        List<DocumentPage> pages = documentPageRepository.findByDocumentIdOrderByPageNumberAsc(docId);
        freshDoc.setPages(pages);

        String docType = freshDoc.getDocumentType() != null ? freshDoc.getDocumentType().toUpperCase() : "";
        boolean isCutoffDoc = docType.contains("CUTOFF") || docType.contains("RANK") || docType.contains("MARK");

        log.info("Starting post-approval data promotion for Document ID: {} '{}' (Type: {}, Total Pages: {})",
                docId, freshDoc.getTitle(), docType, pages.size());

        if (isCutoffDoc) {
            // 1. Cutoff Document Promotion
            try {
                int ingestedCount = cutoffIngestionService.promoteApprovedDocumentCutoffs(freshDoc);
                log.info("Ingested {} cutoff rows into 'course_cutoff_marks' for Document ID: {}", ingestedCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest cutoff marks for approved document {}: {}", docId, ex.getMessage(), ex);
            }
        } else {
            // 2. UGC Handbook Tables Promotion:

            // A. Places Available (Annex a & b)
            try {
                int intakeCount = courseIntakeService.promoteHandbookIntakes(freshDoc);
                log.info("Ingested {} intake rows into 'course_intakes' for Document ID: {}", intakeCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest course intakes for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // B. G.C.E. (O/L) Requirements
            try {
                int olCount = courseOlRequirementService.promoteHandbookOlRequirements(freshDoc);
                log.info("Ingested {} O/L requirement rows into 'course_ol_requirements' for Document ID: {}", olCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest O/L requirements for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // C. A/L Subject Prerequisites (Minimum eligibility requirements for admission)
            try {
                int prereqCount = coursePrerequisiteService.promoteHandbookPrerequisites(freshDoc);
                log.info("Ingested {} A/L prerequisite rows into 'course_prerequisites' for Document ID: {}", prereqCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest A/L prerequisites for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // D. Medium of Instruction & Special Admission Quotas
            try {
                int specialCount = specialQuotaAndMediumService.promoteMediumsAndSpecialQuotas(freshDoc);
                log.info("Ingested {} Medium & Special Quota rows for Document ID: {}", specialCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest Mediums/Special Quotas for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // D. Aptitude & Practical Test Requirements
            try {
                int aptitudeCount = courseAptitudeTestService.promoteHandbookAptitudeTests(freshDoc);
                log.info("Ingested {} Aptitude Test rows into 'course_aptitude_test_requirements' for Document ID: {}", aptitudeCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest Aptitude Tests for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // E. Cutoff Marks (If handbook contains historical cutoff pages, store with preceding year e.g. 2024/25)
            try {
                int cutoffCount = cutoffIngestionService.promoteApprovedDocumentCutoffs(freshDoc);
                if (cutoffCount > 0) {
                    log.info("Ingested {} cutoff rows from handbook into 'course_cutoff_marks' for Document ID: {}", cutoffCount, docId);
                }
            } catch (Exception ex) {
                log.error("Failed to ingest cutoff marks for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // F. Official UGC Uni-Codes (Specification 3: UNI-CODES ASSIGNED FOR EACH COURSE OF STUDY)
            try {
                int uniCodeCount = uniCodeService.promoteHandbookUniCodes(freshDoc);
                log.info("Ingested {} Uni-Codes into 'uni_codes' table for Document ID: {}", uniCodeCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest Uni-Codes for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            log.info("Completed all handbook domain table promotions for Document ID: {}", docId);
        }
    }
}
