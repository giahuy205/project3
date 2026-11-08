package com.restaurant.app.dto.response;

import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.Station;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KitchenQueueItemResponse {
    private Long orderItemId;
    private Long orderId;
    private String orderCode;
    private String tableNumber;
    private String areaName;
    private Long dishId;
    private String dishName;
    private String dishImageUrl;
    private Integer quantity;
    private String notes;
    private Station station;
    private Integer preparationTime; // Thời gian nấu chuẩn (phút)
    private Long waitTimeMinutes;    // Thời gian khách đã đợi (phút)
    private KitchenStatus kitchenStatus;
    private Double priorityScore;    // Điểm ưu tiên tính toán từ thuật toán
    private Integer batchCount;      // Số phần cùng loại có thể gom mẻ nấu chung
    private String cancelReason;     // Lý do hủy nếu đang yêu cầu hủy
    private OffsetDateTime createdAt;
}

