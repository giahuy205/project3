package com.restaurant.app.repository;

import com.restaurant.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Boolean existsByUsername(String username);

    List<User> findAllByOrderByCreatedAtDesc();

    List<User> findByBranchIdOrderByCreatedAtDesc(Long branchId);
}

