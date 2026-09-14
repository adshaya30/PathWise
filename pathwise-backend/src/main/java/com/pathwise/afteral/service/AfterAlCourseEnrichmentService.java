package com.pathwise.afteral.service;

import com.pathwise.afteral.dto.CourseViewDto;
import com.pathwise.course.dto.EligibilityResultDto;

import java.util.List;

public interface AfterAlCourseEnrichmentService {

    CourseViewDto enrich(EligibilityResultDto.MatchedUniCodeDto matched, String academicYear, String stream);

    List<CourseViewDto> enrichAll(List<EligibilityResultDto.MatchedUniCodeDto> matchedCourses, String academicYear, String stream);
}
