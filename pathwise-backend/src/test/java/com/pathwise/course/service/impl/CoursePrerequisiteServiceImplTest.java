package com.pathwise.course.service.impl;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CoursePrerequisiteServiceImplTest {

    private static final String SAMPLE_PAGES = """
            2.2.3.31 Optometry
             (Course Code - 116)
             (Proposed Intake - 60)
            Minimum eligibility requirements for admission :
            At least three ‘S’ grades in Chemistry, Physics and Biology at the G.C.E. (Advanced 
            Level) Examination.
              Degree Programme : Bachelor of Science Honours in Optometry [BScHons (Optometry)]
              Available University : University of Sri Jayewardenepura
              Duration : 04 years
              Medium : English
            2.2.3.32 Applied Chemistry
             (Course Code - 118)
             (Proposed Intake - 60)
            Minimum eligibility requirements for admission :
            At least three ‘S’ grades in Chemistry, Physics and the third subject from the following 
            subjects at the G.C.E. (Advanced Level) Examination.
              Biology 
              Combined Mathematics
              Mathematics
              Higher Mathematics
              Agricultural Science
            Degree Programme : Bachelor of Science Honours in Applied Chemistry [BScHons (App Chem)]
            Available University : University of Kelaniya
            Duration : 04 years
            Medium : English
            2.2.3.33 Aquatic Bioresources
             (Course Code - 129)
             (Proposed Intake - 50)
            Minimum eligibility requirements for admission :
            At least three ‘S’ grades in Biological Science Stream at the G.C.E. (Advanced Level) 
            Examination.
            Degree Programmes : Bachelor of Science in Aquatic Bioresources
             [BSc (Aquatic Bioresources)]
             Duration: 03 years
            """;

    @Test
    @DisplayName("Splits handbook text into one block per course code")
    void testSplitIntoCourseBlocks() {
        List<CoursePrerequisiteServiceImpl.CourseBlock> blocks =
                CoursePrerequisiteServiceImpl.splitIntoCourseBlocks(SAMPLE_PAGES);
        assertEquals(3, blocks.size());

        assertEquals("Optometry", blocks.get(0).courseName());
        assertEquals("116", blocks.get(0).courseCode());

        assertEquals("Applied Chemistry", blocks.get(1).courseName());
        assertEquals("118", blocks.get(1).courseCode());

        assertEquals("Aquatic Bioresources", blocks.get(2).courseName());
        assertEquals("129", blocks.get(2).courseCode());
    }

    @Test
    @DisplayName("Extracts subject list from a plain subject requirement")
    void testExtractSubjectsOptometry() {
        String requirement = "At least three ‘S’ grades in Chemistry, Physics and Biology at the G.C.E. (Advanced Level) Examination.";
        List<String> subjects = CoursePrerequisiteServiceImpl.extractSubjects(requirement);
        assertEquals(List.of("Chemistry", "Physics", "Biology"), subjects);
    }

    @Test
    @DisplayName("Extracts subjects from an 'either-third-subject' requirement")
    void testExtractSubjectsAppliedChemistry() {
        String requirement = "At least three ‘S’ grades in Chemistry, Physics and the third subject from the following subjects at the G.C.E. (Advanced Level) Examination. Biology, Combined Mathematics, Mathematics, Higher Mathematics, Agricultural Science";
        List<String> subjects = CoursePrerequisiteServiceImpl.extractSubjects(requirement);
        assertEquals(List.of("Chemistry", "Physics", "Biology",
                "Combined Mathematics", "Mathematics", "Higher Mathematics", "Agricultural Science"), subjects);
    }

    @Test
    @DisplayName("Falls back to stream subjects for a stream-based requirement")
    void testStreamFallbackAquaticBioresources() {
        String requirement = "At least three ‘S’ grades in Biological Science Stream at the G.C.E. (Advanced Level) Examination.";
        assertTrue(CoursePrerequisiteServiceImpl.extractSubjects(requirement).isEmpty());
        assertEquals("Biological Science", CoursePrerequisiteServiceImpl.inferStream(requirement));
        assertEquals(List.of("Chemistry", "Physics", "Biology"),
                CoursePrerequisiteServiceImpl.subjectsFromStream(
                        CoursePrerequisiteServiceImpl.inferStream(requirement)));
    }

    @Test
    @DisplayName("Extracts the minimum grade from the requirement text")
    void testExtractGrade() {
        assertEquals("S", CoursePrerequisiteServiceImpl.extractGrade(
                "At least three ‘S’ grades in Chemistry, Physics and Biology at the G.C.E. (Advanced Level) Examination."));
        assertEquals("S", CoursePrerequisiteServiceImpl.extractGrade(
                "At least three 'S' grades in Biological Science Stream at the G.C.E. (Advanced Level) Examination."));
    }

    @Test
    @DisplayName("Annotates per-subject grades: Chemistry (C), Physics (S), Biology (S)")
    void testExtractSubjectsWithGradesPerSubject() {
        String requirement = "At least a 'C' grade in Chemistry and 'S' grades in Physics and Biology "
                + "at the G.C.E. (Advanced Level) Examination. "
                + "In addition to that, at least an Ordinary Pass (S) in English at the G.C.E. (Ordinary Level) Examination.";
        assertEquals(List.of("Chemistry (C)", "Physics (S)", "Biology (S)"),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(requirement));
    }

    @Test
    @DisplayName("Annotates a common grade on every subject and drops O/L-only subjects")
    void testExtractSubjectsWithGradesCommonAndOlIgnored() {
        String requirement = "At least three ‘S’ grades in Chemistry, Physics and Biology "
                + "at the G.C.E. (Advanced Level) Examination. "
                + "In addition to that, at least an Ordinary Pass (S) in English at the G.C.E. (Ordinary Level) Examination.";
        assertEquals(List.of("Chemistry (S)", "Physics (S)", "Biology (S)"),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(requirement));
    }

    @Test
    @DisplayName("Stores the free-choice requirement sentence verbatim")
    void testExtractAnyThreeSubjects() {
        String requirement = "At least ‘S’ grades in any three subjects at the G.C.E. (Advanced Level) Examination.";
        assertEquals(List.of(requirement),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(requirement));
    }

    @Test
    @DisplayName("Stores 'any 02 subjects' free-choice requirement verbatim")
    void testExtractAnyZeroPrefixedSubjects() {
        String requirement = "At least 'C' grades in any 02 subjects at the G.C.E. (Advanced Level) Examination.";
        assertEquals(List.of(requirement),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(requirement));
    }

    @Test
    @DisplayName("Verbatim free-choice sentence ignores preamble and trailing O/L clause")
    void testExtractFreeChoiceInBlock() {
        String block = "Minimum eligibility requirements for admission :\n"
                + "At least ‘S’ grades in any three subjects at the G.C.E. (Advanced Level) Examination.\n"
                + "In addition to that, at least an Ordinary Pass (S) in English at the G.C.E. (Ordinary Level) Examination.";
        assertEquals(List.of("At least ‘S’ grades in any three subjects at the G.C.E. (Advanced Level) Examination."),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(block));
    }

    @Test
    @DisplayName("Stores a choose-N-from-pool requirement as 'Any 3 of the following: ...'")
    void testExtractPoolRequirement() {
        String block = "Minimum eligibility requirements for admission :\n"
                + "The candidates should have passed the three subjects with at least ‘C’ grades in two of "
                + "the following subjects at the G.C.E. (Advanced Level) Examination.\n"
                + "Higher Mathematics\n"
                + "Chemistry\n"
                + "Combined Mathematics\n"
                + "Accounting\n"
                + "Mathematics\n"
                + "Business Statistics\n"
                + "Physics\n"
                + "Information & Communication Technology\n"
                + "In addition to that, candidates should have satisfied the following requirements at the "
                + "G.C.E. (Ordinary Level) Examination.\n"
                + "(i) At least a Credit Pass (C) in English\n"
                + "(ii) At least a Credit Pass (C) in Mathematics";
        assertEquals(List.of("Any 3 of the following: Higher Mathematics, Chemistry, Combined Mathematics, "
                        + "Accounting, Mathematics, Business Statistics, Physics, Information & Communication Technology"),
                CoursePrerequisiteServiceImpl.extractSubjectsWithGrades(block));
    }

    @Test
    @DisplayName("Pool requirement puts the grade rule into the special-requirements note")
    void testPoolNote() {
        String block = "The candidates should have passed the three subjects with at least ‘C’ grades in two of "
                + "the following subjects at the G.C.E. (Advanced Level) Examination.\n"
                + "Higher Mathematics\nChemistry\nCombined Mathematics\nPhysics";
        String note = CoursePrerequisiteServiceImpl.extractPoolRequirement(
                CoursePrerequisiteServiceImpl.stripOlSentences(block)).note();
        assertEquals("At least 2 of the 3 A/L subjects must be at least grade C and from the listed subjects.", note);
    }
}