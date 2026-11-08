package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.TableStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiningTableResponse {
    private Long id;
    private Long areaId;
    private String areaName;
    private String tableNumber;
    private Integer capacity;
    private TableStatus status;
    private OffsetDateTime updatedAt;
}

