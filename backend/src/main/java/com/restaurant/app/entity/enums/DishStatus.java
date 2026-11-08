package com.restaurant.app.entity.enums;

public enum DishStatus {
    AVAILABLE,      // Đang phục vụ bình thường
    SUSPENDED,      // Tạm ngưng phục vụ (Quản lý / Admin chủ động khóa)
    OUT_OF_STOCK    // Hết món trong ca (Bếp hoặc kiểm kê báo hết)
}

