package com.restaurant.app.controller;

import com.restaurant.app.dto.request.*;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.OrderResponse;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Tag(name = "Order Management", description = "APIs Quản lý Đơn hàng, Mở bàn & Gọi món")
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/open-table")
    @Operation(summary = "Mở bàn / Tạo đơn mới (Bàn tự động chuyển sang OCCUPIED khi khách vào ngồi)")
    public ResponseEntity<ApiResponse<OrderResponse>> openTable(
            @Valid @RequestBody OpenTableRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        OrderResponse response = orderService.openTable(request, userDetails);
        return ResponseEntity.ok(ApiResponse.ok("Mở bàn thành công!", response));
    }

    @PostMapping("/{orderId}/items")
    @Operation(summary = "Gửi món / Gọi thêm món vào đơn (Chốt giá lúc gọi & Bắn WebSocket xuống Bếp)")
    public ResponseEntity<ApiResponse<OrderResponse>> addItemsToOrder(
            @PathVariable Long orderId,
            @Valid @RequestBody AddOrderItemsRequest request) {
        OrderResponse response = orderService.addItemsToOrder(orderId, request);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi món xuống Bếp thành công!", response));
    }

    @PutMapping("/{orderId}/change-table")
    @Operation(summary = "Đổi bàn / Chuyển bàn cho khách (Tự động cập nhật trạng thái bàn cũ và mới)")
    public ResponseEntity<ApiResponse<OrderResponse>> changeTable(
            @PathVariable Long orderId,
            @Valid @RequestBody ChangeTableRequest request) {
        OrderResponse response = orderService.changeTable(orderId, request);
        return ResponseEntity.ok(ApiResponse.ok("Chuyển bàn thành công!", response));
    }

    @PatchMapping("/{orderId}/items/{itemId}/cancel")
    @Operation(summary = "Hủy món trong đơn kèm lý do hủy (Chỉ hủy được món Bếp chưa nấu xong)")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelItem(
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @Valid @RequestBody CancelItemRequest request) {
        OrderResponse response = orderService.cancelItem(orderId, itemId, request);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy món thành công!", response));
    }

    @PostMapping("/{orderId}/cancel")
    @Operation(summary = "Hủy đơn hàng / Hủy bàn (Áp dụng khi mở nhầm bàn hoặc khách hủy đơn)")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(
            @PathVariable Long orderId,
            @RequestParam(defaultValue = "Nhân viên mở nhầm bàn") String reason) {
        orderService.cancelOrder(orderId, reason);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy bàn thành công!", null));
    }

    @PostMapping("/by-table/{tableId}/cancel")
    @Operation(summary = "Hủy bàn theo tableId (Áp dụng khi nhân viên mở nhầm số bàn)")
    public ResponseEntity<ApiResponse<Void>> cancelOrderByTableId(
            @PathVariable Long tableId,
            @RequestParam(defaultValue = "Nhân viên mở nhầm bàn") String reason) {
        orderService.cancelOrderByTableId(tableId, reason);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy bàn thành công!", null));
    }

    @GetMapping("/by-table/{tableId}")
    @Operation(summary = "Lấy đơn hàng đang hoạt động của một bàn cụ thể")
    public ResponseEntity<ApiResponse<OrderResponse>> getActiveOrderByTable(@PathVariable Long tableId) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getActiveOrderByTable(tableId)));
    }

    @GetMapping("/{orderId}")
    @Operation(summary = "Xem thông tin chi tiết một đơn hàng")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getOrderById(orderId)));
    }

    @GetMapping("/active")
    @Operation(summary = "Lấy danh sách tất cả các đơn hàng đang hoạt động (PENDING, SERVING)")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getActiveOrders(
            @RequestParam(defaultValue = "1") Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getActiveOrders(branchId)));
    }
}
