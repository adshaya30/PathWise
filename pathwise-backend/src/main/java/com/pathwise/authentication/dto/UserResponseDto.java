package com.pathwise.authentication.dto;

import com.pathwise.authentication.entity.Role;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {

    private Long id;
    private String email;
    private Role role;
    private boolean emailVerified;
    private boolean accountLocked;
    private LocalDateTime createdAt;
}
