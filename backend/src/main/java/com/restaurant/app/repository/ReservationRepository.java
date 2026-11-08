package com.restaurant.app.repository;

import com.restaurant.app.entity.Reservation;
import com.restaurant.app.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByBranchIdOrderByReservationTimeDesc(Long branchId);
    List<Reservation> findByBranchIdAndStatusOrderByReservationTimeAsc(Long branchId, ReservationStatus status);
    List<Reservation> findByTableIdAndStatus(Long tableId, ReservationStatus status);
    List<Reservation> findByPhoneOrderByReservationTimeDesc(String phone);
}

