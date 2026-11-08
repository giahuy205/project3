package com.restaurant.app.repository;

import com.restaurant.app.entity.DiningTable;
import com.restaurant.app.entity.enums.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    @Query("SELECT t FROM DiningTable t JOIN FETCH t.area WHERE t.area.id = :areaId ORDER BY t.tableNumber ASC")
    List<DiningTable> findByAreaIdOrderByTableNumberAsc(@Param("areaId") Long areaId);

    @Query("SELECT t FROM DiningTable t JOIN FETCH t.area WHERE t.area.branch.id = :branchId ORDER BY t.tableNumber ASC")
    List<DiningTable> findByAreaBranchIdOrderByTableNumberAsc(@Param("branchId") Long branchId);

    @Query("SELECT t FROM DiningTable t JOIN FETCH t.area WHERE t.area.branch.id = :branchId AND t.status = :status")
    List<DiningTable> findByAreaBranchIdAndStatus(@Param("branchId") Long branchId, @Param("status") TableStatus status);

    boolean existsByAreaIdAndTableNumber(Long areaId, String tableNumber);
}

