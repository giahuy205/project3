package com.restaurant.app.service;

import com.restaurant.app.dto.request.*;
import com.restaurant.app.dto.response.OrderItemResponse;
import com.restaurant.app.dto.response.OrderResponse;
import com.restaurant.app.entity.*;
import com.restaurant.app.entity.enums.KitchenStatus;
import com.restaurant.app.entity.enums.OrderStatus;
import com.restaurant.app.entity.enums.OrderType;
import com.restaurant.app.entity.enums.TableStatus;
import com.restaurant.app.repository.*;
import com.restaurant.app.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final DiningTableRepository diningTableRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final DishRepository dishRepository;
    private final KitchenService kitchenService;
    private final SimpMessagingTemplate messagingTemplate;

    // ==========================================
    // 1. MỞ BÀN / TẠO ĐƠN MỚI
    // ==========================================
    @Transactional
    public OrderResponse openTable(OpenTableRequest request, UserDetailsImpl userDetails) {
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh với ID: " + request.getBranchId()));

        User staff = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản nhân viên!"));

        DiningTable table = null;
        if (request.getOrderType() == OrderType.DINE_IN) {
            if (request.getTableId() == null) {
                throw new IllegalArgumentException("Đơn ăn tại bàn bắt buộc phải chọn bàn!");
            }

            table = diningTableRepository.findById(request.getTableId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + request.getTableId()));

            // Kiểm tra xem bàn có đang phục vụ đơn nào chưa đóng không
            Optional<Order> activeOrder = orderRepository.findByTableIdAndStatusIn(
                    table.getId(), Arrays.asList(OrderStatus.PENDING, OrderStatus.SERVING));

            if (activeOrder.isPresent()) {
                throw new IllegalStateException("Bàn " + table.getTableNumber() + " đang có khách ngồi với mã đơn "
                        + activeOrder.get().getOrderCode() + "! Vui lòng gọi thêm món vào đơn hiện tại.");
            }

            // Chuyển trạng thái bàn sang OCCUPIED (Đang có khách)
            table.setStatus(TableStatus.OCCUPIED);
            diningTableRepository.save(table);
        }

        // Xử lý khách hàng (nếu có SĐT)
        Customer customer = null;
        if (request.getCustomerPhone() != null && !request.getCustomerPhone().isBlank()) {
            customer = customerRepository.findByPhone(request.getCustomerPhone().trim())
                    .orElseGet(() -> {
                        String name = (request.getCustomerName() != null && !request.getCustomerName().isBlank())
                                ? request.getCustomerName() : "Khách mới";
                        return customerRepository.save(Customer.builder()
                                .phone(request.getCustomerPhone().trim())
                                .fullName(name)
                                .points(0)
                                .totalSpent(BigDecimal.ZERO)
                                .build());
                    });
        }

        String orderCode = generateOrderCode();

        Order order = Order.builder()
                .orderCode(orderCode)
                .branch(branch)
                .table(table)
                .staff(staff)
                .customer(customer)
                .customerName(request.getCustomerName())
                .orderType(request.getOrderType())
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .build();

        Order saved = orderRepository.save(order);
        log.info("Mở bàn thành công: Mã đơn {} cho {}", orderCode, (table != null ? table.getTableNumber() : "Mang về"));

        // Bắn WebSocket thông báo trạng thái bàn thay đổi cho toàn bộ nhân viên
        notifyTableUpdate();

        return mapToOrderResponse(saved);
    }

    // ==========================================
    // 2. GỌI MÓN / THÊM MÓN VÀO ĐƠN & GỬI BẾP
    // ==========================================
    @Transactional
    public OrderResponse addItemsToOrder(Long orderId, AddOrderItemsRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Đơn hàng này đã đóng, không thể gọi thêm món!");
        }

        for (OrderItemRequest itemReq : request.getItems()) {
            Dish dish = dishRepository.findById(itemReq.getDishId())
                    .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ăn với ID: " + itemReq.getDishId()));

            if (!Boolean.TRUE.equals(dish.getIsAvailable())) {
                throw new IllegalStateException("Món '" + dish.getName() + "' hiện tại đã hết hàng!");
            }

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .dish(dish)
                    .quantity(itemReq.getQuantity())
                    .priceAtOrder(dish.getPrice()) // Chốt giá tại thời điểm gọi món
                    .notes(itemReq.getNotes())
                    .kitchenStatus(KitchenStatus.PENDING)
                    .build();

            order.getItems().add(orderItem);
        }

        // Tính lại tổng tiền món ăn tạm tính (bỏ qua các món bị CANCELLED)
        recalculateTotalAmount(order);

        // Chuyển trạng thái đơn sang SERVING (Đang phục vụ)
        order.setStatus(OrderStatus.SERVING);

        Order saved = orderRepository.save(order);
        log.info("Đã gửi {} món mới xuống Bếp cho đơn {}", request.getItems().size(), saved.getOrderCode());

        // Bắn WebSocket thông báo cho màn hình Bếp có món mới
        kitchenService.notifyKitchenQueueUpdate();

        return mapToOrderResponse(saved);
    }

    // ==========================================
    // 3. ĐỔI BÀN / CHUYỂN BÀN
    // ==========================================
    @Transactional
    public OrderResponse changeTable(Long orderId, ChangeTableRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getOrderType() != OrderType.DINE_IN || order.getTable() == null) {
            throw new IllegalStateException("Chỉ đơn phục vụ tại bàn mới có thể chuyển bàn!");
        }

        DiningTable newTable = diningTableRepository.findById(request.getNewTableId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn mới với ID: " + request.getNewTableId()));

        if (newTable.getId().equals(order.getTable().getId())) {
            throw new IllegalArgumentException("Bàn mới trùng với bàn hiện tại!");
        }

        if (newTable.getStatus() != TableStatus.EMPTY) {
            throw new IllegalStateException("Bàn " + newTable.getTableNumber() + " hiện không trống!");
        }

        DiningTable oldTable = order.getTable();
        oldTable.setStatus(TableStatus.EMPTY);
        diningTableRepository.save(oldTable);

        newTable.setStatus(TableStatus.OCCUPIED);
        diningTableRepository.save(newTable);

        order.setTable(newTable);
        Order saved = orderRepository.save(order);

        log.info("Chuyển đơn {} từ {} sang {}", saved.getOrderCode(), oldTable.getTableNumber(), newTable.getTableNumber());

        // Bắn WebSocket cập nhật sơ đồ bàn và cập nhật tên bàn trên màn hình Bếp
        notifyTableUpdate();
        kitchenService.notifyKitchenQueueUpdate();

        return mapToOrderResponse(saved);
    }

    // ==========================================
    // 4. HỦY MÓN TRONG ĐƠN (KÈM LÝ DO)
    // ==========================================
    @Transactional
    public OrderResponse cancelItem(Long orderId, Long itemId, CancelItemRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        OrderItem targetItem = order.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy món ID " + itemId + " trong đơn hàng này!"));

        if (targetItem.getKitchenStatus() == KitchenStatus.READY || targetItem.getKitchenStatus() == KitchenStatus.SERVED) {
            throw new IllegalStateException("Món ăn đã chế biến xong hoặc đã phục vụ, không thể hủy!");
        }

        String tableNum = order.getTable() != null ? order.getTable().getTableNumber() : "Mang về";

        // Trường hợp 1: Món đang nấu (COOKING) -> Gửi yêu cầu xin hủy xuống Bếp chờ Bếp duyệt
        if (targetItem.getKitchenStatus() == KitchenStatus.COOKING) {
            targetItem.setKitchenStatus(KitchenStatus.CANCEL_REQUESTED);
            targetItem.setCancelReason(request.getCancelReason());
            Order saved = orderRepository.save(order);

            log.info("Gửi yêu cầu hủy món ID {} đang nấu trong đơn {} (Bàn {})", itemId, saved.getOrderCode(), tableNum);

            // Bắn WebSocket cảnh báo khẩn cấp cho Bếp
            Map<String, Object> alert = new HashMap<>();
            alert.put("type", "CANCEL_REQUESTED");
            alert.put("orderItemId", itemId);
            alert.put("tableNumber", tableNum);
            alert.put("dishName", targetItem.getDish().getName());
            alert.put("quantity", targetItem.getQuantity());
            alert.put("reason", request.getCancelReason());
            messagingTemplate.convertAndSend("/topic/kitchen/alerts", alert);

            kitchenService.notifyKitchenQueueUpdate();
            return mapToOrderResponse(saved);
        }

        // Trường hợp 2: Món đang chờ nấu (PENDING) -> Hủy ngay lập tức
        targetItem.setKitchenStatus(KitchenStatus.CANCELLED);
        targetItem.setCancelReason(request.getCancelReason());

        recalculateTotalAmount(order);
        Order saved = orderRepository.save(order);

        log.info("Hủy món PENDING ID {} trong đơn {} với lý do: {}", itemId, saved.getOrderCode(), request.getCancelReason());

        // Bắn WebSocket cập nhật lại hàng đợi Bếp
        kitchenService.notifyKitchenQueueUpdate();

        return mapToOrderResponse(saved);
    }

    // ==========================================
    // 4.1 HỦY BÀN / HỦY ĐƠN HÀNG (MỞ NHẦM HOẶC KHÁCH HỦY)
    // ==========================================
    @Transactional
    public void cancelOrder(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new IllegalStateException("Đơn hàng đã hoàn tất thanh toán, không thể hủy!");
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return;
        }

        boolean hasKitchenItems = false;
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getKitchenStatus() != KitchenStatus.SERVED && item.getKitchenStatus() != KitchenStatus.CANCELLED) {
                    item.setKitchenStatus(KitchenStatus.CANCELLED);
                    item.setCancelReason(reason != null ? reason : "Hủy đơn bàn");
                    hasKitchenItems = true;
                }
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        if (reason != null && !reason.trim().isEmpty()) {
            order.setNote((order.getNote() != null ? order.getNote() + " | " : "") + "Lý do hủy: " + reason.trim());
        }
        orderRepository.save(order);

        // Trả bàn về trạng thái EMPTY
        if (order.getTable() != null) {
            DiningTable table = order.getTable();
            table.setStatus(TableStatus.EMPTY);
            diningTableRepository.save(table);
        }

        log.info("Đã hủy đơn {} (Bàn {}) với lý do: {}", order.getOrderCode(),
                order.getTable() != null ? order.getTable().getTableNumber() : "Mang về", reason);

        notifyTableUpdate();
        if (hasKitchenItems) {
            kitchenService.notifyKitchenQueueUpdate();
        }
    }

    @Transactional
    public void cancelOrderByTableId(Long tableId, String reason) {
        DiningTable table = diningTableRepository.findById(tableId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bàn với ID: " + tableId));

        Order order = orderRepository.findByTableIdAndStatusIn(
                tableId, Arrays.asList(OrderStatus.PENDING, OrderStatus.SERVING)).orElse(null);

        if (order != null) {
            cancelOrder(order.getId(), reason);
        } else {
            table.setStatus(TableStatus.EMPTY);
            diningTableRepository.save(table);
            notifyTableUpdate();
        }
    }

    // ==========================================
    // 5. TRUY VẤN ĐƠN HÀNG
    // ==========================================
    @Transactional(readOnly = true)
    public OrderResponse getActiveOrderByTable(Long tableId) {
        Order order = orderRepository.findByTableIdAndStatusIn(
                tableId, Arrays.asList(OrderStatus.PENDING, OrderStatus.SERVING))
                .orElseThrow(() -> new IllegalArgumentException("Bàn này hiện không có đơn hàng nào đang hoạt động!"));
        return mapToOrderResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));
        return mapToOrderResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getActiveOrders(Long branchId) {
        return orderRepository.findByBranchIdAndStatusInOrderByCreatedAtDesc(
                branchId, Arrays.asList(OrderStatus.PENDING, OrderStatus.SERVING))
                .stream()
                .map(this::mapToOrderResponse)
                .collect(Collectors.toList());
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================
    private void recalculateTotalAmount(Order order) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem item : order.getItems()) {
            if (item.getKitchenStatus() != KitchenStatus.CANCELLED) {
                BigDecimal itemTotal = item.getPriceAtOrder().multiply(BigDecimal.valueOf(item.getQuantity()));
                total = total.add(itemTotal);
            }
        }
        order.setTotalAmount(total);
    }

    private synchronized String generateOrderCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        OffsetDateTime startOfDay = LocalDate.now().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);

        long count = orderRepository.countByCreatedAtBetween(startOfDay, endOfDay) + 1;
        return String.format("ORD-%s-%04d", dateStr, count);
    }

    public void notifyTableUpdate() {
        try {
            messagingTemplate.convertAndSend("/topic/tables", "REFRESH_TABLES");
        } catch (Exception e) {
            log.error("Lỗi khi bắn WebSocket cập nhật bàn: {}", e.getMessage());
        }
    }

    private OrderResponse mapToOrderResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream().map(item -> {
            BigDecimal totalPrice = item.getPriceAtOrder().multiply(BigDecimal.valueOf(item.getQuantity()));
            return OrderItemResponse.builder()
                    .id(item.getId())
                    .dishId(item.getDish().getId())
                    .dishName(item.getDish().getName())
                    .dishImageUrl(item.getDish().getImageUrl())
                    .unit(item.getDish().getUnit())
                    .station(item.getDish().getStation())
                    .preparationTime(item.getDish().getPreparationTime())
                    .quantity(item.getQuantity())
                    .priceAtOrder(item.getPriceAtOrder())
                    .totalPrice(totalPrice)
                    .notes(item.getNotes())
                    .kitchenStatus(item.getKitchenStatus())
                    .cancelReason(item.getCancelReason())
                    .createdAt(item.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());

        String tableNumber = order.getTable() != null ? order.getTable().getTableNumber() : "Mang về";
        String areaName = order.getTable() != null ? order.getTable().getArea().getName() : "Tại quầy";
        Integer guestCount = order.getTable() != null ? order.getTable().getCapacity() : 4;

        return OrderResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .branchId(order.getBranch().getId())
                .tableId(order.getTable() != null ? order.getTable().getId() : null)
                .tableNumber(tableNumber)
                .tableName(tableNumber)
                .areaName(areaName)
                .guestCount(guestCount)
                .staffId(order.getStaff().getId())
                .staffName(order.getStaff().getFullName())
                .customerId(order.getCustomer() != null ? order.getCustomer().getId() : null)
                .customerName(order.getCustomer() != null ? order.getCustomer().getFullName() : order.getCustomerName())
                .customerPhone(order.getCustomer() != null ? order.getCustomer().getPhone() : null)
                .orderType(order.getOrderType())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .notes(order.getNotes())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}

