package com.pathwise.admin.exception;

import java.util.Map;

/**
 * Thrown when districts have unequal numbers of courses in extracted UGC cutoff tables.
 */
public class CourseCountMismatchException extends RuntimeException {

    private final Map<String, Integer> districtsWithWrongCount;

    public CourseCountMismatchException(String message, Map<String, Integer> districtsWithWrongCount) {
        super(message);
        this.districtsWithWrongCount = districtsWithWrongCount;
    }

    public Map<String, Integer> getDistrictsWithWrongCount() {
        return districtsWithWrongCount;
    }
}
