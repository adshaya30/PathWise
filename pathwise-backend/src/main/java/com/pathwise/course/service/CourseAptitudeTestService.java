package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.CourseAptitudeTestRequirement;

import java.util.List;

public interface CourseAptitudeTestService {

    int promoteHandbookAptitudeTests(Document document);

    List<CourseAptitudeTestRequirement> getAptitudeTestsByAcademicYear(String academicYear);

    List<CourseAptitudeTestRequirement> getAptitudeTestsForCourse(String academicYear, String courseName);
}
