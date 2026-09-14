package com.pathwise.admin.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HandbookTextProcessorTest {

    @Test
    @DisplayName("Step 1: Normalize Line Endings - Converts \\r\\n to \\n")
    void testNormalizeLineEndings() {
        String input = "Line 1\r\nLine 2\r\nLine 3";
        String expected = "Line 1\nLine 2\nLine 3";
        assertEquals(expected, HandbookTextProcessor.normalizeLineEndings(input));
    }

    @Test
    @DisplayName("Step 2: Remove Extra Whitespace")
    void testRemoveExtraWhitespace() {
        String input = "  This   course   is   designed  ";
        String step2Result = HandbookTextProcessor.removeExtraWhitespace(input);
        // Combined with trim
        assertEquals("This course is designed", HandbookTextProcessor.trim(step2Result));
    }

    @Test
    @DisplayName("Step 3: Convert Multiple Newlines to Single Space")
    void testConvertMultipleNewlinesToSingleSpace() {
        String input = "Para 1\n\n\n\nPara 2";
        String expected = "Para 1 Para 2";
        assertEquals(expected, HandbookTextProcessor.convertMultipleNewlinesToSingleSpace(input));
    }

    @Test
    @DisplayName("Step 4: Remove Non-Printable Characters")
    void testRemoveNonPrintableCharacters() {
        String input = "Text\u0000\u0001\u0002More text";
        String expected = "TextMore text";
        assertEquals(expected, HandbookTextProcessor.removeNonPrintableCharacters(input));
    }

    @Test
    @DisplayName("Step 5: Trim leading and trailing whitespace")
    void testTrim() {
        String input = "  Text content  ";
        String expected = "Text content";
        assertEquals(expected, HandbookTextProcessor.trim(input));
    }

    @Test
    @DisplayName("Full Pipeline: Test combined steps on raw text input")
    void testFullProcessingPipeline() {
        String input = " \r\n  This   course \u0000\u0001  is   designed \r\n\r\n\r\n  for   students.  \r\n ";
        String expected = "This course is designed for students.";
        assertEquals(expected, HandbookTextProcessor.process(input));
    }
}
