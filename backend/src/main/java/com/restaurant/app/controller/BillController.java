package com.restaurant.app.controller;

import com.restaurant.app.dto.request.CheckoutRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.BillPreviewResponse;
import com.restaurant.app.dto.response.BillResponse;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.BillService;
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
@RequestMapping("/bills")
@RequiredArgsConstructor
@Tag(name = "Billing & Payment", description = "APIs Quản lý Hóa đơn, Thanh toán, Voucher & Tích điểm thành viên")
public class BillController {

    private final BillService billService;

    @GetMapping("/preview")
    @Operation(summary = "Xem trước tạm tính hóa đơn (Tính tự động Voucher, Điểm thành viên, Thuế VAT 10%)")
    public ResponseEntity<ApiResponse<BillPreviewResponse>> previewBill(
            @RequestParam Long orderId,
            @RequestParam(required = false) String voucherCode,
            @RequestParam(required = false) String customerPhone,
            @RequestParam(required = false) Integer pointsToUse) {
        BillPreviewResponse response = billService.previewBill(orderId, voucherCode, customerPhone, pointsToUse);
        return ResponseEntity.ok(ApiResponse.ok("Tính trước hóa đơn thành công!", response));
    }

    @PostMapping("/checkout")
    @Operation(summary = "Thanh toán & Chốt hóa đơn (Cộng/trừ điểm thành viên, chuyển bàn về EMPTY)")
    public ResponseEntity<ApiResponse<BillResponse>> checkout(
            @Valid @RequestBody CheckoutRequest request,
            @AuthenticationPrincipal UserDetailsImpl cashier) {
        BillResponse response = billService.checkout(request, cashier);
        return ResponseEntity.ok(ApiResponse.ok("Thanh toán hóa đơn thành công!", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết một hóa đơn bằng ID")
    public ResponseEntity<ApiResponse<BillResponse>> getBillById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(billService.getBillById(id)));
    }

    @GetMapping("/by-order/{orderId}")
    @Operation(summary = "Lấy thông tin hóa đơn theo mã đơn hàng (orderId)")
    public ResponseEntity<ApiResponse<BillResponse>> getBillByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(billService.getBillByOrderId(orderId)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @Operation(summary = "Lấy danh sách tất cả hóa đơn đã thanh toán")
    public ResponseEntity<ApiResponse<List<BillResponse>>> getAllBills() {
        return ResponseEntity.ok(ApiResponse.ok(billService.getAllBills()));
    }
}

