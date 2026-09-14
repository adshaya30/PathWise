package com.pathwise.savedcourse.service;

import com.pathwise.savedcourse.dto.SavedCourseDto;

import java.util.List;

public interface SavedCourseService {

    List<SavedCourseDto> getSavedCourses(String userEmail, String anonymousId);

    SavedCourseDto saveCourse(String userEmail, String anonymousId, String uniCode);

    void removeCourse(String userEmail, String anonymousId, String uniCode);

    int mergeAnonymousToUser(String userEmail, String anonymousId);
}