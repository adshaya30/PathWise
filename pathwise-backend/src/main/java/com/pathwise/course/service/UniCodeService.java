package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.UniCode;

import java.util.List;

public interface UniCodeService {

    /**
     * Extracts and promotes official UGC Uni-Codes from approved handbook pages into the uni_codes table
     */
    int promoteHandbookUniCodes(Document document);

    /**
     * List all stored Uni-Codes
     */
    List<UniCode> getAllUniCodes();

    /**
     * Find specific Uni-Code by code (e.g. "001A")
     */
    UniCode getByCode(String code);
}
