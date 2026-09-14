package com.pathwise.course.service.impl;

import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.course.entity.UniCode;
import com.pathwise.course.repository.UniCodeRepository;
import com.pathwise.course.service.UniCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class UniCodeServiceImpl implements UniCodeService {

    private final UniCodeRepository uniCodeRepository;
    private final DocumentPageRepository documentPageRepository;

    private static final Pattern UNICODE_PATTERN = Pattern.compile("\\b(\\d{3}[A-Za-z])\\b");

    @Override
    @Transactional
    public int promoteHandbookUniCodes(Document document) {
        if (document == null || document.getId() == null) {
            return 0;
        }

        List<DocumentPage> pages = (document.getPages() != null && !document.getPages().isEmpty())
                ? document.getPages()
                : documentPageRepository.findByDocumentIdOrderByPageNumberAsc(document.getId());

        if (pages == null || pages.isEmpty()) {
            log.warn("No pages found to extract Uni-Codes for Document ID: {}", document.getId());
            return 0;
        }

        log.info("Processing UGC Uni-Codes from Document ID: {} '{}' across {} pages",
                document.getId(), document.getTitle(), pages.size());

        Map<String, UniCode> uniCodeMap = new LinkedHashMap<>();

        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            parsePageForUniCodes(page.getExtractedText(), uniCodeMap);
        }

        if (uniCodeMap.isEmpty()) {
            log.warn("No Uni-Codes extracted from Document ID: {}", document.getId());
            return 0;
        }

        int savedCount = 0;
        for (UniCode incoming : uniCodeMap.values()) {
            Optional<UniCode> existingOpt = uniCodeRepository.findByCodeIgnoreCase(incoming.getCode());
            if (existingOpt.isPresent()) {
                UniCode existing = existingOpt.get();
                if (incoming.getCourseName() != null && !incoming.getCourseName().isBlank()) {
                    existing.setCourseName(incoming.getCourseName());
                }
                if (incoming.getUniversityName() != null && !incoming.getUniversityName().isBlank()) {
                    existing.setUniversityName(incoming.getUniversityName());
                }
                if (incoming.getStream() != null && !incoming.getStream().isBlank()) {
                    existing.setStream(incoming.getStream());
                }
                if (Boolean.TRUE.equals(incoming.getHasAptitudeTest())) {
                    existing.setHasAptitudeTest(true);
                }
                uniCodeRepository.save(existing);
            } else {
                uniCodeRepository.save(incoming);
            }
            savedCount++;
        }

        log.info("Successfully synced {} official UGC Uni-Codes to database for Document ID: {}",
                savedCount, document.getId());

        return savedCount;
    }

    private void parsePageForUniCodes(String text, Map<String, UniCode> map) {
        String[] lines = text.split("\\r?\\n");

        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("|") || trimmed.contains("---")) continue;

            String[] parts = trimmed.split("\\|");
            List<String> cells = Arrays.stream(parts).map(String::trim).filter(s -> !s.isEmpty()).toList();

            if (cells.size() < 2) continue;

            // Look for 4-character Uni-Code in any cell (e.g. 001A, 012C, 023G, 068C)
            String foundCode = null;
            int codeIndex = -1;

            for (int i = 0; i < cells.size(); i++) {
                Matcher matcher = UNICODE_PATTERN.matcher(cells.get(i));
                if (matcher.find()) {
                    foundCode = matcher.group(1).toUpperCase();
                    codeIndex = i;
                    break;
                }
            }

            if (foundCode == null || foundCode.isBlank()) continue;

            String courseName = "";
            String uniName = "";

            if (cells.size() >= 3) {
                if (codeIndex == 0) {
                    courseName = cells.get(1);
                    uniName = cells.get(2);
                } else if (codeIndex == cells.size() - 1 || codeIndex == 2) {
                    courseName = cells.get(0);
                    uniName = cells.get(1);
                } else if (codeIndex == 1) {
                    courseName = cells.get(0);
                    uniName = cells.get(2);
                }
            } else if (cells.size() == 2) {
                if (codeIndex == 0) {
                    courseName = cells.get(1);
                } else {
                    courseName = cells.get(0);
                }
            }

            // Skip table headers
            if (courseName.equalsIgnoreCase("Course of Study") || courseName.equalsIgnoreCase("Course") ||
                    uniName.equalsIgnoreCase("University") || courseName.equalsIgnoreCase("Uni-Code")) {
                continue;
            }

            if (courseName.length() > 195) courseName = courseName.substring(0, 195);
            if (uniName.length() > 195) uniName = uniName.substring(0, 195);

            String stream = inferStream(courseName);
            boolean hasAptitude = isAptitudeCourse(courseName, foundCode);

            UniCode uniCode = UniCode.builder()
                    .code(foundCode)
                    .courseName(!courseName.isBlank() ? courseName : "Undergraduate Course")
                    .universityName(!uniName.isBlank() ? uniName : "State University")
                    .stream(stream)
                    .hasAptitudeTest(hasAptitude)
                    .selectionMethod(hasAptitude ? "APTITUDE_TEST" : "MERIT_AND_DISTRICT")
                    .createdAt(LocalDateTime.now())
                    .build();

            map.put(foundCode, uniCode);
        }
    }

    private String inferStream(String courseName) {
        if (courseName == null || courseName.isBlank()) return "General";
        String lower = courseName.toLowerCase();

        if (lower.contains("medicine") || lower.contains("dental") || lower.contains("veterinary") ||
                lower.contains("biological") || lower.contains("agriculture") || lower.contains("nursing") ||
                lower.contains("pharmacy") || lower.contains("allied health") || lower.contains("physiotherapy") ||
                lower.contains("biomedical") || lower.contains("ayurveda") || lower.contains("siddha") || lower.contains("unani")) {
            return "Biological Science";
        }
        if (lower.contains("engineering") || lower.contains("physical science") || lower.contains("computer science") ||
                lower.contains("data science") || lower.contains("surveying") || lower.contains("architecture") ||
                lower.contains("quantity surveying") || lower.contains("mathematics") || lower.contains("statistics") ||
                lower.contains("artificial intelligence") || lower.contains("information systems") || lower.contains("software")) {
            return "Physical Science";
        }
        if (lower.contains("management") || lower.contains("commerce") || lower.contains("business") ||
                lower.contains("accounting") || lower.contains("finance") || lower.contains("marketing") ||
                lower.contains("human resource") || lower.contains("estate management") || lower.contains("hospitality")) {
            return "Commerce";
        }
        if (lower.contains("arts") || lower.contains("law") || lower.contains("music") || lower.contains("dance") ||
                lower.contains("drama") || lower.contains("visual") || lower.contains("design") || lower.contains("languages") ||
                lower.contains("mass media") || lower.contains("communication") || lower.contains("peace") || lower.contains("social")) {
            return "Arts";
        }
        if (lower.contains("technology") || lower.contains("biosystems") || lower.contains("engineering tech") ||
                lower.contains("ict") || lower.contains("information technology")) {
            return "Technology";
        }
        return "General";
    }

    private boolean isAptitudeCourse(String courseName, String code) {
        if (courseName == null) return false;
        String lower = courseName.toLowerCase();
        return lower.contains("architecture") || lower.contains("design") || lower.contains("fashion") ||
                lower.contains("music") || lower.contains("dance") || lower.contains("drama") ||
                lower.contains("visual") || lower.contains("sports") || lower.contains("physical education") ||
                lower.contains("film") || lower.contains("mass media");
    }

    @Override
    @Transactional(readOnly = true)
    public List<UniCode> getAllUniCodes() {
        return uniCodeRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public UniCode getByCode(String code) {
        if (code == null) return null;
        return uniCodeRepository.findByCodeIgnoreCase(code).orElse(null);
    }
}
