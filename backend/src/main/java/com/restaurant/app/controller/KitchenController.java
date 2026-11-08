package com.restaurant.app.controller;

import com.restaurant.app.dto.request.BatchUpdateKitchenStatusRequest;
import com.restaurant.app.dto.request.UpdateKitchenStatusRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.KitchenQueueItemResponse;
import com.restaurant.app.entity.enums.Station;
import com.restaurant.app.service.KitchenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/kitchen")
@RequiredArgsConstructor
@Tag(name = "Kitchen Display System (KDS)", description = "APIs Màn hình Bếp & Thuật toán Lập lịch Gom mẻ Realtime")
public class KitchenController {

    private final KitchenService kitchenService;

    @GetMapping("/queue")
    @Operation(summary = "Lấy hàng đợi chế biến của Bếp (Đã được thuật toán tự động sắp xếp ưu tiên & gom mẻ)")
    public ResponseEntity<ApiResponse<List<KitchenQueueItemResponse>>> getKitchenQueue(
            @RequestParam(required = false) Station station) {
        List<KitchenQueueItemResponse> queue = kitchenService.getKitchenQueue(station);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách hàng đợi Bếp thành công!", queue));
    }

    @PatchMapping("/items/{orderItemId}/status")
    @PreAuthorize("hasAnyRole('CHEF', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Bếp cập nhật trạng thái món (COOKING, READY, SERVED) -> Nếu READY tự động bắn thông báo cho Phục vụ")
    public ResponseEntity<ApiResponse<KitchenQueueItemResponse>> updateItemStatus(
            @PathVariable Long orderItemId,
            @Valid @RequestBody UpdateKitchenStatusRequest request) {
        KitchenQueueItemResponse response = kitchenService.updateItemStatus(orderItemId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái món thành công!", response));
    }

    @RequestMapping(value = "/items/batch-status", method = {RequestMethod.PATCH, RequestMethod.POST, RequestMethod.PUT})
    @PreAuthorize("hasAnyRole('CHEF', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Bếp cập nhật trạng thái cho nhiều món cùng lúc (Gom mẻ)")
    public ResponseEntity<ApiResponse<List<KitchenQueueItemResponse>>> updateBatchItemStatus(
            @Valid @RequestBody BatchUpdateKitchenStatusRequest request) {
        List<KitchenQueueItemResponse> responses = kitchenService.updateBatchItemStatus(request.getOrderItemIds(), request.getStatus());
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái mẻ món thành công!", responses));
    }

    @PostMapping("/items/{orderItemId}/resolve-cancel")
    @PreAuthorize("hasAnyRole('CHEF', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Bếp duyệt yêu cầu hủy món đang nấu: accepted=true (Đồng ý hủy) hoặc accepted=false (Từ chối hủy)")
    public ResponseEntity<ApiResponse<KitchenQueueItemResponse>> resolveCancelRequest(
            @PathVariable Long orderItemId,
            @RequestParam boolean accepted) {
        KitchenQueueItemResponse response = kitchenService.resolveCancelRequest(orderItemId, accepted);
        String msg = accepted ? "Bếp đã ĐỒNG Ý hủy món!" : "Bếp đã TỪ CHỐI hủy món (tiếp tục nấu)!";
        return ResponseEntity.ok(ApiResponse.ok(msg, response));
    }
}

