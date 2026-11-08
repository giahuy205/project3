package com.restaurant.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {
    private Long id;
    private String phone;
    private String fullName;
    private String email;
    private Integer points;
    private BigDecimal totalSpent;
    private OffsetDateTime createdAt;
}

