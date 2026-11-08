package com.restaurant.app.repository;

import com.restaurant.app.entity.PointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    List<PointTransaction> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}

