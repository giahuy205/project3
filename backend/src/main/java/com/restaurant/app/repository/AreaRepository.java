package com.restaurant.app.repository;

import com.restaurant.app.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AreaRepository extends JpaRepository<Area, Long> {
    List<Area> findByBranchIdOrderByIdAsc(Long branchId);
}

