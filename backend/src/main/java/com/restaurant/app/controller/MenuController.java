package com.restaurant.app.controller;

import com.restaurant.app.dto.request.CategoryRequest;
import com.restaurant.app.dto.request.DishRequest;
import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.CategoryResponse;
import com.restaurant.app.dto.response.DishResponse;
import com.restaurant.app.entity.enums.DishStatus;
import com.restaurant.app.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
@Tag(name = "Menu & Dish Management", description = "APIs Quản lý Danh mục & Thực đơn món ăn")
public class MenuController {

    private final MenuService menuService;

    // ==========================================
    // CATEGORY ENDPOINTS
    // ==========================================

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách tất cả danh mục món ăn đang hoạt động")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.ok(menuService.getAllCategories()));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Thêm danh mục món mới (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo danh mục thành công!", menuService.createCategory(request)));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Chỉnh sửa danh mục món (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật danh mục thành công!", menuService.updateCategory(id, request)));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Xóa (ẩn) danh mục món (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        menuService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã ẩn danh mục thành công!", null));
    }

    // ==========================================
    // DISH ENDPOINTS
    // ==========================================

    @GetMapping("/dishes")
    @Operation(summary = "Lấy danh sách thực đơn món ăn (Có thể lọc theo categoryId hoặc món còn hàng)")
    public ResponseEntity<ApiResponse<List<DishResponse>>> getDishes(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean availableOnly) {
        return ResponseEntity.ok(ApiResponse.ok(menuService.getDishes(categoryId, availableOnly)));
    }

    @GetMapping("/dishes/{id}")
    @Operation(summary = "Xem chi tiết một món ăn")
    public ResponseEntity<ApiResponse<DishResponse>> getDishById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(menuService.getDishById(id)));
    }

    @PostMapping("/dishes")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Thêm món ăn mới vào thực đơn (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<DishResponse>> createDish(@Valid @RequestBody DishRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Thêm món ăn thành công!", menuService.createDish(request)));
    }

    @PutMapping("/dishes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Chỉnh sửa thông tin món ăn / đổi giá (Chỉ Admin/Quản lý)")
    public ResponseEntity<ApiResponse<DishResponse>> updateDish(
            @PathVariable Long id,
            @Valid @RequestBody DishRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật món ăn thành công!", menuService.updateDish(id, request)));
    }

    @PatchMapping({"/dishes/{id}/toggle-availability", "/dishes/{id}/availability"})
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CHEF')")
    @Operation(summary = "Bật/Tắt trạng thái Còn hàng - Hết hàng (Bếp hoặc Quản lý thao tác nhanh)")
    public ResponseEntity<ApiResponse<DishResponse>> toggleAvailability(@PathVariable Long id) {
        DishResponse updated = menuService.toggleAvailability(id);
        String msg = Boolean.TRUE.equals(updated.getIsAvailable()) ? "Đã chuyển sang CÒN HÀNG" : "Đã chuyển sang HẾT HÀNG";
        return ResponseEntity.ok(ApiResponse.ok(msg, updated));
    }

    @PatchMapping("/dishes/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CHEF')")
    @Operation(summary = "Cập nhật trạng thái món: AVAILABLE (Đang phục vụ), SUSPENDED (Tạm ngưng), OUT_OF_STOCK (Hết món)")
    public ResponseEntity<ApiResponse<DishResponse>> updateDishStatus(
            @PathVariable Long id,
            @RequestParam DishStatus status) {
        DishResponse updated = menuService.updateDishStatus(id, status);
        String msg;
        switch (status) {
            case SUSPENDED -> msg = "Đã tạm ngưng phục vụ món '" + updated.getName() + "'";
            case OUT_OF_STOCK -> msg = "Đã đánh dấu hết hàng món '" + updated.getName() + "'";
            default -> msg = "Món '" + updated.getName() + "' đã sẵn sàng phục vụ!";
        }
        return ResponseEntity.ok(ApiResponse.ok(msg, updated));
    }

    @DeleteMapping("/dishes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Xóa mềm món ăn (Chỉ Admin/Quản lý, ẩn khỏi thực đơn)")
    public ResponseEntity<ApiResponse<Void>> deleteDish(@PathVariable Long id) {
        menuService.deleteDish(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa món ăn khỏi thực đơn!", null));
    }
}

