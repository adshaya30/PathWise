package com.pathwise.course.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.course.entity.SpecialCategoryAdmissionQuota;
import com.pathwise.course.entity.UniversityMediumOfInstruction;
import com.pathwise.course.repository.SpecialAdmissionQuotaRepository;
import com.pathwise.course.repository.UniversityMediumRepository;
import com.pathwise.course.service.SpecialQuotaAndMediumService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpecialQuotaAndMediumServiceImpl implements SpecialQuotaAndMediumService {

    private final UniversityMediumRepository universityMediumRepository;
    private final SpecialAdmissionQuotaRepository specialAdmissionQuotaRepository;

    private static final Pattern NUMERIC_PATTERN = Pattern.compile("\\b\\d+\\b");

    @Override
    @Transactional
    public int promoteMediumsAndSpecialQuotas(Document document) {
        if (document == null || document.getPages() == null || document.getPages().isEmpty()) {
            return 0;
        }

        String academicYear = document.getAcademicYear() != null ? document.getAcademicYear().trim() : "2025/2026";
        log.info("Processing Mediums and Special Quotas from Document ID: {} '{}' ({})",
                document.getId(), document.getTitle(), academicYear);

        List<UniversityMediumOfInstruction> mediums = new ArrayList<>();
        List<SpecialCategoryAdmissionQuota> specialQuotas = new ArrayList<>();

        for (DocumentPage page : document.getPages()) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            String text = page.getExtractedText();
            String lower = text.toLowerCase();

            // 1. Medium of Instruction Table
            if (lower.contains("medium of instruction") || (lower.contains("sinhala") && lower.contains("tamil") && lower.contains("university"))) {
                mediums.addAll(parseMediums(text, document.getId(), academicYear));
            }

            // 2. Special Categories / Differently Abled
            if (lower.contains("differently abled") || lower.contains("blind") || lower.contains("braille")) {
                specialQuotas.addAll(parseSpecialQuotas(text, document.getId(), academicYear));
            }
        }

        if (!mediums.isEmpty()) {
            universityMediumRepository.deleteByDocumentId(document.getId());
            universityMediumRepository.saveAll(mediums);
            log.info("Successfully ingested {} University Medium of Instruction records for Document ID: {}", mediums.size(), document.getId());
        }

        if (!specialQuotas.isEmpty()) {
            specialAdmissionQuotaRepository.deleteByDocumentId(document.getId());
            specialAdmissionQuotaRepository.saveAll(specialQuotas);
            log.info("Successfully ingested {} Special Admission Quota records for Document ID: {}", specialQuotas.size(), document.getId());
        }

        return mediums.size() + specialQuotas.size();
    }

    private List<UniversityMediumOfInstruction> parseMediums(String text, Long documentId, String academicYear) {
        List<UniversityMediumOfInstruction> rows = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) continue;

            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts).map(String::trim).filter(s -> !s.isEmpty()).toList();

            // Expected schema: | No | University | Medium of Instruction |
            if (cells.size() >= 2) {
                String col1 = cells.get(0);
                String col2 = cells.get(1);
                String col3 = cells.size() > 2 ? cells.get(2) : "";

                if (col1.equalsIgnoreCase("No") || col2.equalsIgnoreCase("University")) continue;

                String uniName = col2;
                String medium = col3;
                String num = col1;

                if (col1.toLowerCase().contains("university")) {
                    uniName = col1;
                    medium = col2;
                    num = "";
                }

                if (isValidUniversity(uniName) && !medium.isBlank()) {
                    rows.add(UniversityMediumOfInstruction.builder()
                            .documentId(documentId)
                            .academicYear(academicYear)
                            .universityNumber(num)
                            .universityName(uniName)
                            .mediumOfInstruction(medium)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }
        return rows;
    }

    private List<SpecialCategoryAdmissionQuota> parseSpecialQuotas(String text, Long documentId, String academicYear) {
        List<SpecialCategoryAdmissionQuota> rows = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) continue;

            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts).map(String::trim).filter(s -> !s.isEmpty()).toList();

            // Schema: | University | Course of Study | Uni-Codes | Differently Abled | Blind (Braille) |
            if (cells.size() >= 3) {
                String uni = cells.get(0);
                String course = cells.get(1);
                String uniCodes = cells.get(2);
                String diffAbledStr = cells.size() > 3 ? cells.get(3) : "";
                String blindStr = cells.size() > 4 ? cells.get(4) : "";

                if (uni.equalsIgnoreCase("University") || course.equalsIgnoreCase("Course of Study")) continue;

                if (isValidUniversity(uni) && !course.equalsIgnoreCase("Total")) {
                    Integer diffAbled = parseInteger(diffAbledStr);
                    Integer blind = parseInteger(blindStr);

                    rows.add(SpecialCategoryAdmissionQuota.builder()
                            .documentId(documentId)
                            .academicYear(academicYear)
                            .universityName(uni)
                            .courseName(course)
                            .uniCodes(uniCodes)
                            .differentlyAbledSeats(diffAbled)
                            .blindBrailleSeats(blind)
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }
        return rows;
    }

    private Integer parseInteger(String val) {
        if (val == null || val.isBlank() || val.equals("-") || val.equals("–")) return null;
        Matcher m = NUMERIC_PATTERN.matcher(val);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group());
            } catch (Exception ignored) {}
        }
        return null;
    }

    private boolean isValidUniversity(String str) {
        if (str == null || str.isBlank()) return false;
        String lower = str.toLowerCase();
        return lower.contains("university") || lower.contains("campus") || lower.contains("institute") || lower.contains("eastern") || lower.contains("south");
    }

    @Override
    @Transactional(readOnly = true)
    public List<UniversityMediumOfInstruction> getMediumsByAcademicYear(String academicYear) {
        return universityMediumRepository.findByAcademicYear(academicYear);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpecialCategoryAdmissionQuota> getSpecialQuotasByAcademicYear(String academicYear) {
        return specialAdmissionQuotaRepository.findByAcademicYear(academicYear);
    }
}
