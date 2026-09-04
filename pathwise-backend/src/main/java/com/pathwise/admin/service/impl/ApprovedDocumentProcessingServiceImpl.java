package com.pathwise.admin.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.service.ApprovedDocumentProcessingService;
import com.pathwise.course.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovedDocumentProcessingServiceImpl implements ApprovedDocumentProcessingService {

    private final CutoffIngestionService cutoffIngestionService;
    private final CourseIntakeService courseIntakeService;
    private final CourseOlRequirementService courseOlRequirementService;
    private final SpecialQuotaAndMediumService specialQuotaAndMediumService;
    private final CourseAptitudeTestService courseAptitudeTestService;

    @Async("documentPromotionExecutor")
    @Override
    public void processApprovedDocument(Document document) {
        if (document == null) {
            throw new IllegalArgumentException("document must not be null");
        }
        if (document.getId() == null) {
            throw new IllegalArgumentException("document must be persisted (id required)");
        }

        Long docId = document.getId();
        String docType = document.getDocumentType() != null ? document.getDocumentType().toUpperCase() : "";
        boolean isCutoffDoc = docType.contains("CUTOFF") || docType.contains("RANK") || docType.contains("MARK");

        log.info("Starting post-approval data promotion for Document ID: {} '{}' (Type: {})",
                docId, document.getTitle(), docType);

        if (isCutoffDoc) {
            // 1. Cutoff Document Promotion
            try {
                int ingestedCount = cutoffIngestionService.promoteApprovedDocumentCutoffs(document);
                log.info("Ingested {} cutoff rows into 'course_cutoff_marks' for Document ID: {}", ingestedCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest cutoff marks for approved document {}: {}", docId, ex.getMessage(), ex);
            }
        } else {
            // 2. UGC Handbook Tables Promotion:

            // A. Places Available (Annex a & b)
            try {
                int intakeCount = courseIntakeService.promoteHandbookIntakes(document);
                log.info("Ingested {} intake rows into 'course_intakes' for Document ID: {}", intakeCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest course intakes for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // B. G.C.E. (O/L) Requirements
            try {
                int olCount = courseOlRequirementService.promoteHandbookOlRequirements(document);
                log.info("Ingested {} O/L requirement rows into 'course_ol_requirements' for Document ID: {}", olCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest O/L requirements for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // C. Medium of Instruction & Special Admission Quotas
            try {
                int specialCount = specialQuotaAndMediumService.promoteMediumsAndSpecialQuotas(document);
                log.info("Ingested {} Medium & Special Quota rows for Document ID: {}", specialCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest Mediums/Special Quotas for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            // D. Aptitude & Practical Test Requirements
            try {
                int aptitudeCount = courseAptitudeTestService.promoteHandbookAptitudeTests(document);
                log.info("Ingested {} Aptitude Test rows into 'course_aptitude_test_requirements' for Document ID: {}", aptitudeCount, docId);
            } catch (Exception ex) {
                log.error("Failed to ingest Aptitude Tests for approved handbook {}: {}", docId, ex.getMessage(), ex);
            }

            log.info("Completed all handbook domain table promotions for Document ID: {}", docId);
        }
    }
}
