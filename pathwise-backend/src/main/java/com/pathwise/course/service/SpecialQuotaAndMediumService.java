package com.pathwise.course.service;

import com.pathwise.admin.entity.Document;
import com.pathwise.course.entity.SpecialCategoryAdmissionQuota;
import com.pathwise.course.entity.UniversityMediumOfInstruction;

import java.util.List;

public interface SpecialQuotaAndMediumService {

    int promoteMediumsAndSpecialQuotas(Document document);

    List<UniversityMediumOfInstruction> getMediumsByAcademicYear(String academicYear);

    List<SpecialCategoryAdmissionQuota> getSpecialQuotasByAcademicYear(String academicYear);
}
