package com.restaurant.app.repository;

import com.restaurant.app.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByIsActiveTrueOrderByDisplayOrderAsc();
    boolean existsByName(String name);
}

