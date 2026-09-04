package com.pathwise.course.service.impl;

import com.pathwise.course.entity.DistrictInfo;
import com.pathwise.course.repository.DistrictInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds initial 25 Sri Lankan administrative districts with UGC quota flags if table is empty.
 * Course prerequisites, degree programs, and uni-codes are ingested dynamically from UGC Handbooks.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UgcDataSeeder implements CommandLineRunner {

    private final DistrictInfoRepository districtInfoRepository;

    @Override
    public void run(String... args) {
        seedDistricts();
    }

    private void seedDistricts() {
        if (districtInfoRepository.count() > 0) return;

        log.info("Seeding 25 Sri Lankan administrative districts with UGC quota flags...");
        List<DistrictInfo> districts = List.of(
                DistrictInfo.builder().name("COLOMBO").province("Western").isDisadvantaged(false).districtCode(1).build(),
                DistrictInfo.builder().name("GAMPAHA").province("Western").isDisadvantaged(false).districtCode(2).build(),
                DistrictInfo.builder().name("KALUTARA").province("Western").isDisadvantaged(false).districtCode(3).build(),
                DistrictInfo.builder().name("KANDY").province("Central").isDisadvantaged(false).districtCode(4).build(),
                DistrictInfo.builder().name("MATALE").province("Central").isDisadvantaged(true).districtCode(5).build(),
                DistrictInfo.builder().name("NUWARA ELIYA").province("Central").isDisadvantaged(true).districtCode(6).build(),
                DistrictInfo.builder().name("GALLE").province("Southern").isDisadvantaged(false).districtCode(7).build(),
                DistrictInfo.builder().name("MATARA").province("Southern").isDisadvantaged(false).districtCode(8).build(),
                DistrictInfo.builder().name("HAMBANTOTA").province("Southern").isDisadvantaged(true).districtCode(9).build(),
                DistrictInfo.builder().name("JAFFNA").province("Northern").isDisadvantaged(false).districtCode(10).build(),
                DistrictInfo.builder().name("KILINOCHCHI").province("Northern").isDisadvantaged(true).districtCode(11).build(),
                DistrictInfo.builder().name("MANNAR").province("Northern").isDisadvantaged(true).districtCode(12).build(),
                DistrictInfo.builder().name("VAVUNIYA").province("Northern").isDisadvantaged(true).districtCode(13).build(),
                DistrictInfo.builder().name("MULLAITIVU").province("Northern").isDisadvantaged(true).districtCode(14).build(),
                DistrictInfo.builder().name("BATTICALOA").province("Eastern").isDisadvantaged(true).districtCode(15).build(),
                DistrictInfo.builder().name("AMPARA").province("Eastern").isDisadvantaged(true).districtCode(16).build(),
                DistrictInfo.builder().name("TRINCOMALEE").province("Eastern").isDisadvantaged(true).districtCode(17).build(),
                DistrictInfo.builder().name("KURUNEGALA").province("North Western").isDisadvantaged(false).districtCode(18).build(),
                DistrictInfo.builder().name("PUTTALAM").province("North Western").isDisadvantaged(true).districtCode(19).build(),
                DistrictInfo.builder().name("ANURADHAPURA").province("North Central").isDisadvantaged(true).districtCode(20).build(),
                DistrictInfo.builder().name("POLONNARUWA").province("North Central").isDisadvantaged(true).districtCode(21).build(),
                DistrictInfo.builder().name("BADULLA").province("Uva").isDisadvantaged(true).districtCode(22).build(),
                DistrictInfo.builder().name("MONARAGALA").province("Uva").isDisadvantaged(true).districtCode(23).build(),
                DistrictInfo.builder().name("KEGALLE").province("Sabaragamuwa").isDisadvantaged(false).districtCode(24).build(),
                DistrictInfo.builder().name("RATNAPURA").province("Sabaragamuwa").isDisadvantaged(true).districtCode(25).build()
        );

        districtInfoRepository.saveAll(districts);
        log.info("Successfully seeded 25 districts (16 Disadvantaged).");
    }
}

