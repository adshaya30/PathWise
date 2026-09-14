package com.pathwise.course.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pathwise.admin.entity.Document;
import com.pathwise.admin.entity.DocumentPage;
import com.pathwise.admin.repository.DocumentPageRepository;
import com.pathwise.admin.service.GeminiQuotaManager;
import com.pathwise.course.entity.CoursePrerequisite;
import com.pathwise.course.entity.UniCode;
import com.pathwise.course.repository.CoursePrerequisiteRepository;
import com.pathwise.course.repository.UniCodeRepository;
import com.pathwise.course.service.CoursePrerequisiteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class CoursePrerequisiteServiceImpl implements CoursePrerequisiteService {

    private static final Pattern SECTION_HEADER = Pattern.compile(
            "(?m)^\\s*(\\d{1,2}(?:\\.\\d{1,2}){1,3})\\.?\\s+([A-Za-z][^\\n]*)$");
    private static final Pattern COURSE_CODE = Pattern.compile(
            "(?i)\\b(?:uni[ -]?code|cour[sz]e code)\\s*[-:]?\\s*(\\d{2,4})");
    private static final Pattern UNIVERSITY = Pattern.compile(
            "(?i)\\bavailable\\s+university\\s*:?\\s*(.+)");
    private static final Pattern REQ_MARKER = Pattern.compile(
            "(?i)\\bminimum\\s+eligibility\\s+requirements?\\s+for\\s+admission\\s*[:\\.]?");
    private static final Pattern REQ_END = Pattern.compile(
            "(?i)\\b(degree programme|degree programmes|available university|course duration|duration\\s*:|medium\\s*:|proposed intake|selection method)");
    private static final Pattern GRADE = Pattern.compile(
            "(?i)\\b(?:at least|minimum|of|one(?:\\s+of)?)?\\s*\\d+\\s*(?:of\\s+)?[“”\"'‘’]?\\s*([A-Ea-eS])\\s*[“”\"'‘’]?\\s*grades?\\b");
    private static final Pattern SPECIAL = Pattern.compile(
            "(?i)(practical test|aptitude test|interview|portfolio|special admission|special consideration)");
    private static final String BULLETS = "[\\u2022\\u00B7\\u2219\\u25AA\\uF0B7\\uE000-\\uF8FF]";
    private static final String DEFAULT_MIN_GRADE = "S";

    private static final List<String> KNOWN_SUBJECTS = List.of(
            "Information and Communication Technology",
            "Bio System Technology",
            "Science for Technology",
            "Engineering Technology",
            "Combined Mathematics",
            "Agricultural Science",
            "Business Studies",
            "Political Science",
            "Communication and Media",
            "Applied Mathematics",
            "Pure Mathematics",
            "Higher Mathematics",
            "Environmental Science",
            "Mathematics",
            "Chemistry",
            "Economics",
            "Geography",
            "Accounting",
            "Business Statistics",
            "Statistics",
            "Information & Communication Technology",
            "ICT",
            "Commerce",
            "Sociology",
            "Home Science",
            "Visual Arts",
            "Technology",
            "Agriculture",
            "Geology",
            "History",
            "Biology",
            "Physics",
            "Sinhala",
            "English",
            "Tamil"
    );

    private final CoursePrerequisiteRepository prerequisiteRepository;
    private final UniCodeRepository uniCodeRepository;
    private final DocumentPageRepository documentPageRepository;
    private final GeminiQuotaManager quotaManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    private static final List<String> AI_MODELS = List.of(
            "gemini-3.5-flash-lite",   // Primary
            "gemini-3.1-flash-lite",   // Fallback
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
    );

    @Override
    @Transactional
    public int promoteHandbookPrerequisites(Document document) {
        if (document == null || document.getId() == null) {
            return 0;
        }

        List<DocumentPage> pages = (document.getPages() != null && !document.getPages().isEmpty())
                ? document.getPages()
                : documentPageRepository.findByDocumentIdOrderByPageNumberAsc(document.getId());

        if (pages == null || pages.isEmpty()) {
            log.warn("No pages found for Document ID: {}", document.getId());
            return 0;
        }

        StringBuilder raw = new StringBuilder();
        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()) {
                continue;
            }
            raw.append(page.getExtractedText().replace("\r\n", "\n").replace("\r", "\n"))
                    .append("\n");
        }

        List<CourseBlock> blocks = splitIntoCourseBlocks(raw.toString());
        int promoted = 0;
        for (CourseBlock block : blocks) {
            try {
                if (persistBlock(block)) {
                    promoted++;
                }
            } catch (Exception ex) {
                log.warn("Skipped prerequisite block for course '{}' (code {}): {}",
                        block.courseName(), block.courseCode(), ex.getMessage());
            }
        }

        // The regex parser only understands one specific handbook section-numbering format.
        // When it finds nothing, fall back to direct AI structured extraction.
        if (promoted == 0) {
            int aiCount = extractPrerequisitesViaAi(document);
            log.info("Regex parser found 0 prerequisite blocks; AI extraction ingested {} A/L prerequisite rows into 'course_prerequisites' for Document ID: {}",
                    aiCount, document.getId());
            return aiCount;
        }

        log.info("Ingested {} A/L prerequisite rows into 'course_prerequisites' for Document ID: {}",
                promoted, document.getId());
        return promoted;
    }

    static List<CourseBlock> splitIntoCourseBlocks(String text) {
        List<CourseBlock> blocks = new ArrayList<>();

        Matcher matcher = SECTION_HEADER.matcher(text);
        List<HeaderMatch> headers = new ArrayList<>();
        while (matcher.find()) {
            headers.add(new HeaderMatch(matcher.start(), matcher.group(1), matcher.group(2).trim()));
        }

        // Only consider multi-level section numbers (e.g. 2.2.3.xx) as course entries
        List<HeaderMatch> courseHeaders = headers.stream()
                .filter(h -> h.number().split("\\.").length >= 4)
                .toList();

        for (int i = 0; i < courseHeaders.size(); i++) {
            HeaderMatch header = courseHeaders.get(i);
            int end = i + 1 < courseHeaders.size() ? courseHeaders.get(i + 1).start() : text.length();
            String blockText = text.substring(header.start(), end);

            Matcher codeMatcher = COURSE_CODE.matcher(blockText);
            if (!codeMatcher.find()) {
                continue;
            }

            String courseName = normalizeCourseName(header.name());
            if (courseName.isEmpty()) {
                continue;
            }

            blocks.add(new CourseBlock(courseName, codeMatcher.group(1), blockText));
        }
        return blocks;
    }

    private boolean persistBlock(CourseBlock block) {
        String courseName = block.courseName();
        String classText = block.blockText();
        String code = block.courseCode();

        Matcher uniMatcher = UNIVERSITY.matcher(classText);
        String universityName = uniMatcher.find()
                ? cleanSegment(uniMatcher.group(1))
                : null;

        Matcher reqMatcher = REQ_MARKER.matcher(classText);
        if (!reqMatcher.find()) {
            return false;
        }
        int reqStart = reqMatcher.end();
        Matcher endMatcher = REQ_END.matcher(classText);
        int reqEnd = endMatcher.find()
                ? Math.min(endMatcher.start(), classText.length())
                : classText.length();
        String requirement = cleanSegment(classText.substring(reqStart, reqEnd));
        if (requirement.isBlank()) {
            return false;
        }

        Optional<UniCode> uniCodeOpt = resolveUniCode(code, courseName, universityName);
        String stream = uniCodeOpt.map(UniCode::getStream)
                .filter(s -> s != null && !s.isBlank())
                .orElseGet(() -> inferStream(requirement));

        String cleanedRequirement = stripOlSentences(requirement);
        PoolRequirement pool = extractPoolRequirement(cleanedRequirement);
        List<String> subjects = pool != null
                ? List.of(pool.subjects())
                : extractSubjectsWithGrades(requirement);
        if (subjects.isEmpty()) {
            // No known subject names found in text — use per-stream defaults, annotated with the overall grade.
            String fallbackGrade = extractGrade(cleanedRequirement);
            subjects = subjectsFromStream(stream).stream()
                    .map(s -> fallbackGrade.equalsIgnoreCase(DEFAULT_MIN_GRADE)
                            ? s
                            : s + " (" + fallbackGrade + ")")
                    .toList();
        }
        String subjectList = String.join(", ", subjects);

        String specialRequirements = extractSpecialRequirements(requirement);
        if (pool != null && pool.note() != null) {
            specialRequirements = specialRequirements == null
                    ? pool.note()
                    : specialRequirements + " " + pool.note();
        }

        CoursePrerequisite row = prerequisiteRepository
                .findByCourseNameIgnoreCaseAndStreamIgnoreCase(courseName, stream)
                .orElseGet(() -> CoursePrerequisite.builder()
                        .courseName(courseName)
                        .stream(stream)
                        .createdAt(LocalDateTime.now())
                        .build());

        row.setRequiredSubjects(subjectList);
        row.setAlternativeSubjects(null);
        row.setSpecialRequirements(specialRequirements);
        row.setDescription(requirement);

        prerequisiteRepository.save(row);
        return true;
    }

    private Optional<UniCode> resolveUniCode(String code, String courseName, String universityName) {
        if (code != null && !code.isBlank()) {
            Optional<UniCode> byCode = uniCodeRepository.findByCodeIgnoreCase(code);
            if (byCode.isPresent()) {
                return byCode;
            }
        }
        if (courseName != null && universityName != null) {
            Optional<UniCode> byPair = uniCodeRepository
                    .findByCourseNameIgnoreCaseAndUniversityNameIgnoreCase(courseName, universityName);
            if (byPair.isPresent()) {
                return byPair;
            }
        }
        if (courseName != null) {
            List<UniCode> byName = uniCodeRepository.findByCourseNameIgnoreCase(courseName);
            if (!byName.isEmpty()) {
                return Optional.of(byName.get(0));
            }
        }
        return Optional.empty();
    }

    static String inferStream(String requirement) {
        String lower = requirement.toLowerCase(Locale.ROOT);
        if (lower.contains("biological")) {
            return "Biological Science";
        }
        if (lower.contains("physical")) {
            return "Physical Science";
        }
        if (lower.contains("commerce")) {
            return "Commerce";
        }
        if (lower.contains("arts")) {
            return "Arts";
        }
        if (lower.contains("technology")) {
            return "Technology";
        }
        return "General";
    }

    static List<String> subjectsFromStream(String stream) {
        if (stream == null) {
            return List.of();
        }
        return switch (stream.toLowerCase(Locale.ROOT)) {
            case "biological science" -> List.of("Chemistry", "Physics", "Biology");
            case "physical science" -> List.of("Chemistry", "Physics", "Combined Mathematics");
            case "commerce" -> List.of("Accounting", "Business Studies", "Economics");
            default -> List.of();
        };
    }

    static List<String> extractSubjects(String requirement) {
        return findSubjectMatches(requirement).stream()
                .map(SubjectMatch::subject)
                .toList();
    }

    /**
     * Finds subjects and annotates each with its minimum grade inline,
     * e.g. "Chemistry (C)", "Physics (B)".
     */
    static List<String> extractSubjectsWithGrades(String requirement) {
        String cleaned = stripOlSentences(requirement);
        PoolRequirement pool = extractPoolRequirement(cleaned);
        if (pool != null) {
            // Choose-N-from-pool — "Any 3 of the following: Subject A, Subject B, ..."
            // (the grade rule goes into specialRequirements via the note).
            return List.of(pool.subjects());
        }
        if (isAnySubjectsRequirement(cleaned)) {
            // Free-choice requirement — store the handbook wording verbatim,
            // e.g. "At least 'S' grades in any three subjects at the G.C.E.
            // (Advanced Level) Examination."
            String verbatim = freeChoiceSentence(requirement);
            return verbatim.isBlank() ? List.of() : List.of(verbatim);
        }
        List<SubjectMatch> found = findSubjectMatches(cleaned);
        List<GradeToken> grades = findGradeTokens(cleaned);

        // Walk subject + grade positions in order: a grade token applies to every
        // subject that follows it until the next grade token ("S grades in Chemistry,
        // Physics and Biology" -> all get S; "C grade in Chemistry and B grade in
        // Physics" -> Chemistry C, Physics B).
        List<String> result = new ArrayList<>();
        int gi = 0;
        String currentGrade = null;
        for (SubjectMatch match : found) {
            while (gi < grades.size() && grades.get(gi).index() < match.index()) {
                currentGrade = grades.get(gi).grade();
                gi++;
            }
            result.add(currentGrade == null ? match.subject() : match.subject() + " (" + currentGrade + ")");
        }
        return result;
    }

    /**
     * Detects "at least 'S' grades in any three subjects" free-choice requirements,
     * where no specific subjects are mandated.
     */
    private static final Pattern ANY_SUBJECTS = Pattern.compile(
        "\\bany\\s+(0?\\d+|one|two|three|four|five|six)\\s+subjects?\\b",
        Pattern.CASE_INSENSITIVE);

    /**
     * Choose-N-from-pool pattern, e.g. "passed the three subjects with at least 'C'
     * grades in two of the following subjects" followed by a bulleted pool list.
     */
    private static final Pattern POOL_PHRASE = Pattern.compile(
            "(?i)\\bof\\s+the\\s+following\\s+subjects?\\b");
    private static final Pattern POOL_PICK = Pattern.compile(
            "(?i)\\b(one|two|three|four|five|six|\\d{1,2})\\s+subjects?\\b");
    private static final Pattern POOL_GRADE_RULE = Pattern.compile(
            "(?i)\\bat\\s+least\\s+['\"“”‘’]?([A-Ea-eS])['\"“”‘’]?\\s+grades?\\s+in\\s+"
                    + "(one|two|three|four|five|six|\\d{1,2})\\s+of\\s+the\\s+following\\b");

    private static String wordNumber(String raw) {
        if (raw == null) {
            return null;
        }
        return switch (raw.toLowerCase(Locale.ROOT)) {
            case "one", "1", "01" -> "1";
            case "two", "2", "02" -> "2";
            case "three", "3", "03" -> "3";
            case "four", "4", "04" -> "4";
            case "five", "5", "05" -> "5";
            case "six", "6", "06" -> "6";
            default -> raw.replaceFirst("^0+", "");
        };
    }

    record PoolRequirement(String subjects, String note) { }

    /**
     * Detects "choose N of the following subjects" requirements where a pool of
     * subjects is listed and only some of them are mandatory. Returns the structured
     * representation, e.g. required_subjects = "Any 3 of the following: ..." and a
     * special requirement note describing the grade rule, or null when not a pool.
     */
    static PoolRequirement extractPoolRequirement(String cleaned) {
        Matcher pool = POOL_PHRASE.matcher(cleaned);
        if (!pool.find()) {
            return null;
        }

        String poolText = cleaned.substring(pool.end());
        List<String> poolSubjects = findSubjectMatches(poolText).stream()
                .map(SubjectMatch::subject)
                .toList();
        if (poolSubjects.isEmpty()) {
            return null;
        }

        String pre = cleaned.substring(0, pool.start());
        String pick = null;
        Matcher pc = POOL_PICK.matcher(pre);
        if (pc.find()) {
            pick = wordNumber(pc.group(1));
        }

        String grade = findGradeInText(pre);
        String count = null;
        Matcher gr = POOL_GRADE_RULE.matcher(cleaned);
        if (gr.find()) {
            if (grade == null) {
                grade = gr.group(1).toUpperCase(Locale.ROOT);
            }
            count = wordNumber(gr.group(2));
        }

        String subjects = "Any " + (pick == null ? "" : pick + " ") + "of the following: "
                + String.join(", ", poolSubjects);
        String note = null;
        if (grade != null) {
            String countText = count != null ? count : "one";
            note = "At least " + countText + " of the " + (pick == null ? "" : pick + " ")
                    + "A/L subjects must be at least grade " + grade
                    + " and from the listed subjects.";
        }
        return new PoolRequirement(subjects, note);
    }

    /**
     * Detects "at least 'S' grades in any three subjects" free-choice requirements,
     * where no specific subjects are mandated.
     */
    private static boolean isAnySubjectsRequirement(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return ANY_SUBJECTS.matcher(text).find();
    }

    /**
     * Returns the exact sentence (verbatim from the source text) that contains the
     * "any ... subjects" phrase, preserving original wording like "G.C.E.".
     * Sentence boundaries intentionally ignore abbreviation dots (e.g. the periods
     * inside "G.C.E.") and trailing O/L clauses.
     */
    private static String freeChoiceSentence(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        Matcher m = ANY_SUBJECTS.matcher(text);
        if (!m.find()) {
            return "";
        }

        int start = 0;
        for (int i = m.start() - 1; i >= 0; i--) {
            char c = text.charAt(i);
            if (c == '.' || c == '\n' || c == ':') {
                if (c == '.' && isAbbreviationDot(text, i)) {
                    continue;
                }
                start = i + 1;
                break;
            }
        }

        int end = text.length();
        for (int i = m.end(); i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '.' || c == '\n') {
                if (c == '.' && isAbbreviationDot(text, i)) {
                    continue;
                }
                end = i + 1;
                break;
            }
        }

        return start >= end ? text.trim() : text.substring(start, end).trim();
    }

    private static boolean isAbbreviationDot(String text, int dotIndex) {
        // "G.C.E." -> every dot is preceded by a single uppercase letter.
        return dotIndex > 0 && Character.isUpperCase(text.charAt(dotIndex - 1));
    }

    /**
     * Removes sentences that describe O/L (Ordinary Level) requirements, so O/L-only
     * subjects (e.g. English) are not mistaken for A/L prerequisites.
     */
    static String stripOlSentences(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        // Normalize the "G.C.E." abbreviation so the periods don't split the sentence.
        String normalized = text.replaceAll("(?i)\\bG\\.?C\\.?E\\.?", "GCE");
        String[] sentences = normalized.split("(?<=[.:])\\s+");
        List<String> kept = new ArrayList<>();
        boolean inOl = false;
        for (String sentence : sentences) {
            boolean isOlSentence = sentence.matches(
                    "(?i).*(ordinary\\s+level|\\bo/l\\b|credit\\s+pass|ordinary\\s+pass).*")
                    || sentence.matches("(?is)\\s*\\((?:i|ii|iii|iv|v|vi|vii)\\)[\\s\\S]*");
            if (isOlSentence) {
                // Once an O/L clause is met, any following numbered items belong to
                // that O/L block, e.g. "(i) At least a Credit Pass (C) in English".
                inOl = true;
                continue;
            }
            if (inOl && sentence.matches("(?i).*credit.*")) {
                continue;
            }
            kept.add(sentence);
        }
        return kept.isEmpty() ? text : String.join(" ", kept);
    }

    private static List<GradeToken> findGradeTokens(String text) {
        List<GradeToken> tokens = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return tokens;
        }
        Matcher parenthesized = Pattern.compile("\\(([A-Ea-eS])\\)").matcher(text);
        while (parenthesized.find()) {
            tokens.add(new GradeToken(parenthesized.start(),
                    parenthesized.group(1).toUpperCase(Locale.ROOT)));
        }
        Matcher quoted = Pattern.compile(
                "(?:at\\s+least\\s+)?(?:(?:a|an|one|two|three|four|five|six)\\s+)?['\"“‘”’]?([A-Ea-eS])['\"“‘”’]?\\s+grades?\\b")
                .matcher(text);
        while (quoted.find()) {
            tokens.add(new GradeToken(quoted.start(),
                    quoted.group(1).toUpperCase(Locale.ROOT)));
        }
        Matcher afterGrade = Pattern.compile("\\bgrades?\\s+(?:of\\s+)?(['\"“‘”’]?)([A-Ea-eS])\\1\\b")
                .matcher(text);
        while (afterGrade.find()) {
            tokens.add(new GradeToken(afterGrade.start(),
                    afterGrade.group(2).toUpperCase(Locale.ROOT)));
        }
        Matcher bare = Pattern.compile("\\b(?:at\\s+least\\s+)?(?:an?\\s+)?([A-Ea-eS])\\b(?![A-Za-z/])")
                .matcher(text);
        while (bare.find()) {
            tokens.add(new GradeToken(bare.start(),
                    bare.group(1).toUpperCase(Locale.ROOT)));
        }

        tokens.sort(Comparator.comparingInt(GradeToken::index));
        List<GradeToken> deduped = new ArrayList<>();
        for (GradeToken token : tokens) {
            if (deduped.isEmpty() || deduped.get(deduped.size() - 1).index() != token.index()) {
                deduped.add(token);
            }
        }
        return deduped;
    }

    private record GradeToken(int index, String grade) { }

    private static List<SubjectMatch> findSubjectMatches(String requirement) {
        String lower = requirement.toLowerCase(Locale.ROOT);
        List<SubjectMatch> found = new ArrayList<>();
        List<int[]> usedRanges = new ArrayList<>();

        List<String> vocabulary = KNOWN_SUBJECTS.stream()
                .map(String::trim)
                .distinct()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .toList();

        for (String subject : vocabulary) {
            String term = subject.toLowerCase(Locale.ROOT);
            int idx = lower.indexOf(term);
            while (idx >= 0) {
                if (!hasWordBoundary(lower, idx, term.length())) {
                    idx = lower.indexOf(term, idx + 1);
                    continue;
                }
                if (overlaps(usedRanges, idx, term.length())) {
                    idx = lower.indexOf(term, idx + 1);
                    continue;
                }
                found.add(new SubjectMatch(idx, subject));
                usedRanges.add(new int[]{idx, idx + term.length()});
                break;
            }
        }

        found.sort(Comparator.comparingInt(SubjectMatch::index));
        return found;
    }

    private static boolean hasWordBoundary(String lower, int start, int length) {
        int end = start + length;
        boolean beforeOk = start == 0 || !Character.isLetterOrDigit(lower.charAt(start - 1));
        boolean afterOk = end >= lower.length() || !Character.isLetterOrDigit(lower.charAt(end));
        return beforeOk && afterOk;
    }

    private static boolean overlaps(List<int[]> ranges, int start, int length) {
        int end = start + length;
        for (int[] range : ranges) {
            if (start < range[1] && range[0] < end) {
                return true;
            }
        }
        return false;
    }

    static String extractGrade(String requirement) {
        String grade = findGradeInText(requirement);
        return grade == null ? DEFAULT_MIN_GRADE : grade;
    }

    private static String findGradeInText(String requirement) {
        return findGradeInWindow(requirement);
    }

    /**
     * Detects a grade letter from phrasings like "at least a 'C' grade", "(C)",
     * "at least C", "grade C", or the classic "at least 2 Grade C" format.
     */
    private static String findGradeInWindow(String window) {
        if (window == null || window.isBlank()) {
            return null;
        }
        Matcher parenthesized = Pattern.compile("\\(([A-Ea-eS])\\)").matcher(window);
        if (parenthesized.find()) {
            return parenthesized.group(1).toUpperCase(Locale.ROOT);
        }
        Matcher gradeInQuote = Pattern.compile(
                "(?:at\\s+least\\s+)?(?:(?:a|an|one|two|three|four|five|six)\\s+)?['\"“‘”’]?([A-Ea-eS])['\"“‘”’]?\\s+grades?\\b")
                .matcher(window);
        if (gradeInQuote.find()) {
            return gradeInQuote.group(1).toUpperCase(Locale.ROOT);
        }
        Matcher bare = Pattern.compile("\\bat\\s+least\\s+(?:an?\\s+)?([A-Ea-eS])\\b(?![A-Za-z/])")
                .matcher(window);
        if (bare.find()) {
            return bare.group(1).toUpperCase(Locale.ROOT);
        }
        Matcher gradeThenLetter = Pattern.compile("\\bgrades?\\s+(?:of\\s+)?(['\"“‘”’]?)([A-Ea-eS])\\1\\b")
                .matcher(window);
        if (gradeThenLetter.find()) {
            return gradeThenLetter.group(2).toUpperCase(Locale.ROOT);
        }
        Matcher classic = GRADE.matcher(window);
        if (classic.find()) {
            return classic.group(1).toUpperCase(Locale.ROOT);
        }
        return null;
    }

    private String extractSpecialRequirements(String requirement) {
        if (!SPECIAL.matcher(requirement).find()) {
            return null;
        }
        String[] sentences = requirement.split("(?<=[.:])\\s+");
        List<String> flagged = new ArrayList<>();
        for (String sentence : sentences) {
            if (SPECIAL.matcher(sentence).find()) {
                flagged.add(sentence.trim());
            }
        }
        return flagged.isEmpty() ? null : String.join(" ", flagged);
    }

    static String normalizeCourseName(String name) {
        if (name == null) {
            return "";
        }
        String cleaned = name.trim()
                .replaceAll("\\s*\\[.*$", "")
                .replaceAll("\\s*\\(.*$", "")
                .replaceAll("[\\s.]+$", "")
                .trim();
        return cleaned.replaceFirst("\\.$", "").trim();
    }

    private String cleanSegment(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replaceAll(BULLETS, " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    // ─── AI-Powered Prerequisite Extraction ─────────────────────────────────

    private int extractPrerequisitesViaAi(Document document) {
        if (geminiApiKey == null || geminiApiKey.isBlank()
                || geminiApiKey.equalsIgnoreCase("your_gemini_api_key_here")) {
            log.warn("GEMINI_API_KEY not configured; skipping AI prerequisite extraction.");
            return 0;
        }

        List<DocumentPage> pages = (document.getPages() != null && !document.getPages().isEmpty())
                ? document.getPages()
                : documentPageRepository.findByDocumentIdOrderByPageNumberAsc(document.getId());

        if (pages == null || pages.isEmpty()) {
            return 0;
        }

        int saved = 0;
        for (DocumentPage page : pages) {
            if (page.getExtractedText() == null || page.getExtractedText().isBlank()
                    || page.getExtractedText().contains("[Blank")
                    || page.getExtractedText().contains("No Extractable Text")) {
                continue;
            }
            if (!looksLikePrerequisitePage(page.getExtractedText())) {
                continue;
            }

            try {
                String json = callGeminiForPrerequisites(page.getExtractedText());
                List<PrerequisiteItem> items = parsePrerequisiteJson(json);
                for (PrerequisiteItem item : items) {
                    try {
                        if (persistAiItem(item)) {
                            saved++;
                        }
                    } catch (Exception itemEx) {
                        log.warn("Failed to persist AI prerequisite for '{}': {}",
                                item.courseName(), itemEx.getMessage());
                    }
                }
            } catch (Exception pageEx) {
                log.warn("AI prerequisite extraction failed for page {}: {}",
                        page.getPageNumber(), pageEx.getMessage());
            }
        }

        log.info("AI prerequisite extraction ingested {} rows for Document ID: {}", saved, document.getId());
        return saved;
    }

    private boolean looksLikePrerequisitePage(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.contains("minimum eligib")
                || lower.contains("eligibility requirements")
                || lower.contains("entry requirements")
                || lower.contains("subject combination")
                || lower.contains("minimum subject")
                || lower.contains("qualification")
                || lower.contains("prerequ");
    }

    private String callGeminiForPrerequisites(String pageText) throws Exception {
        if (!quotaManager.canMakeRequest()) {
            throw new RuntimeException("Daily Gemini API quota exceeded.");
        }

        String prompt = buildPrerequisitePrompt(pageText);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.0,
                        "maxOutputTokens", 4096
                )
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);
        String cleanKey = geminiApiKey.trim();

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

        String lastError = "";
        for (String modelName : AI_MODELS) {
            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + modelName + ":generateContent";
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint + "?key=" + cleanKey))
                        .header("Content-Type", "application/json")
                        .header("x-goog-api-key", cleanKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                        .timeout(Duration.ofSeconds(120))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                int statusCode = response.statusCode();

                if (statusCode >= 200 && statusCode < 300) {
                    JsonNode root = objectMapper.readTree(response.body());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && !candidates.isEmpty()) {
                        JsonNode textNode = candidates.get(0)
                                .path("content")
                                .path("parts")
                                .get(0)
                                .path("text");
                        String resultText = textNode.asText().trim();
                        log.info("Gemini extracted prerequisite JSON ({} chars) using '{}'", resultText.length(), modelName);
                        quotaManager.incrementUsage();
                        return cleanJsonFences(resultText);
                    }
                }

                if (statusCode == 401 || statusCode == 403) {
                    throw new IllegalStateException("Gemini authentication failed (" + statusCode + ")");
                }
                if (statusCode == 429) {
                    throw new IllegalStateException("Gemini rate limit exceeded (429)");
                }

                lastError = String.format("Status %d for '%s': %s", statusCode, modelName, response.body());
                log.info("Gemini model '{}' returned {}. Skipping to next model...", modelName, statusCode);
            } catch (IllegalStateException e) {
                throw e;
            } catch (Exception modelEx) {
                lastError = modelEx.getMessage();
                log.warn("Exception calling Gemini model '{}': {}", modelName, lastError);
            }
        }

        throw new RuntimeException("All Gemini models failed for prerequisite extraction: " + lastError);
    }

    private static String buildPrerequisitePrompt(String pageText) {
        return "You are extracting official UGC A/L subject prerequisites (the 'Minimum Eligibility Requirements for Admission' "
                + "sections) from a Sri Lankan university admissions handbook text page.\n\n"
                + "For EVERY course on this page that has such a section, produce one JSON object in a JSON array:\n"
                + "- \"courseName\": the course of study name as written (e.g. \"Bachelor of Medicine\" or \"Medicine\")\n"
                + "- \"stream\": one of \"Biological Science\", \"Physical Science\", \"Commerce\", \"Arts\", \"Technology\", \"General\" "
                + "(infer from the subjects: Chemistry/Physics/Biology -> Biological Science; Combined Mathematics + Physics -> Physical Science)\n"
                + "- \"requiredSubjects\": array of required A/L subjects where each subject carries its own minimum grade inline as "
                + "\"Subject (Grade)\" when the handbook specifies one, e.g. [\"Chemistry (C)\",\"Physics (B)\",\"Biology\"]; "
                + "if a single common grade applies to all subjects, put it inline on every one of them; "
                + "if no grade is stated for a subject, give just the subject name; "
                + "if the handbook says \"any three subjects\" (no fixed subject list), set requiredSubjects to the exact "
                + "requirement sentence, e.g. [\"At least 'S' grades in any three subjects at the G.C.E. (Advanced Level) Examination.\"]\n"
                + "if the candidate needs X subjects with a minimum grade in N of them chosen from a pool "
                + "(e.g. \"passed the three subjects with at least 'C' grades in two of the following subjects\" followed by a bullet list), "
                + "set requiredSubjects to [\"Any 3 of the following: Higher Mathematics, Chemistry, ...\"] listing every pool subject as a single entry "
                + "without grades, and set specialRequirements to \"At least 2 of the 3 A/L subjects must be at least grade C and from the listed subjects.\"\n"
                + "- \"minimumGrade\": the common minimum grade for subjects that have no inline grade, e.g. \"C\" (default \"S\")\n"
                + "- \"alternativeSubjects\": a short string describing allowed alternatives, or null\n"
                + "- \"specialRequirements\": a short string for practical/aptitude tests, interviews, portfolios, etc., or null\n\n"
                + "RULES:\n"
                + "- Output ONLY the JSON array. No markdown fences, no commentary, no trailing text.\n"
                + "- Do not invent courses; only include courses actually present in the text.\n"
                + "- This page covers A/L prerequisites only - do NOT include O/L (Ordinary Level) subject requirements.\n"
                + "- Ignore sentences like \"at least an Ordinary Pass (S) in English at the G.C.E. (O/L)\" "
                + "when building requiredSubjects; those grades belong to O/L, not A/L.\n\n"
                + "HANDBOOK TEXT:\n"
                + capText(pageText);
    }

    private static String capText(String text) {
        if (text == null) {
            return "";
        }
        return text.length() > 15000 ? text.substring(0, 15000) : text;
    }

    private List<PrerequisiteItem> parsePrerequisiteJson(String raw) throws Exception {
        String cleaned = cleanJsonFences(raw);
        JsonNode node = objectMapper.readTree(cleaned);
        if (node.isObject()) {
            node = objectMapper.valueToTree(List.of(node));
        }

        List<PrerequisiteItem> items = new ArrayList<>();
        if (!node.isArray()) {
            return items;
        }

        for (JsonNode item : node) {
            String courseName = normalizeCourseName(item.path("courseName").asText(""));
            if (courseName.isEmpty()) {
                continue;
            }
            String stream = normalizeStream(item.path("stream").asText("General"));

            List<String> subjects = new ArrayList<>();
            JsonNode subs = item.path("requiredSubjects");
            if (subs.isArray()) {
                subs.forEach(subject -> {
                    String value = subject.asText("").trim();
                    if (!value.isEmpty() && !value.equalsIgnoreCase("null")) {
                        subjects.add(value);
                    }
                });
            }

            items.add(new PrerequisiteItem(
                    courseName,
                    stream,
                    subjects,
                    normalizeGrade(item.path("minimumGrade").asText("S")),
                    cleanNullable(item.path("alternativeSubjects").asText("")),
                    cleanNullable(item.path("specialRequirements").asText(""))
            ));
        }
        return items;
    }

    private boolean persistAiItem(PrerequisiteItem item) {
        if (item.courseName().isBlank() || item.stream().isBlank()) {
            return false;
        }

        CoursePrerequisite row = prerequisiteRepository
                .findByCourseNameIgnoreCaseAndStreamIgnoreCase(item.courseName(), item.stream())
                .orElseGet(() -> CoursePrerequisite.builder()
                        .courseName(item.courseName())
                        .stream(item.stream())
                        .createdAt(LocalDateTime.now())
                        .build());

        List<String> subjects;
        if (item.subjects().isEmpty()) {
            subjects = subjectsFromStream(item.stream());
        } else {
            subjects = item.subjects();
        }

        List<String> merged = new ArrayList<>();
        for (String subject : subjects) {
            if (hasInlineGrade(subject) || !isPlainSubjectName(subject) || item.minimumGrade().equals(DEFAULT_MIN_GRADE)) {
                merged.add(subject);
            } else {
                merged.add(subject + " (" + item.minimumGrade() + ")");
            }
        }
        row.setRequiredSubjects(merged.isEmpty() ? "General" : String.join(", ", merged));
        row.setAlternativeSubjects(item.alternativeSubjects());
        row.setSpecialRequirements(item.specialRequirements());
        row.setDescription(null);

        prerequisiteRepository.save(row);
        return true;
    }

    private static String normalizeStream(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("null")) {
            return "General";
        }
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.contains("biological")) return "Biological Science";
        if (lower.contains("physical")) return "Physical Science";
        if (lower.contains("commerce")) return "Commerce";
        if (lower.contains("art")) return "Arts";
        if (lower.contains("technolog")) return "Technology";
        return "General";
    }

    private static String normalizeGrade(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("null")
                || value.equals("-") || value.equals("–")) {
            return "S";
        }
        String grade = value.trim().toUpperCase(Locale.ROOT);
        return grade.length() > 10 ? grade.substring(0, 10) : grade;
    }

    private static boolean hasInlineGrade(String subjectEntry) {
        return subjectEntry != null && subjectEntry.matches(".*\\s\\([A-Ea-eS]\\)\\s*$");
    }

    private static boolean isPlainSubjectName(String subjectEntry) {
        // Plain A/L subject names like "Chemistry" or "Information and Communication
        // Technology". Sentences, grade annotations and pool descriptors ("Any 3 of the
        // following: ...") are excluded so the default grade is never appended to them.
        return subjectEntry != null && subjectEntry.matches("[A-Za-z& .]+");
    }

    private static String cleanNullable(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("null")
                || value.equals("-") || value.equals("–")) {
            return null;
        }
        return value.trim();
    }

    private static String cleanJsonFences(String text) {
        if (text == null) {
            return "";
        }
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring("```json".length());
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    private record PrerequisiteItem(
            String courseName,
            String stream,
            List<String> subjects,
            String minimumGrade,
            String alternativeSubjects,
            String specialRequirements
    ) { }

    record CourseBlock(String courseName, String courseCode, String blockText) { }

    record HeaderMatch(int start, String number, String name) { }

    private record SubjectMatch(int index, String subject) { }
}