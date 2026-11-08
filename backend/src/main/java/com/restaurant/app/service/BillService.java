package com.restaurant.app.service;

import com.restaurant.app.dto.request.CheckoutRequest;
import com.restaurant.app.dto.response.BillPreviewResponse;
import com.restaurant.app.dto.response.BillResponse;
import com.restaurant.app.security.UserDetailsImpl;

import java.util.List;

public interface BillService {
    BillPreviewResponse previewBill(Long orderId, String voucherCode, String customerPhone, Integer pointsToUse);
    BillResponse checkout(CheckoutRequest request, UserDetailsImpl cashier);
    BillResponse getBillById(Long billId);
    BillResponse getBillByOrderId(Long orderId);
    List<BillResponse> getAllBills();
}

