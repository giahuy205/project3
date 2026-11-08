package com.restaurant.app.service;

import com.restaurant.app.dto.request.AreaRequest;
import com.restaurant.app.dto.request.DiningTableRequest;
import com.restaurant.app.dto.response.AreaResponse;
import com.restaurant.app.dto.response.DiningTableResponse;
import com.restaurant.app.entity.Area;
import com.restaurant.app.entity.Branch;
import com.restaurant.app.entity.DiningTable;
import com.restaurant.app.entity.enums.TableStatus;
import com.restaurant.app.repository.AreaRepository;
import com.restaurant.app.repository.BranchRepository;
import com.restaurant.app.repository.DiningTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final AreaRepository areaRepository;
    private final DiningTableRepository diningTableRepository;
    private final BranchRepository branchRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<AreaResponse> getAreasWithTables(Long branchId) {
        List<Area> areas = areaRepository.findByBranchIdOrderByIdAsc(branchId);
        return areas.stream().map(area -> {
            List<DiningTable> tables = diningTableRepository.findByAreaIdOrderByTableNumberAsc(area.getId());
            List<DiningTableResponse> tableResponses = tables.stream()
                    .map(this::mapToTableResponse)
                    .collect(Collectors.toList());

            return AreaResponse.builder()
                    .id(area.getId())
                    .name(area.getName())
                    .tables(tableResponses)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DiningTableResponse> getAllTables(Long branchId) {
        return diningTableRepository.findByAreaBranchIdOrderByTableNumberAsc(branchId)
                .stream()
                .map(this::mapToTableResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DiningTableResponse getTableById(Long id) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + id));
        return mapToTableResponse(table);
    }

    @Transactional
    public DiningTableResponse createTable(DiningTableRequest request) {
        Area area = areaRepository.findById(request.getAreaId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khu vực với ID: " + request.getAreaId()));

        if (diningTableRepository.existsByAreaIdAndTableNumber(request.getAreaId(), request.getTableNumber())) {
            throw new IllegalArgumentException("Số bàn '" + request.getTableNumber() + "' đã tồn tại trong khu vực này!");
        }

        DiningTable table = DiningTable.builder()
                .area(area)
                .tableNumber(request.getTableNumber())
                .capacity(request.getCapacity())
                .status(TableStatus.EMPTY)
                .build();

        DiningTable saved = diningTableRepository.save(table);
        return mapToTableResponse(saved);
    }

    @Transactional
    public DiningTableResponse updateTable(Long id, DiningTableRequest request) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + id));

        Area area = areaRepository.findById(request.getAreaId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khu vực với ID: " + request.getAreaId()));

        // Nếu đổi số bàn hoặc khu vực, kiểm tra trùng lặp
        if ((!table.getTableNumber().equals(request.getTableNumber()) || !table.getArea().getId().equals(request.getAreaId()))
                && diningTableRepository.existsByAreaIdAndTableNumber(request.getAreaId(), request.getTableNumber())) {
            throw new IllegalArgumentException("Số bàn '" + request.getTableNumber() + "' đã tồn tại trong khu vực này!");
        }

        table.setArea(area);
        table.setTableNumber(request.getTableNumber());
        table.setCapacity(request.getCapacity());

        return mapToTableResponse(diningTableRepository.save(table));
    }

    @Transactional
    public DiningTableResponse updateTableStatus(Long id, TableStatus status) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + id));

        table.setStatus(status);
        DiningTable saved = diningTableRepository.save(table);

        // Bắn WebSocket thông báo cập nhật sơ đồ bàn thời gian thực
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/tables", saved.getId());
        }

        return mapToTableResponse(saved);
    }

    @Transactional
    public void deleteTable(Long id) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + id));

        if (table.getStatus() == TableStatus.OCCUPIED) {
            throw new IllegalStateException("Không thể xóa bàn đang có khách ngồi!");
        }

        diningTableRepository.delete(table);
    }

    @Transactional
    public AreaResponse createArea(AreaRequest request) {
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));

        Area area = Area.builder()
                .branch(branch)
                .name(request.getName())
                .build();

        Area saved = areaRepository.save(area);
        return AreaResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .tables(List.of())
                .build();
    }

    private DiningTableResponse mapToTableResponse(DiningTable table) {
        return DiningTableResponse.builder()
                .id(table.getId())
                .areaId(table.getArea().getId())
                .areaName(table.getArea().getName())
                .tableNumber(table.getTableNumber())
                .capacity(table.getCapacity())
                .status(table.getStatus())
                .updatedAt(table.getUpdatedAt())
                .build();
    }
}

