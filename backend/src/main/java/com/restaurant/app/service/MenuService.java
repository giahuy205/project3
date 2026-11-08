package com.restaurant.app.service;

import com.restaurant.app.dto.request.CategoryRequest;
import com.restaurant.app.dto.request.DishRequest;
import com.restaurant.app.dto.response.CategoryResponse;
import com.restaurant.app.dto.response.DishResponse;
import com.restaurant.app.entity.Category;
import com.restaurant.app.entity.Dish;
import com.restaurant.app.entity.enums.DishStatus;
import com.restaurant.app.repository.CategoryRepository;
import com.restaurant.app.repository.DishRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final CategoryRepository categoryRepository;
    private final DishRepository dishRepository;

    // ==========================================
    // CATEGORY OPERATIONS
    // ==========================================

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(cat -> {
                    long count = dishRepository.countByCategoryIdAndIsDeletedFalse(cat.getId());
                    return CategoryResponse.builder()
                            .id(cat.getId())
                            .name(cat.getName())
                            .description(cat.getDescription())
                            .displayOrder(cat.getDisplayOrder())
                            .isActive(cat.getIsActive())
                            .dishCount(count)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Danh mục '" + request.getName() + "' đã tồn tại!");
        }

        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .displayOrder(request.getDisplayOrder())
                .isActive(true)
                .build();

        Category saved = categoryRepository.save(category);
        return CategoryResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .description(saved.getDescription())
                .displayOrder(saved.getDisplayOrder())
                .isActive(saved.getIsActive())
                .dishCount(0L)
                .build();
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + id));

        if (!category.getName().equalsIgnoreCase(request.getName()) && categoryRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Danh mục '" + request.getName() + "' đã tồn tại!");
        }

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setDisplayOrder(request.getDisplayOrder());

        Category saved = categoryRepository.save(category);
        long count = dishRepository.countByCategoryIdAndIsDeletedFalse(saved.getId());

        return CategoryResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .description(saved.getDescription())
                .displayOrder(saved.getDisplayOrder())
                .isActive(saved.getIsActive())
                .dishCount(count)
                .build();
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + id));

        category.setIsActive(false);
        categoryRepository.save(category);
    }

    // ==========================================
    // DISH OPERATIONS
    // ==========================================

    @Transactional(readOnly = true)
    public List<DishResponse> getDishes(Long categoryId, Boolean availableOnly) {
        List<Dish> dishes;

        if (categoryId != null) {
            dishes = dishRepository.findByCategoryIdAndIsDeletedFalseOrderByNameAsc(categoryId);
        } else if (Boolean.TRUE.equals(availableOnly)) {
            dishes = dishRepository.findByIsAvailableTrueAndIsDeletedFalseOrderByNameAsc();
        } else {
            dishes = dishRepository.findAllByIsDeletedFalseOrderByIdAsc();
        }

        return dishes.stream()
                .filter(d -> !Boolean.TRUE.equals(availableOnly) || Boolean.TRUE.equals(d.getIsAvailable()))
                .map(this::mapToDishResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DishResponse getDishById(Long id) {
        Dish dish = dishRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + id));
        return mapToDishResponse(dish);
    }

    @Transactional
    public DishResponse createDish(DishRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        Dish dish = Dish.builder()
                .category(category)
                .name(request.getName())
                .price(request.getPrice())
                .originalPrice(request.getOriginalPrice())
                .scheduledPrice(request.getScheduledPrice())
                .priceEffectiveDate(request.getPriceEffectiveDate())
                .preparationTime(request.getPreparationTime())
                .station(request.getStation())
                .imageUrl(request.getImageUrl())
                .description(request.getDescription())
                .unit(request.getUnit() != null ? request.getUnit() : "Đĩa")
                .isAvailable(true)
                .isDeleted(false)
                .build();

        return mapToDishResponse(dishRepository.save(dish));
    }

    @Transactional
    public DishResponse updateDish(Long id, DishRequest request) {
        Dish dish = dishRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với ID: " + request.getCategoryId()));

        dish.setCategory(category);
        dish.setName(request.getName());
        dish.setPrice(request.getPrice());
        dish.setOriginalPrice(request.getOriginalPrice());
        dish.setScheduledPrice(request.getScheduledPrice());
        dish.setPriceEffectiveDate(request.getPriceEffectiveDate());
        dish.setPreparationTime(request.getPreparationTime());
        dish.setStation(request.getStation());
        dish.setImageUrl(request.getImageUrl());
        dish.setDescription(request.getDescription());
        if (request.getUnit() != null) {
            dish.setUnit(request.getUnit());
        }

        return mapToDishResponse(dishRepository.save(dish));
    }

    @Transactional
    public DishResponse toggleAvailability(Long id) {
        Dish dish = dishRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + id));

        boolean willBeAvailable = !Boolean.TRUE.equals(dish.getIsAvailable());
        dish.setIsAvailable(willBeAvailable);
        dish.setStatus(willBeAvailable ? DishStatus.AVAILABLE : DishStatus.OUT_OF_STOCK);
        return mapToDishResponse(dishRepository.save(dish));
    }

    @Transactional
    public DishResponse updateDishStatus(Long id, DishStatus status) {
        Dish dish = dishRepository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + id));

        dish.setStatus(status);
        dish.setIsAvailable(status == DishStatus.AVAILABLE);
        return mapToDishResponse(dishRepository.save(dish));
    }

    @Transactional
    public void deleteDish(Long id) {
        Dish dish = dishRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + id));

        // Xóa mềm để bảo vệ lịch sử hóa đơn
        dish.setIsDeleted(true);
        dish.setIsAvailable(false);
        dish.setStatus(DishStatus.OUT_OF_STOCK);
        dishRepository.save(dish);
    }

    private DishResponse mapToDishResponse(Dish dish) {
        DishStatus currentStatus = dish.getStatus();
        if (currentStatus == null) {
            currentStatus = Boolean.TRUE.equals(dish.getIsAvailable()) ? DishStatus.AVAILABLE : DishStatus.OUT_OF_STOCK;
        }

        return DishResponse.builder()
                .id(dish.getId())
                .categoryId(dish.getCategory().getId())
                .categoryName(dish.getCategory().getName())
                .name(dish.getName())
                .price(dish.getPrice())
                .originalPrice(dish.getOriginalPrice())
                .scheduledPrice(dish.getScheduledPrice())
                .priceEffectiveDate(dish.getPriceEffectiveDate())
                .preparationTime(dish.getPreparationTime())
                .station(dish.getStation())
                .imageUrl(dish.getImageUrl())
                .description(dish.getDescription())
                .unit(dish.getUnit())
                .isAvailable(dish.getIsAvailable())
                .status(currentStatus)
                .build();
    }
}

