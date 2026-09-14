package com.pathwise.afteral.service.impl;

import com.pathwise.afteral.dto.CourseViewDto;
import com.pathwise.afteral.service.AfterAlCourseEnrichmentService;
import com.pathwise.course.dto.EligibilityResultDto;
import com.pathwise.course.entity.*;
import com.pathwise.course.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AfterAlCourseEnrichmentServiceImpl implements AfterAlCourseEnrichmentService {

    private final UniCodeRepository uniCodeRepository;
    private final CourseRepository courseRepository;
    private final CoursePrerequisiteRepository prerequisiteRepository;
    private final CourseOlRequirementRepository olRequirementRepository;
    private final CourseAptitudeTestRequirementRepository aptitudeTestRepository;

    /**
     * Reference data loaded ONCE per enrichAll call. Enriching hundreds of courses
     * against these maps avoids hundreds of per-course DB round-trips (N+1).
     */
    private record EnrichmentData(
            Map<String, UniCode> uniByCode,
            Map<String, UniCode> uniByCourseUni,
            Map<String, Course> courseByName,
            List<Course> allCourses,
            List<CoursePrerequisite> prerequisites,
            List<CourseOlRequirement> olRows,
            List<CourseAptitudeTestRequirement> aptitudeRows
    ) {
        static String courseUniKey(String course, String uni) {
            return (course.trim() + "||" + uni.trim()).toLowerCase(Locale.ROOT);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public CourseViewDto enrich(EligibilityResultDto.MatchedUniCodeDto matched, String academicYear, String stream) {
        if (matched == null) {
            return null;
        }
        return enrichWithData(matched, stream, loadEnrichmentData(academicYear));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseViewDto> enrichAll(
            List<EligibilityResultDto.MatchedUniCodeDto> matchedCourses,
            String academicYear,
            String stream
    ) {
        if (matchedCourses == null || matchedCourses.isEmpty()) {
            return List.of();
        }

        EnrichmentData data = loadEnrichmentData(academicYear);

        List<CourseViewDto> enriched = new ArrayList<>(matchedCourses.size());
        for (EligibilityResultDto.MatchedUniCodeDto matched : matchedCourses) {
            CourseViewDto view = enrichWithData(matched, stream, data);
            if (view != null) {
                enriched.add(view);
            }
        }
        return enriched;
    }

    private EnrichmentData loadEnrichmentData(String academicYear) {
        List<UniCode> uniCodes = uniCodeRepository.findAll();

        Map<String, UniCode> uniByCode = new HashMap<>();
        Map<String, UniCode> uniByCourseUni = new HashMap<>();
        uniCodes.forEach(uniCode -> {
            if (uniCode.getCode() != null && !uniCode.getCode().isBlank()) {
                uniByCode.putIfAbsent(uniCode.getCode().trim().toLowerCase(Locale.ROOT), uniCode);
            }
            if (uniCode.getCourseName() != null && !uniCode.getCourseName().isBlank()
                    && uniCode.getUniversityName() != null && !uniCode.getUniversityName().isBlank()) {
                uniByCourseUni.putIfAbsent(
                        EnrichmentData.courseUniKey(uniCode.getCourseName(), uniCode.getUniversityName()),
                        uniCode
                );
            }
        });

        List<Course> allCourses = courseRepository.findAll();
        Map<String, Course> courseByName = new HashMap<>();
        allCourses.forEach(course -> {
            if (course.getName() != null && !course.getName().isBlank()) {
                courseByName.putIfAbsent(course.getName().trim().toLowerCase(Locale.ROOT), course);
            }
        });

        List<CourseOlRequirement> olRows = academicYear != null && !academicYear.isBlank()
                ? olRequirementRepository.findByAcademicYear(academicYear)
                : olRequirementRepository.findAll();
        if (olRows.isEmpty()) {
            olRows = olRequirementRepository.findAll();
        }

        List<CourseAptitudeTestRequirement> aptitudeRows = academicYear != null && !academicYear.isBlank()
                ? aptitudeTestRepository.findByAcademicYear(academicYear)
                : aptitudeTestRepository.findAll();
        if (aptitudeRows.isEmpty()) {
            aptitudeRows = aptitudeTestRepository.findAll();
        }

        return new EnrichmentData(
                uniByCode,
                uniByCourseUni,
                courseByName,
                allCourses,
                prerequisiteRepository.findAll(),
                olRows,
                aptitudeRows
        );
    }

    private CourseViewDto enrichWithData(
            EligibilityResultDto.MatchedUniCodeDto matched,
            String stream,
            EnrichmentData data
    ) {
        CourseViewDto view = CourseViewDto.fromMatched(matched);
        if (view == null) {
            return null;
        }

        findUniCode(matched, data).ifPresent(uniCode -> applyUniCodeMetadata(view, uniCode));

        findCourseByName(matched.getCourseName(), data).ifPresent(course -> {
            if (course.getDurationYears() != null) {
                view.setDurationYears(course.getDurationYears());
                view.setDurationLabel(formatDuration(course.getDurationYears()));
            }
            if (course.getStream() != null && !course.getStream().isBlank()) {
                view.setStream(course.getStream());
            }
        });

        findPrerequisite(matched.getCourseName(), stream, data).ifPresent(prereq -> {
            view.setAlPrerequisitesSummary(buildAlPrerequisiteSummary(prereq));
            if (prereq.getSpecialRequirements() != null && !prereq.getSpecialRequirements().isBlank()) {
                view.setAptitudeTestNotes(mergeNotes(view.getAptitudeTestNotes(), prereq.getSpecialRequirements()));
            }
        });

        findOlRequirement(matched.getCourseName(), data).ifPresent(ol -> {
            if (view.getOlRequirementsSummary() == null || view.getOlRequirementsSummary().isBlank()) {
                view.setOlRequirementsSummary(buildOlRequirementSummary(ol));
            }
        });

        findAptitudeRequirement(matched, data).ifPresent(aptitude -> {
            view.setHasAptitudeTest(true);
            view.setAptitudeTestNotes(mergeNotes(view.getAptitudeTestNotes(), aptitude.getNotes()));
        });

        return view;
    }

    private Optional<UniCode> findUniCode(EligibilityResultDto.MatchedUniCodeDto matched, EnrichmentData data) {
        if (matched.getUniCode() != null && !matched.getUniCode().isBlank()) {
            UniCode byCode = data.uniByCode.get(matched.getUniCode().trim().toLowerCase(Locale.ROOT));
            if (byCode != null) {
                return Optional.of(byCode);
            }
        }

        if (matched.getCourseName() != null && !matched.getCourseName().isBlank()
                && matched.getUniversityName() != null && !matched.getUniversityName().isBlank()) {
            UniCode byCourseUni = data.uniByCourseUni.get(
                    EnrichmentData.courseUniKey(matched.getCourseName(), matched.getUniversityName()));
            if (byCourseUni != null) {
                return Optional.of(byCourseUni);
            }
        }

        return Optional.empty();
    }

    private void applyUniCodeMetadata(CourseViewDto view, UniCode uniCode) {
        if (uniCode.getCampus() != null && !uniCode.getCampus().isBlank()) {
            view.setCampus(uniCode.getCampus());
        }
        if (uniCode.getDescription() != null && !uniCode.getDescription().isBlank()) {
            view.setCourseDescription(uniCode.getDescription());
        }
        if (uniCode.getSelectionMethod() != null && !uniCode.getSelectionMethod().isBlank()) {
            view.setSelectionMethod(uniCode.getSelectionMethod());
            view.setFacultyOrSelection(formatSelectionMethod(uniCode.getSelectionMethod()));
        }
        if (view.getProposedIntake() == null && uniCode.getIntakeCapacity() != null) {
            view.setProposedIntake(uniCode.getIntakeCapacity());
        }
        if (Boolean.TRUE.equals(uniCode.getHasAptitudeTest())) {
            view.setHasAptitudeTest(true);
        }
    }

    private Optional<Course> findCourseByName(String courseName, EnrichmentData data) {
        if (courseName == null || courseName.isBlank()) {
            return Optional.empty();
        }
        Course exact = data.courseByName.get(courseName.trim().toLowerCase(Locale.ROOT));
        if (exact != null) {
            return Optional.of(exact);
        }
        return data.allCourses.stream()
                .filter(course -> isSimilar(course.getName(), courseName))
                .findFirst();
    }

    private Optional<CoursePrerequisite> findPrerequisite(String courseName, String stream, EnrichmentData data) {
        if (courseName == null || courseName.isBlank()) {
            return Optional.empty();
        }

        Optional<CoursePrerequisite> exact = data.prerequisites.stream()
                .filter(item -> item.getCourseName() != null
                        && item.getCourseName().equalsIgnoreCase(courseName.trim()))
                .findFirst();
        if (exact.isPresent()) {
            return exact;
        }

        if (stream != null && !stream.isBlank()) {
            Optional<CoursePrerequisite> byStream = data.prerequisites.stream()
                    .filter(item -> stream.equalsIgnoreCase(item.getStream())
                            && item.getCourseName() != null
                            && isSimilar(item.getCourseName(), courseName))
                    .findFirst();
            if (byStream.isPresent()) {
                return byStream;
            }
        }

        return data.prerequisites.stream()
                .filter(item -> item.getCourseName() != null
                        && item.getCourseName().toLowerCase(Locale.ROOT).contains(courseName.trim().toLowerCase(Locale.ROOT))
                        && isSimilar(item.getCourseName(), courseName))
                .findFirst();
    }

    private Optional<CourseOlRequirement> findOlRequirement(String courseName, EnrichmentData data) {
        if (courseName == null || courseName.isBlank()) {
            return Optional.empty();
        }

        return data.olRows.stream()
                .filter(item -> isSimilar(item.getCourseName(), courseName))
                .findFirst();
    }

    private Optional<CourseAptitudeTestRequirement> findAptitudeRequirement(
            EligibilityResultDto.MatchedUniCodeDto matched,
            EnrichmentData data
    ) {
        return data.aptitudeRows.stream()
                .filter(item -> (matched.getUniCode() != null && matched.getUniCode().equalsIgnoreCase(item.getUniCode()))
                        || (isSimilar(item.getCourseName(), matched.getCourseName())
                        && isSimilar(item.getUniversityName(), matched.getUniversityName())))
                .findFirst();
    }

    private String buildAlPrerequisiteSummary(CoursePrerequisite prereq) {
        StringBuilder summary = new StringBuilder();
        if (prereq.getRequiredSubjects() != null && !prereq.getRequiredSubjects().isBlank()) {
            summary.append("A/L subjects: ").append(prereq.getRequiredSubjects().trim());
        }
        if (prereq.getAlternativeSubjects() != null && !prereq.getAlternativeSubjects().isBlank()) {
            if (summary.length() > 0) {
                summary.append(". ");
            }
            summary.append("Alternatives: ").append(prereq.getAlternativeSubjects().trim());
        }
        return summary.toString();
    }

    private String buildOlRequirementSummary(CourseOlRequirement ol) {
        List<String> parts = new ArrayList<>();
        appendOlPart(parts, "English", ol.getEnglishGrade());
        appendOlPart(parts, "Mathematics", ol.getMathematicsGrade());
        appendOlPart(parts, "Science", ol.getScienceGrade());
        appendOlPart(parts, "Sinhala", ol.getSinhalaLangGrade());
        appendOlPart(parts, "Tamil", ol.getTamilLangGrade());
        if (parts.isEmpty()) {
            return "No published O/L grade requirements.";
        }
        return "O/L minimum grades: " + String.join(", ", parts);
    }

    private void appendOlPart(List<String> parts, String subject, String grade) {
        if (grade != null && !grade.isBlank() && !grade.equals("-") && !grade.equals("–")) {
            parts.add(subject + " " + grade.trim().toUpperCase(Locale.ROOT));
        }
    }

    private String formatDuration(Double durationYears) {
        if (durationYears == null) {
            return "3 / 4 years";
        }
        if (durationYears % 1 == 0) {
            return String.format(Locale.ROOT, "%.0f years", durationYears);
        }
        return durationYears + " years";
    }

    private String formatSelectionMethod(String selectionMethod) {
        if (selectionMethod == null || selectionMethod.isBlank()) {
            return "Merit & District Quota";
        }
        return switch (selectionMethod.trim().toUpperCase(Locale.ROOT)) {
            case "ALL_ISLAND_MERIT_ONLY" -> "All-Island Merit";
            case "APTITUDE_TEST" -> "Aptitude Test Selection";
            case "MERIT_AND_DISTRICT" -> "Merit & District Quota";
            default -> selectionMethod.replace('_', ' ');
        };
    }

    private String mergeNotes(String existing, String addition) {
        if (addition == null || addition.isBlank()) {
            return existing;
        }
        if (existing == null || existing.isBlank()) {
            return addition.trim();
        }
        if (existing.contains(addition)) {
            return existing;
        }
        return existing + " " + addition.trim();
    }

    private boolean isSimilar(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        String n1 = left.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        String n2 = right.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return n1.contains(n2) || n2.contains(n1);
    }
}