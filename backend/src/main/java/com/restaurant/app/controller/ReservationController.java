package com.restaurant.app.controller;

import com.restaurant.app.dto.request.CreateReservationRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.OrderResponse;
import com.restaurant.app.dto.response.ReservationResponse;
import com.restaurant.app.entity.enums.ReservationStatus;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
@Tag(name = "Reservation Management", description = "APIs Quản lý Đặt bàn trước của Khách hàng (Section 4.1)")
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping("/public")
    @Operation(summary = "Khách hàng Internet gửi yêu cầu đặt bàn trực tuyến (Không cần đăng nhập)")
    public ResponseEntity<ApiResponse<ReservationResponse>> publicBooking(
            @Valid @RequestBody CreateReservationRequest request) {
        ReservationResponse response = reservationService.createReservation(request);
        return ResponseEntity.ok(ApiResponse.ok("Gửi yêu cầu đặt bàn thành công! Nhà hàng sẽ liên hệ xác nhận sớm nhất.", response));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Nhân viên / Quản lý ghi nhận đặt bàn cho khách (Qua điện thoại/trực tiếp)")
    public ResponseEntity<ApiResponse<ReservationResponse>> createInternalReservation(
            @Valid @RequestBody CreateReservationRequest request) {
        ReservationResponse response = reservationService.createReservation(request);
        return ResponseEntity.ok(ApiResponse.ok("Tạo đơn đặt bàn thành công!", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Lấy danh sách các đơn đặt bàn (Có thể lọc theo trạng thái: PENDING, CONFIRMED, COMPLETED, CANCELLED)")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getReservations(
            @RequestParam(defaultValue = "1") Long branchId,
            @RequestParam(required = false) ReservationStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(reservationService.getReservations(branchId, status)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Xem chi tiết một đơn đặt bàn")
    public ResponseEntity<ApiResponse<ReservationResponse>> getReservationById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reservationService.getReservationById(id)));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Xác nhận đặt bàn và gán bàn ăn (Bàn tự động chuyển sang RESERVED màu vàng)")
    public ResponseEntity<ApiResponse<ReservationResponse>> confirmReservation(
            @PathVariable Long id,
            @RequestParam(required = false) Long tableId) {
        ReservationResponse response = reservationService.confirmReservation(id, tableId);
        return ResponseEntity.ok(ApiResponse.ok("Xác nhận đặt bàn thành công!", response));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Hủy đơn đặt bàn (Bàn gán tự động giải phóng về trạng thái EMPTY)")
    public ResponseEntity<ApiResponse<ReservationResponse>> cancelReservation(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        ReservationResponse response = reservationService.cancelReservation(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy đơn đặt bàn thành công!", response));
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Tiếp đón khách vào bàn (Chuyển bàn sang OCCUPIED và tự động mở đơn gọi món)")
    public ResponseEntity<ApiResponse<OrderResponse>> checkInReservation(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl staff) {
        OrderResponse orderResponse = reservationService.checkInReservation(id, staff);
        return ResponseEntity.ok(ApiResponse.ok("Khách đã nhận bàn thành công! Đã tự động mở đơn phục vụ.", orderResponse));
    }
}

