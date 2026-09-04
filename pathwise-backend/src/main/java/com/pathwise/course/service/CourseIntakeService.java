package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.CourseIntake;

import java.util.List;

public interface CourseIntakeService {

    int promoteHandbookIntakes(Document document);

    List<CourseIntake> getIntakesByAcademicYear(String academicYear);

    List<CourseIntake> getIntakesForCourse(String academicYear, String courseName);
}
