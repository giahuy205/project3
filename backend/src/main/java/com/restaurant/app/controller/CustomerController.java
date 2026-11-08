package com.restaurant.app.controller;

import com.restaurant.app.dto.request.CustomerRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.CustomerResponse;
import com.restaurant.app.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "APIs Quản lý Khách hàng & Tra cứu Tích điểm")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/by-phone")
    @Operation(summary = "Tra cứu nhanh khách hàng theo Số điện thoại (Hiển thị điểm tích lũy)")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerByPhone(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getCustomerByPhone(phone)));
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm khách hàng theo tên hoặc số điện thoại")
    public ResponseEntity<ApiResponse<List<CustomerResponse>>> searchCustomers(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.searchCustomers(keyword)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết thông tin khách hàng bằng ID")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getCustomerById(id)));
    }

    @PostMapping
    @Operation(summary = "Tạo mới hoặc cập nhật khách hàng thân thiết")
    public ResponseEntity<ApiResponse<CustomerResponse>> createOrUpdateCustomer(
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Lưu thông tin khách hàng thành công!", customerService.createOrUpdateCustomer(request)));
    }
}

