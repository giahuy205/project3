package com.restaurant.app.service;

import com.restaurant.app.dto.request.CreateReservationRequest;
import com.restaurant.app.dto.request.OpenTableRequest;
import com.restaurant.app.dto.response.OrderResponse;
import com.restaurant.app.dto.response.ReservationResponse;
import com.restaurant.app.entity.Branch;
import com.restaurant.app.entity.DiningTable;
import com.restaurant.app.entity.Reservation;
import com.restaurant.app.entity.enums.OrderType;
import com.restaurant.app.entity.enums.ReservationStatus;
import com.restaurant.app.entity.enums.TableStatus;
import com.restaurant.app.exception.ResourceNotFoundException;
import com.restaurant.app.repository.BranchRepository;
import com.restaurant.app.repository.DiningTableRepository;
import com.restaurant.app.repository.ReservationRepository;
import com.restaurant.app.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final BranchRepository branchRepository;
    private final DiningTableRepository tableRepository;
    private final OrderService orderService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest request) {
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + request.getBranchId()));

        DiningTable table = null;
        ReservationStatus initialStatus = ReservationStatus.PENDING;

        if (request.getTableId() != null) {
            table = tableRepository.findById(request.getTableId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn ID: " + request.getTableId()));

            if (table.getStatus() != TableStatus.EMPTY) {
                throw new IllegalArgumentException("Bàn " + table.getTableNumber() + " hiện không ở trạng thái trống!");
            }
            table.setStatus(TableStatus.RESERVED);
            tableRepository.save(table);
            initialStatus = ReservationStatus.CONFIRMED;
            messagingTemplate.convertAndSend("/topic/tables", table.getId());
        }

        Reservation reservation = Reservation.builder()
                .branch(branch)
                .table(table)
                .customerName(request.getCustomerName().trim())
                .phone(request.getPhone().trim())
                .guestCount(request.getGuestCount())
                .reservationTime(request.getReservationTime())
                .depositAmount(request.getDepositAmount() != null ? request.getDepositAmount() : BigDecimal.ZERO)
                .status(initialStatus)
                .notes(request.getNotes())
                .build();

        reservation = reservationRepository.save(reservation);
        log.info("Tạo yêu cầu đặt bàn thành công cho khách {} ({})", reservation.getCustomerName(), reservation.getPhone());

        return mapToResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservations(Long branchId, ReservationStatus status) {
        List<Reservation> list;
        if (status != null) {
            list = reservationRepository.findByBranchIdAndStatusOrderByReservationTimeAsc(branchId, status);
        } else {
            list = reservationRepository.findByBranchIdOrderByReservationTimeDesc(branchId);
        }
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReservationResponse getReservationById(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt bàn ID: " + id));
        return mapToResponse(reservation);
    }

    @Transactional
    public ReservationResponse confirmReservation(Long id, Long tableId) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt bàn ID: " + id));

        if (reservation.getStatus() == ReservationStatus.COMPLETED || reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("Không thể xác nhận đơn đặt bàn đã kết thúc hoặc đã hủy!");
        }

        if (tableId != null) {
            DiningTable table = tableRepository.findById(tableId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn ID: " + tableId));

            if (table.getStatus() != TableStatus.EMPTY && (reservation.getTable() == null || !table.getId().equals(reservation.getTable().getId()))) {
                throw new IllegalArgumentException("Bàn " + table.getTableNumber() + " hiện không ở trạng thái trống để gán đặt bàn!");
            }

            // Nếu đổi sang bàn khác thì giải phóng bàn cũ
            if (reservation.getTable() != null && !reservation.getTable().getId().equals(table.getId())) {
                reservation.getTable().setStatus(TableStatus.EMPTY);
                tableRepository.save(reservation.getTable());
            }

            table.setStatus(TableStatus.RESERVED);
            tableRepository.save(table);
            reservation.setTable(table);
            messagingTemplate.convertAndSend("/topic/tables", table.getId());
        }

        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation = reservationRepository.save(reservation);
        return mapToResponse(reservation);
    }

    @Transactional
    public ReservationResponse cancelReservation(Long id, String reason) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt bàn ID: " + id));

        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new IllegalArgumentException("Khách đã nhận bàn ăn, không thể hủy đơn đặt bàn!");
        }

        // Giải phóng bàn nếu đã gán trước đó
        if (reservation.getTable() != null && reservation.getTable().getStatus() == TableStatus.RESERVED) {
            DiningTable table = reservation.getTable();
            table.setStatus(TableStatus.EMPTY);
            tableRepository.save(table);
            messagingTemplate.convertAndSend("/topic/tables", table.getId());
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        if (reason != null && !reason.trim().isEmpty()) {
            reservation.setNotes((reservation.getNotes() != null ? reservation.getNotes() + " | " : "") + "Lý do hủy: " + reason);
        }

        reservation = reservationRepository.save(reservation);
        return mapToResponse(reservation);
    }

    @Transactional
    public OrderResponse checkInReservation(Long id, UserDetailsImpl staff) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt bàn ID: " + id));

        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new IllegalArgumentException("Đơn đặt bàn này đã được tiếp đón nhận bàn rồi!");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn đặt bàn này đã bị hủy!");
        }

        if (reservation.getTable() == null) {
            throw new IllegalArgumentException("Đơn đặt bàn chưa được gán bàn ăn cụ thể! Vui lòng chọn bàn trước khi check-in.");
        }

        DiningTable table = reservation.getTable();

        // Mở đơn hàng phục vụ cho bàn này
        OpenTableRequest openTableRequest = OpenTableRequest.builder()
                .branchId(reservation.getBranch().getId())
                .tableId(table.getId())
                .orderType(OrderType.DINE_IN)
                .customerName(reservation.getCustomerName())
                .customerPhone(reservation.getPhone())
                .notes("Khách đặt trước lúc " + reservation.getReservationTime() + (reservation.getNotes() != null ? " (" + reservation.getNotes() + ")" : ""))
                .build();

        OrderResponse orderResponse = orderService.openTable(openTableRequest, staff);

        // Đổi trạng thái đặt bàn sang COMPLETED
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservationRepository.save(reservation);

        log.info("Check-in đón khách đặt trước {} vào bàn {} thành công!", reservation.getCustomerName(), table.getTableNumber());

        return orderResponse;
    }

    private ReservationResponse mapToResponse(Reservation r) {
        DiningTable table = r.getTable();
        String tableNumber = table != null ? table.getTableNumber() : "Chưa gán bàn";
        String areaName = (table != null && table.getArea() != null) ? table.getArea().getName() : null;

        String branchName = r.getBranch() != null ? r.getBranch().getName() : "Nhà hàng Nom Nom";
        if (branchName != null && (branchName.contains("Bách Khoa") || branchName.contains("HUST"))) {
            branchName = "Nhà hàng Nom Nom";
        }

        return ReservationResponse.builder()
                .id(r.getId())
                .branchId(r.getBranch() != null ? r.getBranch().getId() : 1L)
                .branchName(branchName)
                .tableId(table != null ? table.getId() : null)
                .tableNumber(tableNumber)
                .areaName(areaName)
                .customerName(r.getCustomerName())
                .phone(r.getPhone())
                .guestCount(r.getGuestCount())
                .reservationTime(r.getReservationTime())
                .depositAmount(r.getDepositAmount())
                .status(r.getStatus())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

