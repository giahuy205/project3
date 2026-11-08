package com.restaurant.app.repository;

import com.restaurant.app.entity.OrderItem;
import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    List<OrderItem> findByKitchenStatusInOrderByCreatedAtAsc(List<KitchenStatus> statuses);

    List<OrderItem> findByDishStationAndKitchenStatusInOrderByCreatedAtAsc(Station station, List<KitchenStatus> statuses);
}

