package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.CourseOlRequirement;

import java.util.List;

public interface CourseOlRequirementService {

    int promoteHandbookOlRequirements(Document document);

    List<CourseOlRequirement> getOlRequirementsByAcademicYear(String academicYear);

    List<CourseOlRequirement> getOlRequirementsForCourse(String academicYear, String courseName);
}
