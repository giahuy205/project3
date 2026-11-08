package com.restaurant.app.repository;

import com.restaurant.app.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByPhone(String phone);
    boolean existsByPhone(String phone);
    List<Customer> findByFullNameContainingIgnoreCaseOrPhoneContaining(String name, String phone);
}

