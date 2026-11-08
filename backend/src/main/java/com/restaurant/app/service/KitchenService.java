package com.restaurant.app.service;

import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.KitchenQueueItemResponse;
import com.restaurant.app.entity.Order;
import com.restaurant.app.entity.OrderItem;
import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.OrderStatus;
import com.restaurant.app.entity.enums.Station;
import com.restaurant.app.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KitchenService {

    private final OrderItemRepository orderItemRepository;
    private final KitchenSchedulingService kitchenSchedulingService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<KitchenQueueItemResponse> getKitchenQueue(Station station) {
        List<KitchenStatus> activeStatuses = Arrays.asList(KitchenStatus.PENDING, KitchenStatus.COOKING, KitchenStatus.CANCEL_REQUESTED);
        List<OrderItem> allActiveItems = orderItemRepository.findByKitchenStatusInOrderByCreatedAtAsc(activeStatuses);

        // Chỉ đưa vào hàng đợi những món thuộc Đơn hàng đang mở (ACTIVE)
        // Những món thuộc đơn đã thanh toán (COMPLETED / CANCELLED) sẽ tự động bị loại bỏ khỏi hàng đợi Bếp
        List<OrderItem> activeOrdersItems = allActiveItems.stream()
                .filter(it -> it.getOrder() != null && it.getOrder().getStatus() == OrderStatus.ACTIVE)
                .collect(Collectors.toList());

        List<OrderItem> items = activeOrdersItems;
        if (station != null) {
            items = activeOrdersItems.stream()
                    .filter(it -> it.getDish().getStation() == station)
                    .collect(Collectors.toList());
        }

        // Áp dụng thuật toán Lập lịch & Gom mẻ theo SLA & Chuỗi món với bối cảnh toàn nhà hàng
        return kitchenSchedulingService.scheduleAndBatch(items, activeOrdersItems);
    }

    @Transactional
    public KitchenQueueItemResponse updateItemStatus(Long orderItemId, KitchenStatus newStatus) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món trong đơn với ID: " + orderItemId));

        item.setKitchenStatus(newStatus);
        OrderItem saved = orderItemRepository.save(item);

        log.info("Cập nhật trạng thái món '{}' sang {}", item.getDish().getName(), newStatus);

        // Phát sự kiện Realtime qua WebSocket:
        // 1. Khi món ĐÃ NẤU XONG (READY) -> Báo cho nhân viên phục vụ đi bưng đồ
        if (newStatus == KitchenStatus.READY) {
            String tableNum = item.getOrder().getTable() != null ? item.getOrder().getTable().getTableNumber() : "Mang về";
            Map<String, Object> waiterNotification = new HashMap<>();
            waiterNotification.put("type", "DISH_READY");
            waiterNotification.put("message", "Món '" + item.getDish().getName() + "' (x" + item.getQuantity() + ") của " + tableNum + " ĐÃ NẤU XONG!");
            waiterNotification.put("orderId", item.getOrder().getId());
            waiterNotification.put("tableNumber", tableNum);
            waiterNotification.put("dishName", item.getDish().getName());
            waiterNotification.put("quantity", item.getQuantity());

            messagingTemplate.convertAndSend("/topic/waiter", waiterNotification);
        }

        // 2. Cập nhật lại hàng đợi Bếp cho tất cả màn hình Bếp đang mở
        notifyKitchenQueueUpdate();

        return KitchenQueueItemResponse.builder()
                .orderItemId(saved.getId())
                .orderId(saved.getOrder().getId())
                .orderCode(saved.getOrder().getOrderCode())
                .tableNumber(saved.getOrder().getTable() != null ? saved.getOrder().getTable().getTableNumber() : "Mang về")
                .dishId(saved.getDish().getId())
                .dishName(saved.getDish().getName())
                .quantity(saved.getQuantity())
                .kitchenStatus(saved.getKitchenStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public List<KitchenQueueItemResponse> updateBatchItemStatus(List<Long> orderItemIds, KitchenStatus newStatus) {
        if (orderItemIds == null || orderItemIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<KitchenQueueItemResponse> responses = new ArrayList<>();
        for (Long id : orderItemIds) {
            try {
                responses.add(updateItemStatus(id, newStatus));
            } catch (Exception e) {
                log.warn("Không thể cập nhật món ID {}: {}", id, e.getMessage());
            }
        }
        return responses;
    }

    @Transactional
    public KitchenQueueItemResponse resolveCancelRequest(Long orderItemId, boolean accepted) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món với ID: " + orderItemId));

        if (item.getKitchenStatus() != KitchenStatus.CANCEL_REQUESTED) {
            throw new IllegalStateException("Món này không có yêu cầu hủy nào đang chờ duyệt!");
        }

        String tableNum = item.getOrder().getTable() != null ? item.getOrder().getTable().getTableNumber() : "Mang về";
        Map<String, Object> waiterNotification = new HashMap<>();
        waiterNotification.put("orderId", item.getOrder().getId());
        waiterNotification.put("tableNumber", tableNum);
        waiterNotification.put("dishName", item.getDish().getName());

        if (accepted) {
            item.setKitchenStatus(KitchenStatus.CANCELLED);
            // Trừ tiền khỏi tổng đơn hàng
            Order order = item.getOrder();
            BigDecimal total = BigDecimal.ZERO;
            for (OrderItem it : order.getItems()) {
                if (it.getId().equals(item.getId())) {
                    continue; // Bỏ qua món bị hủy
                }
                if (it.getKitchenStatus() != KitchenStatus.CANCELLED) {
                    total = total.add(it.getPriceAtOrder().multiply(BigDecimal.valueOf(it.getQuantity())));
                }
            }
            order.setTotalAmount(total);

            waiterNotification.put("type", "CANCEL_ACCEPTED");
            waiterNotification.put("message", "Bếp ĐÃ ĐỒNG Ý hủy món '" + item.getDish().getName() + "' của " + tableNum + "!");
        } else {
            // Từ chối hủy -> Quay lại trạng thái COOKING
            item.setKitchenStatus(KitchenStatus.COOKING);
            waiterNotification.put("type", "CANCEL_REJECTED");
            waiterNotification.put("message", "Bếp TỪ CHỐI hủy món '" + item.getDish().getName() + "' của " + tableNum + " (Món đang chế biến)!");
        }

        OrderItem saved = orderItemRepository.save(item);
        messagingTemplate.convertAndSend("/topic/waiter", waiterNotification);
        notifyKitchenQueueUpdate();

        return KitchenQueueItemResponse.builder()
                .orderItemId(saved.getId())
                .orderId(saved.getOrder().getId())
                .orderCode(saved.getOrder().getOrderCode())
                .tableNumber(tableNum)
                .dishId(saved.getDish().getId())
                .dishName(saved.getDish().getName())
                .quantity(saved.getQuantity())
                .kitchenStatus(saved.getKitchenStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    public void notifyKitchenQueueUpdate() {
        try {
            List<KitchenQueueItemResponse> updatedQueue = getKitchenQueue(null);
            messagingTemplate.convertAndSend("/topic/kitchen", ApiResponse.ok("Cập nhật hàng đợi Bếp", updatedQueue));
        } catch (Exception e) {
            log.error("Lỗi khi bắn WebSocket thông báo Bếp: {}", e.getMessage());
        }
    }
}

