package com.restaurant.app.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "recipes", uniqueConstraints = {
    @UniqueConstraint(name = "uq_dish_inventory_item", columnNames = {"dish_id", "inventory_item_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dish_id", nullable = false)
    private Dish dish;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @Column(name = "quantity_needed", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantityNeeded;

    @Column(name = "wastage_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal wastagePercentage = BigDecimal.ZERO;

    @Column(length = 255)
    private String notes;
}

