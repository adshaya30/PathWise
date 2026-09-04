package com.pathwise.authentication.dto;

import com.pathwise.authentication.entity.Role;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {

    private UUID id;
    private String email;
    private Role role;
    private boolean emailVerified;
    private boolean accountLocked;
    private LocalDateTime createdAt;
}

