package com.restaurant.app.repository;

import com.restaurant.app.entity.Dish;
import com.restaurant.app.entity.enums.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DishRepository extends JpaRepository<Dish, Long> {

    @Query("SELECT d FROM Dish d JOIN FETCH d.category WHERE d.category.id = :categoryId AND d.isDeleted = false ORDER BY d.name ASC")
    List<Dish> findByCategoryIdAndIsDeletedFalseOrderByNameAsc(@Param("categoryId") Long categoryId);

    @Query("SELECT d FROM Dish d JOIN FETCH d.category WHERE d.isDeleted = false ORDER BY d.id ASC")
    List<Dish> findAllByIsDeletedFalseOrderByIdAsc();

    @Query("SELECT d FROM Dish d JOIN FETCH d.category WHERE d.isAvailable = true AND d.isDeleted = false ORDER BY d.name ASC")
    List<Dish> findByIsAvailableTrueAndIsDeletedFalseOrderByNameAsc();

    @Query("SELECT d FROM Dish d JOIN FETCH d.category WHERE d.station = :station AND d.isDeleted = false")
    List<Dish> findByStationAndIsDeletedFalse(@Param("station") Station station);

    long countByCategoryIdAndIsDeletedFalse(Long categoryId);
}

