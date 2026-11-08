package com.restaurant.app.controller;

import com.restaurant.app.dto.response.ApiResponse;
import com.restaurant.app.dto.response.CategoryResponse;
import com.restaurant.app.dto.response.DishResponse;
import com.restaurant.app.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Public Customer APIs", description = "APIs Công khai cho Khách hàng ngoài Internet (Không cần đăng nhập)")
public class PublicController {

    private final MenuService menuService;

    @GetMapping("/categories")
    @Operation(summary = "Khách hàng xem danh mục món ăn")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.ok(menuService.getAllCategories()));
    }

    @GetMapping("/dishes")
    @Operation(summary = "Khách hàng xem thực đơn các món ăn đang phục vụ")
    public ResponseEntity<ApiResponse<List<DishResponse>>> getAvailableDishes(
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(ApiResponse.ok(menuService.getDishes(categoryId, true)));
    }
}

