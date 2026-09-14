package com.pathwise.admin.exception;

import java.util.List;

/**
 * Thrown when AI table extraction misses one or more of the 25 expected Sri Lankan administrative districts.
 */
public class MissingDistrictsException extends RuntimeException {

    private final List<String> missingDistricts;

    public MissingDistrictsException(String message, List<String> missingDistricts) {
        super(message);
        this.missingDistricts = missingDistricts;
    }

    public List<String> getMissingDistricts() {
        return missingDistricts;
    }
}
