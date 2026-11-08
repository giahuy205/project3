package com.restaurant.app.service;

import com.restaurant.app.dto.response.KitchenQueueItemResponse;
import com.restaurant.app.entity.OrderItem;
import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.Station;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Thuật toán Lập lịch Bếp & Gom mẻ theo SLA & Chuỗi món (KDS Table SLA Pacing & Batching Algorithm)
 * Mô hình chuẩn áp dụng tại các chuỗi nhà hàng cao cấp (Haidilao, Golden Gate, Pizza 4P's, Toast KDS, QSR Automations):
 * -----------------------------------------------------------------------------------------------------------------
 * 1. Target Delivery SLA theo quy mô bàn (Table Size SLA):
 *    - Bàn nhỏ (<= 4 người): SLA 20.0 phút, Thưởng ưu tiên nhẹ +6.0 điểm (tối ưu vòng quay bàn).
 *    - Bàn vừa (5 - 8 người): SLA 25.0 phút, Thưởng ưu tiên +3.0 điểm.
 *    - Bàn lớn (> 8 người): SLA 30.0 phút, Thưởng ưu tiên 0.0 điểm.
 * 2. Áp lực thời gian hoàn thành (Time Pressure Score - Nguyên lý "All Items Ready Together"):
 *    - Ước tính thời gian xong: T_finish = waitMinutes + prepTime
 *    - Tỷ lệ áp lực thời gian: TimePressure = (T_finish / SLA) * 50.0
 *    - Món làm lâu (Lẩu 15p, Nướng 18p...) có áp lực cao tiệm cận hạn chót -> Được đưa vào nấu sớm để ra cùng lượt.
 * 3. Điểm tích lũy thời gian chờ (Aging Score - Chống đói tiến trình):
 *    - Aging = waitMinutes * 1.5
 * 4. Gom mẻ thông minh (Greedy Batching Bonus):
 *    - BatchBonus = (totalBatchCount > 1) ? totalBatchCount * 5.0 : 0.0
 * 5. Điều phối chuỗi món ăn (Course Serving Sequence):
 *    - Khai vị & Đồ uống giải khát: Phục vụ mở màn bữa ăn (+18.0 điểm).
 *    - Món tráng miệng (Kem, Chè, Hoa quả): Ghim ở đáy danh sách (-100.0 điểm) chừng nào bàn còn món chính đang nấu/chờ.
 *      Tự động kích hoạt (+15.0 điểm) khi bàn đã ra hết món chính.
 * 6. Trạng thái đặc biệt (Status Override):
 *    - CANCEL_REQUESTED (+100.0 điểm) -> Cảnh báo dừng bếp.
 *    - COOKING (+50.0 điểm) -> Bếp tập trung hoàn tất dứt điểm.
 */
@Service
@Slf4j
public class KitchenSchedulingService {

    private static final double W_AGING = 1.5;             // Điểm cộng theo mỗi phút khách chờ
    private static final double W_BATCH = 5.0;             // Thưởng gom mẻ nấu cùng món
    private static final double BONUS_APPETIZER_DRINK = 18.0; // Ưu tiên khai vị & đồ uống mở màn
    private static final double PENALTY_DESSERT_WAIT = -100.0; // Ghim tráng miệng ở đáy khi bàn còn món mặn
    private static final double BONUS_DESSERT_READY = 15.0;    // Kích hoạt tráng miệng khi bàn xong món chính

    public List<KitchenQueueItemResponse> scheduleAndBatch(List<OrderItem> items) {
        return scheduleAndBatch(items, items);
    }

    public List<KitchenQueueItemResponse> scheduleAndBatch(List<OrderItem> items, List<OrderItem> globalContextItems) {
        if (items == null || items.isEmpty()) {
            return Collections.emptyList();
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<OrderItem> contextList = (globalContextItems != null && !globalContextItems.isEmpty()) ? globalContextItems : items;

        // Bước 1: Đếm số lượng của từng món ăn (dishId) đang chờ làm trong toàn bộ hệ thống để phục vụ gom mẻ
        Map<Long, Integer> dishBatchCountMap = new HashMap<>();
        for (OrderItem item : contextList) {
            if (item.getKitchenStatus() == KitchenStatus.PENDING || item.getKitchenStatus() == KitchenStatus.COOKING
                    || item.getKitchenStatus() == KitchenStatus.CANCEL_REQUESTED) {
                dishBatchCountMap.merge(item.getDish().getId(), item.getQuantity(), Integer::sum);
            }
        }

        // Bước 1b: Phân tích tiến trình chuỗi món theo từng BÀN (Course Progression by Table)
        // Lưu trữ danh sách định danh các bàn còn món chính đang chờ hoặc đang nấu
        Set<String> tablesWithActiveMains = new HashSet<>();
        for (OrderItem it : contextList) {
            if (it.getKitchenStatus() == KitchenStatus.PENDING || it.getKitchenStatus() == KitchenStatus.COOKING) {
                if (isMainCourseItem(it)) {
                    tablesWithActiveMains.add(getTableIdentifierKey(it));
                }
            }
        }

        // Bước 2: Chuyển đổi và tính điểm ưu tiên cho từng món
        List<KitchenQueueItemResponse> queue = items.stream().map(item -> {
            long waitMinutes = Duration.between(item.getCreatedAt(), now).toMinutes();
            int prepTime = item.getDish().getPreparationTime() != null ? item.getDish().getPreparationTime() : 15;
            int totalBatchCount = dishBatchCountMap.getOrDefault(item.getDish().getId(), 1);
            String tableKey = getTableIdentifierKey(item);

            // A. Quy mô bàn & SLA mục tiêu
            int capacity = 4;
            if (item.getOrder() != null && item.getOrder().getTable() != null && item.getOrder().getTable().getCapacity() != null) {
                capacity = item.getOrder().getTable().getCapacity();
            }

            double targetSlaMinutes;
            double smallTableBonus;
            if (capacity <= 4) {
                // Bàn nhỏ (<= 4 người): SLA 20 phút, ưu tiên nhẹ (+6đ) để giải phóng bàn nhanh
                targetSlaMinutes = 20.0;
                smallTableBonus = 6.0;
            } else if (capacity <= 8) {
                // Bàn vừa (5 - 8 người): SLA 25 phút
                targetSlaMinutes = 25.0;
                smallTableBonus = 3.0;
            } else {
                // Bàn lớn (> 8 người): SLA 30 phút
                targetSlaMinutes = 30.0;
                smallTableBonus = 0.0;
            }

            // B. Điểm áp lực thời gian (Time Pressure Score - Đẩy món làm lâu lên làm sớm)
            // Ước tính thời gian xong = Thời gian đã chờ + Thời gian nấu món
            double estimatedFinish = (double) waitMinutes + prepTime;
            double timePressureScore = (estimatedFinish / targetSlaMinutes) * 50.0;

            // C. Điểm chống đói tiến trình (Aging Score)
            double agingScore = waitMinutes * W_AGING;

            // D. Điểm thưởng gom mẻ (Greedy Batching Bonus)
            double batchBonus = (totalBatchCount > 1) ? (totalBatchCount * W_BATCH) : 0.0;

            // E. Điểm ưu tiên trạng thái (Status Override)
            double statusBonus = 0.0;
            if (item.getKitchenStatus() == KitchenStatus.CANCEL_REQUESTED) {
                statusBonus = 100.0; // Ưu tiên tuyệt đối lên đầu để bếp dừng làm
            } else if (item.getKitchenStatus() == KitchenStatus.COOKING) {
                statusBonus = 50.0;  // Ưu tiên hoàn tất món đang nấu dở
            }

            // F. Điểm điều phối chuỗi món ăn (Course Serving Progression)
            double courseBonus = 0.0;
            boolean isDessert = isDessertItem(item);
            boolean isAppetizer = isAppetizerItem(item);
            boolean isDrink = isDrinkItem(item);

            if (isDessert) {
                boolean hasUnfinishedMains = tablesWithActiveMains.contains(tableKey);
                if (hasUnfinishedMains) {
                    // Bàn vẫn còn món chính đang nấu/chờ -> Ghim món tráng miệng ở đáy hàng đợi
                    courseBonus = PENALTY_DESSERT_WAIT;
                } else {
                    // Bàn đã ra hết món chính (hoặc bàn chỉ gọi món ngọt) -> Kích hoạt làm ngay
                    courseBonus = BONUS_DESSERT_READY;
                }
            } else if (isAppetizer || isDrink) {
                courseBonus = BONUS_APPETIZER_DRINK;
            }

            // G. Tổng điểm ưu tiên động (Dynamic Weighted Priority Score)
            double priorityScore = timePressureScore
                    + agingScore
                    + smallTableBonus
                    + batchBonus
                    + statusBonus
                    + courseBonus;

            String tableNum = item.getOrder().getTable() != null ? item.getOrder().getTable().getTableNumber()
                    : "Mang về";
            String areaName = item.getOrder().getTable() != null ? item.getOrder().getTable().getArea().getName()
                    : "Tại quầy";

            return KitchenQueueItemResponse.builder()
                    .orderItemId(item.getId())
                    .orderId(item.getOrder().getId())
                    .orderCode(item.getOrder().getOrderCode())
                    .tableNumber(tableNum)
                    .areaName(areaName)
                    .dishId(item.getDish().getId())
                    .dishName(item.getDish().getName())
                    .dishImageUrl(item.getDish().getImageUrl())
                    .quantity(item.getQuantity())
                    .notes(item.getNotes())
                    .station(item.getDish().getStation())
                    .preparationTime(prepTime)
                    .waitTimeMinutes(waitMinutes)
                    .kitchenStatus(item.getKitchenStatus())
                    .priorityScore(Math.round(priorityScore * 100.0) / 100.0)
                    .batchCount(totalBatchCount)
                    .cancelReason(item.getCancelReason())
                    .createdAt(item.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());

        // Bước 3: Sắp xếp hàng đợi theo thứ tự Điểm ưu tiên cao nhất đứng đầu
        queue.sort(Comparator.comparingDouble(KitchenQueueItemResponse::getPriorityScore).reversed());

        return queue;
    }

    private String getTableIdentifierKey(OrderItem item) {
        if (item.getOrder() != null && item.getOrder().getTable() != null) {
            return "TABLE_" + item.getOrder().getTable().getId();
        }
        if (item.getOrder() != null) {
            return "ORDER_" + item.getOrder().getId();
        }
        return "ITEM_" + item.getId();
    }

    private boolean isDessertItem(OrderItem item) {
        String cName = (item.getDish().getCategory() != null && item.getDish().getCategory().getName() != null)
                ? item.getDish().getCategory().getName().toLowerCase()
                : "";
        String dName = item.getDish().getName() != null ? item.getDish().getName().toLowerCase() : "";

        return cName.contains("tráng miệng") || cName.contains("dessert")
                || dName.contains("kem") || dName.contains("chè")
                || dName.contains("hoa quả") || dName.contains("trái cây")
                || dName.contains("bánh ngọt") || dName.contains("flan")
                || dName.contains("panna cotta") || dName.contains("sữa chua");
    }

    private boolean isAppetizerItem(OrderItem item) {
        if (isDessertItem(item)) return false;
        String cName = (item.getDish().getCategory() != null && item.getDish().getCategory().getName() != null)
                ? item.getDish().getCategory().getName().toLowerCase()
                : "";
        String dName = item.getDish().getName() != null ? item.getDish().getName().toLowerCase() : "";

        return cName.contains("khai vị") || cName.contains("appetizer") || cName.contains("starter")
                || dName.contains("salad") || dName.contains("gỏi")
                || dName.contains("khoai tây chiên") || dName.contains("ngô chiên")
                || dName.contains("súp") || dName.contains("soup");
    }

    private boolean isDrinkItem(OrderItem item) {
        if (isDessertItem(item)) return false;
        String cName = (item.getDish().getCategory() != null && item.getDish().getCategory().getName() != null)
                ? item.getDish().getCategory().getName().toLowerCase()
                : "";
        String dName = item.getDish().getName() != null ? item.getDish().getName().toLowerCase() : "";

        return item.getDish().getStation() == Station.BAR
                || cName.contains("đồ uống") || cName.contains("uống") || cName.contains("beverage") || cName.contains("drink")
                || dName.contains("trà") || dName.contains("bia") || dName.contains("nước") || dName.contains("cà phê") || dName.contains("sinh tố");
    }

    private boolean isMainCourseItem(OrderItem item) {
        return !isDessertItem(item) && !isAppetizerItem(item) && !isDrinkItem(item);
    }
}
