package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.ReservationStatus;
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
public class ReservationResponse {

    private Long id;
    private Long branchId;
    private String branchName;
    private Long tableId;
    private String tableNumber;
    private String areaName;

    private String customerName;
    private String phone;
    private Integer guestCount;
    private OffsetDateTime reservationTime;
    private BigDecimal depositAmount;
    private ReservationStatus status;
    private String notes;
    private OffsetDateTime createdAt;
}

