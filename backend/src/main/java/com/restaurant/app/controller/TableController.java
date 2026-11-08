package com.restaurant.app.controller;

import com.restaurant.app.dto.request.AreaRequest;
import com.restaurant.app.dto.request.DiningTableRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.AreaResponse;
import com.restaurant.app.dto.response.DiningTableResponse;
import com.restaurant.app.entity.enums.TableStatus;
import com.restaurant.app.service.TableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tables")
@RequiredArgsConstructor
@Tag(name = "Table & Area Management", description = "APIs Quản lý Sơ đồ Bàn ăn & Khu vực")
public class TableController {

    private final TableService tableService;

    @GetMapping("/areas")
    @Operation(summary = "Lấy sơ đồ bàn theo từng khu vực/tầng (Kèm trạng thái bàn)")
    public ResponseEntity<ApiResponse<List<AreaResponse>>> getAreasWithTables(
            @RequestParam(defaultValue = "1") Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(tableService.getAreasWithTables(branchId)));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả các bàn trong chi nhánh")
    public ResponseEntity<ApiResponse<List<DiningTableResponse>>> getAllTables(
            @RequestParam(defaultValue = "1") Long branchId) {
        return ResponseEntity.ok(ApiResponse.ok(tableService.getAllTables(branchId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một bàn")
    public ResponseEntity<ApiResponse<DiningTableResponse>> getTableById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(tableService.getTableById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Thêm bàn ăn mới (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<DiningTableResponse>> createTable(
            @Valid @RequestBody DiningTableRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo bàn ăn thành công!", tableService.createTable(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Chỉnh sửa thông tin bàn ăn (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<DiningTableResponse>> updateTable(
            @PathVariable Long id,
            @Valid @RequestBody DiningTableRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật bàn ăn thành công!", tableService.updateTable(id, request)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'WAITER')")
    @Operation(summary = "Cập nhật trạng thái bàn (EMPTY, OCCUPIED, RESERVED, CLEANING)")
    public ResponseEntity<ApiResponse<DiningTableResponse>> updateTableStatus(
            @PathVariable Long id,
            @RequestParam TableStatus status) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái bàn thành công!", tableService.updateTableStatus(id, status)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Xóa bàn ăn (Chỉ Admin/Quản lý, không được xóa bàn đang có khách)")
    public ResponseEntity<ApiResponse<Void>> deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa bàn ăn thành công!", null));
    }

    @PostMapping("/areas")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Thêm khu vực/tầng mới (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<AreaResponse>> createArea(@Valid @RequestBody AreaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo khu vực thành công!", tableService.createArea(request)));
    }
}

