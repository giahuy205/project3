package com.restaurant.app.service.impl;

import com.restaurant.app.dto.request.CheckoutRequest;
import com.restaurant.app.dto.response.*;
import com.restaurant.app.entity.*;
import com.restaurant.app.entity.enums.*;
import com.restaurant.app.exception.ResourceNotFoundException;
import com.restaurant.app.repository.*;
import com.restaurant.app.security.UserDetailsImpl;
import com.restaurant.app.service.BillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepository billRepository;
    private final OrderRepository orderRepository;
    private final DiningTableRepository tableRepository;
    private final CustomerRepository customerRepository;
    private final VoucherRepository voucherRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static final BigDecimal VAT_RATE = new BigDecimal("10.00");
    private static final BigDecimal POINT_RATE = new BigDecimal("1000"); // 1 điểm = 1.000 VND

    @Override
    @Transactional(readOnly = true)
    public BillPreviewResponse previewBill(Long orderId, String voucherCode, String customerPhone, Integer pointsToUse) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId));

        BigDecimal subtotal = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal voucherDiscount = BigDecimal.ZERO;
        Voucher voucher = null;

        // 1. Kiểm tra Voucher hợp lệ
        if (voucherCode != null && !voucherCode.trim().isEmpty()) {
            voucher = voucherRepository.findByCodeIgnoreCase(voucherCode.trim()).orElse(null);
            if (voucher != null && isVoucherValid(voucher, subtotal)) {
                voucherDiscount = calculateVoucherDiscount(voucher, subtotal);
            }
        }

        // 2. Kiểm tra thông tin Khách hàng & Điểm thưởng
        Customer customer = null;
        Integer customerCurrentPoints = 0;
        Integer effectivePointsUsed = 0;
        BigDecimal pointsDiscount = BigDecimal.ZERO;

        if (customerPhone != null && !customerPhone.trim().isEmpty()) {
            customer = customerRepository.findByPhone(customerPhone.trim()).orElse(null);
            if (customer != null) {
                customerCurrentPoints = customer.getPoints() != null ? customer.getPoints() : 0;
                if (pointsToUse != null && pointsToUse > 0) {
                    effectivePointsUsed = Math.min(pointsToUse, customerCurrentPoints);
                    // Điểm tối đa chỉ giảm được 50% giá trị còn lại sau voucher
                    BigDecimal maxAllowedDiscount = subtotal.subtract(voucherDiscount).multiply(new BigDecimal("0.5"));
                    BigDecimal requestedDiscount = new BigDecimal(effectivePointsUsed).multiply(POINT_RATE);
                    if (requestedDiscount.compareTo(maxAllowedDiscount) > 0) {
                        pointsDiscount = maxAllowedDiscount;
                        effectivePointsUsed = maxAllowedDiscount.divide(POINT_RATE, 0, RoundingMode.FLOOR).intValue();
                    } else {
                        pointsDiscount = requestedDiscount;
                    }
                }
            }
        }

        // 3. Tính thuế VAT 10% sau khi đã trừ giảm giá
        BigDecimal taxableAmount = subtotal.subtract(voucherDiscount).subtract(pointsDiscount);
        if (taxableAmount.compareTo(BigDecimal.ZERO) < 0) {
            taxableAmount = BigDecimal.ZERO;
        }
        BigDecimal vatAmount = taxableAmount.multiply(VAT_RATE).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);

        // 4. Tổng tiền thanh toán cuối cùng
        BigDecimal finalAmount = taxableAmount.add(vatAmount);

        // 5. Điểm tích lũy mới: 1 điểm cho mỗi 100.000 VND
        Integer pointsEarned = finalAmount.divide(new BigDecimal("100000"), 0, RoundingMode.FLOOR).intValue();

        String tableName = order.getTable() != null ? order.getTable().getTableNumber() : "Mang về";

        return BillPreviewResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .tableName(tableName)
                .guestCount(order.getTable() != null ? order.getTable().getCapacity() : 1)
                .subtotal(subtotal)
                .voucherDiscount(voucherDiscount)
                .voucherCode(voucher != null ? voucher.getCode() : null)
                .pointsUsed(effectivePointsUsed)
                .pointsDiscount(pointsDiscount)
                .vatRate(VAT_RATE)
                .vatAmount(vatAmount)
                .finalAmount(finalAmount)
                .pointsEarned(pointsEarned)
                .customerName(customer != null ? customer.getFullName() : null)
                .customerCurrentPoints(customerCurrentPoints)
                .build();
    }

    @Override
    @Transactional
    public BillResponse checkout(CheckoutRequest request, UserDetailsImpl cashier) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Đơn hàng này đã được thanh toán hoàn tất trước đó!");
        }

        // Tính toán trước chi tiết hóa đơn
        BillPreviewResponse preview = previewBill(
                request.getOrderId(),
                request.getVoucherCode(),
                request.getCustomerPhone(),
                request.getPointsToUse()
        );

        User cashierUser = userRepository.findById(cashier.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản thu ngân"));

        Customer customer = null;
        if (request.getCustomerPhone() != null && !request.getCustomerPhone().trim().isEmpty()) {
            customer = customerRepository.findByPhone(request.getCustomerPhone().trim()).orElse(null);
        }

        Voucher voucher = null;
        if (preview.getVoucherCode() != null) {
            voucher = voucherRepository.findByCodeIgnoreCase(preview.getVoucherCode()).orElse(null);
            if (voucher != null) {
                voucher.setUsedCount(voucher.getUsedCount() + 1);
                voucherRepository.save(voucher);
            }
        }

        // Tính tiền khách đưa và tiền thừa
        BigDecimal received = request.getReceivedAmount() != null ? request.getReceivedAmount() : preview.getFinalAmount();
        BigDecimal change = BigDecimal.ZERO;
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            if (received.compareTo(preview.getFinalAmount()) < 0) {
                throw new IllegalArgumentException("Số tiền khách đưa (" + received + ") nhỏ hơn tổng tiền cần trả (" + preview.getFinalAmount() + ")!");
            }
            change = received.subtract(preview.getFinalAmount());
        } else {
            received = preview.getFinalAmount();
        }

        // Sinh mã hóa đơn: BILL-yyyyMMdd-XXXX
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long billCountToday = billRepository.count();
        String billCode = String.format("BILL-%s-%04d", dateStr, billCountToday + 1);

        // Tạo Entity Hóa đơn
        Bill bill = Bill.builder()
                .billCode(billCode)
                .order(order)
                .customer(customer)
                .voucher(voucher)
                .cashier(cashierUser)
                .subtotal(preview.getSubtotal())
                .discountAmount(preview.getVoucherDiscount())
                .pointsUsed(preview.getPointsUsed())
                .pointsDiscount(preview.getPointsDiscount())
                .vatRate(preview.getVatRate())
                .vatAmount(preview.getVatAmount())
                .finalAmount(preview.getFinalAmount())
                .receivedAmount(received)
                .changeAmount(change)
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PAID)
                .build();

        bill = billRepository.save(bill);

        // Cập nhật điểm thành viên
        if (customer != null) {
            int currentPts = customer.getPoints() != null ? customer.getPoints() : 0;
            // Trừ điểm đã dùng
            if (preview.getPointsUsed() > 0) {
                currentPts -= preview.getPointsUsed();
                PointTransaction deductTx = PointTransaction.builder()
                        .customer(customer)
                        .order(order)
                        .pointsChange(-preview.getPointsUsed())
                        .type(PointTransactionType.REDEEM)
                        .description("Dùng điểm giảm giá hóa đơn " + billCode)
                        .build();
                pointTransactionRepository.save(deductTx);
            }
            // Cộng điểm tích lũy mới
            if (preview.getPointsEarned() > 0) {
                currentPts += preview.getPointsEarned();
                PointTransaction earnTx = PointTransaction.builder()
                        .customer(customer)
                        .order(order)
                        .pointsChange(preview.getPointsEarned())
                        .type(PointTransactionType.EARN)
                        .description("Tích điểm hóa đơn " + billCode)
                        .build();
                pointTransactionRepository.save(earnTx);
            }
            customer.setPoints(Math.max(0, currentPts));
            customer.setTotalSpent(customer.getTotalSpent().add(preview.getFinalAmount()));
            customerRepository.save(customer);
        }

        // Cập nhật trạng thái Đơn hàng sang COMPLETED và hoàn tất tất cả món ăn trong bếp
        order.setStatus(OrderStatus.COMPLETED);
        if (order.getItems() != null) {
            for (OrderItem it : order.getItems()) {
                if (it.getKitchenStatus() == KitchenStatus.PENDING ||
                    it.getKitchenStatus() == KitchenStatus.COOKING ||
                    it.getKitchenStatus() == KitchenStatus.READY ||
                    it.getKitchenStatus() == KitchenStatus.CANCEL_REQUESTED) {
                    it.setKitchenStatus(KitchenStatus.SERVED);
                }
            }
        }
        orderRepository.save(order);

        // Chuyển Bàn ăn về trạng thái CLEANING (Cần dọn bàn)
        DiningTable table = order.getTable();
        if (table != null) {
            table.setStatus(TableStatus.CLEANING);
            tableRepository.save(table);
            log.info("Bàn {} đã được chuyển về trạng thái CLEANING sau khi thanh toán hóa đơn {}", table.getTableNumber(), billCode);

            // Bắn WebSocket thông báo cập nhật sơ đồ bàn
            messagingTemplate.convertAndSend("/topic/tables", table.getId());
            // Bắn WebSocket thông báo Bếp dọn sạch món của bàn đã thanh toán
            messagingTemplate.convertAndSend("/topic/kitchen", "REFRESH_QUEUE");
        }

        return mapToBillResponse(bill, order);
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponse getBillById(Long billId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn ID: " + billId));
        return mapToBillResponse(bill, bill.getOrder());
    }

    @Override
    @Transactional(readOnly = true)
    public BillResponse getBillByOrderId(Long orderId) {
        Bill bill = billRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có hóa đơn cho đơn hàng ID: " + orderId));
        return mapToBillResponse(bill, bill.getOrder());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BillResponse> getAllBills() {
        return billRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(b -> mapToBillResponse(b, b.getOrder()))
                .collect(Collectors.toList());
    }

    private boolean isVoucherValid(Voucher voucher, BigDecimal subtotal) {
        OffsetDateTime now = OffsetDateTime.now();
        if (voucher.getIsActive() != null && !voucher.getIsActive()) {
            return false;
        }
        if (now.isBefore(voucher.getValidFrom()) || now.isAfter(voucher.getValidTo())) {
            return false;
        }
        if (voucher.getUsageLimit() != null && voucher.getUsageLimit() > 0 && voucher.getUsedCount() >= voucher.getUsageLimit()) {
            return false;
        }
        return voucher.getMinOrderAmount() == null || subtotal.compareTo(voucher.getMinOrderAmount()) >= 0;
    }

    private BigDecimal calculateVoucherDiscount(Voucher voucher, BigDecimal subtotal) {
        BigDecimal discount;
        if (voucher.getDiscountType() == DiscountType.PERCENT) {
            discount = subtotal.multiply(voucher.getDiscountValue()).divide(new BigDecimal("100"), 0, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscount() != null && discount.compareTo(voucher.getMaxDiscount()) > 0) {
                discount = voucher.getMaxDiscount();
            }
        } else {
            discount = voucher.getDiscountValue();
        }
        return discount.min(subtotal);
    }

    private BillResponse mapToBillResponse(Bill bill, Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> {
                    BigDecimal totalPrice = item.getPriceAtOrder().multiply(new BigDecimal(item.getQuantity()));
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
                })
                .collect(Collectors.toList());

        String tableName = order.getTable() != null ? order.getTable().getTableNumber() : "Mang về";

        return BillResponse.builder()
                .id(bill.getId())
                .billCode(bill.getBillCode())
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .tableName(tableName)
                .cashierName(bill.getCashier() != null ? bill.getCashier().getFullName() : "")
                .customerName(bill.getCustomer() != null ? bill.getCustomer().getFullName() : null)
                .customerPhone(bill.getCustomer() != null ? bill.getCustomer().getPhone() : null)
                .voucherCode(bill.getVoucher() != null ? bill.getVoucher().getCode() : null)
                .subtotal(bill.getSubtotal())
                .discountAmount(bill.getDiscountAmount())
                .pointsUsed(bill.getPointsUsed())
                .pointsDiscount(bill.getPointsDiscount())
                .vatRate(bill.getVatRate())
                .vatAmount(bill.getVatAmount())
                .finalAmount(bill.getFinalAmount())
                .receivedAmount(bill.getReceivedAmount())
                .changeAmount(bill.getChangeAmount())
                .paymentMethod(bill.getPaymentMethod())
                .paymentStatus(bill.getPaymentStatus())
                .createdAt(bill.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}
