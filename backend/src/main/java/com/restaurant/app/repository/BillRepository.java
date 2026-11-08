package com.restaurant.app.repository;

import com.restaurant.app.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByBillCode(String billCode);
    Optional<Bill> findByOrderId(Long orderId);
    List<Bill> findAllByOrderByCreatedAtDesc();
}

