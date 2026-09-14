package com.pathwise.admin.util;

/**
 * Utility class for Light Text Processing of Handbook text prior to database storage.
 * 
 * Processing Steps:
 * 1. Normalize Line Endings (\r\n and \r -> \n)
 * 2. Remove Extra Whitespace (consecutive spaces/tabs -> single space)
 * 3. Convert Multiple Newlines to Single Space (\n{2,} -> " ")
 * 4. Remove Non-Printable Characters (ASCII control characters)
 * 5. Trim (leading and trailing whitespace)
 */
public final class HandbookTextProcessor {

    private HandbookTextProcessor() {
        // Prevent instantiation of utility class
    }

    /**
     * Step 1: Normalize Line Endings
     * Converts \r\n and \r to \n
     * 
     * Example:
     * Before: "Line 1\r\nLine 2\r\nLine 3"
     * After:  "Line 1\nLine 2\nLine 3"
     */
    public static String normalizeLineEndings(String text) {
        if (text == null) return "";
        return text.replace("\r\n", "\n").replace("\r", "\n");
    }

    /**
     * Step 2: Remove Extra Whitespace
     * Replaces multiple consecutive horizontal spaces or tabs with a single space
     * 
     * Example:
     * Before: "  This   course   is   designed  "
     * After:  "This course is designed" (when combined with trim)
     */
    public static String removeExtraWhitespace(String text) {
        if (text == null) return "";
        return text.replaceAll("[^\\S\\r\\n]+", " ");
    }

    /**
     * Step 3: Convert Multiple Newlines to Single Space
     * Converts sequences of 2 or more newlines (and any whitespace between them) to a single space
     * 
     * Example:
     * Before: "Para 1\n\n\n\nPara 2"
     * After:  "Para 1 Para 2"
     */
    public static String convertMultipleNewlinesToSingleSpace(String text) {
        if (text == null) return "";
        return text.replaceAll("(\\n[\\t ]*){2,}", " ");
    }

    /**
     * Step 4: Remove Non-Printable Characters
     * Strips non-printable ASCII control characters (\x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F)
     * 
     * Example:
     * Before: "Text\x00\x01\x02More text"
     * After:  "TextMore text"
     */
    public static String removeNonPrintableCharacters(String text) {
        if (text == null) return "";
        return text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
    }

    /**
     * Step 5: Trim
     * Removes leading and trailing whitespace
     * 
     * Example:
     * Before: "  Text content  "
     * After:  "Text content"
     */
    public static String trim(String text) {
        if (text == null) return "";
        return text.trim();
    }

    /**
     * Complete Light Processing Pipeline for handbook text before database storage.
     * Executes Steps 1 through 5 in order:
     * 1. Normalize Line Endings
     * 2. Remove Non-Printable Characters
     * 3. Convert Multiple Newlines to Single Space
     * 4. Remove Extra Whitespace
     * 5. Trim
     * 
     * @param text Raw extracted handbook text
     * @return Cleaned, sanitized text ready for database persistence
     */
    public static String process(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        String result = normalizeLineEndings(text);
        result = removeNonPrintableCharacters(result);
        result = convertMultipleNewlinesToSingleSpace(result);
        result = removeExtraWhitespace(result);
        result = trim(result);

        return result;
    }
}
