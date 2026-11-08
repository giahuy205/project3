package com.restaurant.app.dto.request;

import com.restaurant.app.entity.enums.Station;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DishRequest {

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    @NotBlank(message = "Tên món ăn không được để trống")
    private String name;

    @NotNull(message = "Đơn giá không được để trống")
    @Min(value = 0, message = "Đơn giá không được âm")
    private BigDecimal price;

    private BigDecimal originalPrice;
    private BigDecimal scheduledPrice;
    private LocalDate priceEffectiveDate;

    @NotNull(message = "Thời gian nấu ước tính không được để trống")
    @Min(value = 1, message = "Thời gian nấu phải ít nhất 1 phút")
    @Builder.Default
    private Integer preparationTime = 15;

    @NotNull(message = "Trạm chế biến không được để trống")
    @Builder.Default
    private Station station = Station.KITCHEN_HOT;

    private String imageUrl;
    private String description;

    @Builder.Default
    private String unit = "Đĩa";
}

