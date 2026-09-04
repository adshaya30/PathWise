package com.pathwise.course.repository;

import com.pathwise.course.entity.DistrictInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistrictInfoRepository extends JpaRepository<DistrictInfo, Long> {

    Optional<DistrictInfo> findByNameIgnoreCase(String name);

    List<DistrictInfo> findByProvinceIgnoreCase(String province);

    List<DistrictInfo> findByIsDisadvantagedTrue();
}
