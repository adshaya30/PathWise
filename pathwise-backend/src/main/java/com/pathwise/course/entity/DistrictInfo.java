package com.pathwise.course.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Represents the 25 administrative districts in Sri Lanka and UGC quota classifications.
 * 16 districts are classified as "Educationally Disadvantaged" by the UGC and receive a special 5% quota allocation.
 */
@Entity
@Table(name = "districts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistrictInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // e.g. "COLOMBO", "JAFFNA", "KANDY", "MULLAITIVU"

    @Column(length = 50)
    private String province; // Western, Central, Northern, Southern, Eastern, North Western, North Central, Uva, Sabaragamuwa

    /** True if this district is classified as Educationally Disadvantaged (5% special quota) */
    @Column(name = "is_disadvantaged", nullable = false)
    @Builder.Default
    private Boolean isDisadvantaged = false;

    /** UGC district code (1 to 25) */
    @Column(name = "district_code")
    private Integer districtCode;
}
