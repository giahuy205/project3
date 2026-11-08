package com.restaurant.app.repository;

import com.restaurant.app.entity.Order;
import com.restaurant.app.entity.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByTableIdAndStatusIn(Long tableId, List<OrderStatus> statuses);

    List<Order> findByBranchIdAndStatusInOrderByCreatedAtDesc(Long branchId, List<OrderStatus> statuses);

    boolean existsByOrderCode(String orderCode);

    long countByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);
}

