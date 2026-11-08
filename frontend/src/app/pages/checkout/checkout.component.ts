import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { BillService, BillPreview, BillResponse, PaymentMethod } from '../../core/services/bill.service';
import { CustomerService } from '../../core/services/customer.service';
import { Order, Customer, OrderItem, KitchenStatus } from '../../core/models/restaurant.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="checkout-page">
      <!-- Left: Active Orders / Tables Waiting For Payment (Compact 220px) -->
      <aside class="orders-sidebar">
        <div class="sidebar-header">
          <div class="header-title">
            <span class="material-symbols-outlined icon-hdr">receipt_long</span>
            <h3>Bàn Đang Dùng</h3>
          </div>
          <span class="badge-count">{{ activeOrders.length }} bàn</span>
        </div>

        <div class="orders-list">
          <div
            *ngFor="let order of activeOrders"
            class="order-card"
            [class.selected]="selectedOrder?.id === order.id"
            (click)="selectOrder(order)"
          >
            <div class="order-card-top">
              <span class="table-title">{{ order.tableName || order.tableNumber || ('Bàn #' + order.tableId) }}</span>
              <span class="card-area-badge" *ngIf="order.areaName" [title]="order.areaName">{{ order.areaName }}</span>
            </div>
            <div class="order-card-meta">
              <span>{{ order.items ? order.items.length : 0 }} món</span>
              <span>•</span>
              <span>{{ order.guestCount || 4 }} khách</span>
              <span class="order-code">#{{ order.orderCode }}</span>
            </div>
            <div class="order-card-bottom">
              <span class="order-total">{{ order.totalAmount | number:'1.0-0' }} đ</span>
              <span class="btn-select-hint">Tính tiền →</span>
            </div>
          </div>

          <div *ngIf="activeOrders.length === 0" class="empty-orders">
            <span class="material-symbols-outlined empty-icon">check_circle</span>
            <p>Không có bàn nào đang chờ thanh toán.</p>
          </div>
        </div>
      </aside>

      <!-- Center & Right: Billing Desk / Payment Screen -->
      <main class="billing-desk">
        <!-- State 1: No Order Selected -->
        <div *ngIf="!selectedOrder" class="no-selection">
          <div class="no-sel-icon">
            <span class="material-symbols-outlined">point_of_sale</span>
          </div>
          <h2>Quầy Thu Ngân & Thanh Toán</h2>
          <p>Vui lòng chọn một bàn bên danh sách trái để tiến hành kiểm tra đơn và thanh toán hóa đơn.</p>
        </div>

        <!-- State 2: Order Selected -> Full Invoice Breakdown -->
        <div *ngIf="selectedOrder && preview" class="invoice-container">
          <!-- Top Invoice Header (Compact 1-line Bar) -->
          <div class="invoice-header">
            <div class="invoice-header-left">
              <span class="invoice-badge-status">TẠM TÍNH</span>
              <h2 class="invoice-table-name">{{ selectedOrder.tableName || selectedOrder.tableNumber || ('Bàn #' + selectedOrder.tableId) }}</h2>
              <span *ngIf="selectedOrder.areaName" class="invoice-area-badge">{{ selectedOrder.areaName }}</span>
              <span class="invoice-meta-chip">
                <span class="material-symbols-outlined icon-chip">group</span>
                {{ preview.guestCount || selectedOrder.guestCount || 4 }} khách
              </span>
              <span class="invoice-code-chip">#{{ preview.orderCode }}</span>
            </div>

            <div class="header-actions">
              <button class="btn btn-outline btn-action-sm" (click)="printPreBill()" title="In phiếu tạm tính cho khách kiểm món">
                <span class="material-symbols-outlined icon-action">print</span>
                In Tạm Tính
              </button>
              <button class="btn btn-outline btn-action-sm" (click)="selectedOrder = null" title="Đổi bàn khác">
                <span class="material-symbols-outlined icon-action">sync_alt</span>
                Đổi Bàn
              </button>
            </div>
          </div>

          <div class="invoice-body">
            <!-- Left Column: Itemized list + Loyalty/Voucher -->
            <div class="items-column">
              <!-- Itemized list card -->
              <div class="card-box items-box">
                <div class="box-title-row">
                  <h4 class="box-title m-0">
                    <span class="material-symbols-outlined box-title-icon">restaurant</span>
                    Chi Tiết Món Ăn Đã Dùng
                  </h4>
                  <span class="badge-unserved-count" *ngIf="unservedItems.length > 0">
                    {{ unservedItems.length }} món chưa ra bàn
                  </span>
                </div>

                <!-- Cảnh báo nếu bàn còn món chưa phục vụ -->
                <div class="unserved-alert" *ngIf="unservedItems.length > 0">
                  <span class="material-symbols-outlined icon-warn">warning</span>
                  <span>Bàn này hiện còn <b>{{ unservedItems.length }}</b> món đang nấu hoặc chưa lên bàn!</span>
                </div>

                <div class="items-table-wrapper">
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>Tên món</th>
                        <th class="text-center">Số lượng</th>
                        <th class="text-right">Đơn giá</th>
                        <th class="text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of selectedOrder.items" [class.item-cancelled]="item.kitchenStatus === 'CANCELLED'">
                        <td class="font-bold dish-name-col">
                          <div class="dish-name-wrap">
                            <span>{{ item.dishName }}</span>
                            <span class="kitchen-status-pill" [ngClass]="getKitchenStatusClass(item.kitchenStatus)">
                              {{ getKitchenStatusLabel(item.kitchenStatus) }}
                            </span>
                          </div>
                        </td>
                        <td class="text-center">{{ item.quantity }}</td>
                        <td class="text-right text-muted">{{ item.priceAtOrder | number:'1.0-0' }} đ</td>
                        <td class="text-right font-bold">{{ (item.totalPrice || item.totalAmount || (item.priceAtOrder * item.quantity)) | number:'1.0-0' }} đ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Customer Loyalty & Voucher Inputs -->
              <div class="card-box loyalty-box">
                <h4 class="box-title">
                  <span class="material-symbols-outlined box-title-icon">card_membership</span>
                  Khách Hàng Thân Thiết & Mã Giảm Giá
                </h4>
                
                <div class="loyalty-grid">
                  <!-- Phone search: Quy chuẩn nghiêm ngặt SĐT -->
                  <div class="loyalty-field">
                    <label>Số điện thoại tích điểm</label>
                    <div class="input-with-btn">
                      <input
                        type="tel"
                        [(ngModel)]="customerPhone"
                        (input)="onPhoneInput($event)"
                        (keyup.enter)="searchCustomer()"
                        maxlength="11"
                        placeholder="Nhập SĐT"
                        [disabled]="!!customer"
                      />
                      <button 
                        *ngIf="!customer"
                        type="button"
                        class="btn btn-outline btn-input-action" 
                        (click)="searchCustomer()"
                        [disabled]="!isValidPhone(customerPhone) || isSearchingCustomer"
                      >
                        {{ isSearchingCustomer ? 'Đang tìm...' : 'Kiểm tra' }}
                      </button>
                      <button 
                        *ngIf="customer"
                        type="button"
                        class="btn btn-outline btn-input-action btn-clear-cust" 
                        (click)="clearCustomer()"
                        title="Đổi sang số điện thoại khác"
                      >
                        Đổi SĐT
                      </button>
                    </div>
                  </div>

                  <!-- Voucher input -->
                  <div class="loyalty-field">
                    <label>Mã Voucher ưu đãi</label>
                    <div class="input-with-btn">
                      <input
                        type="text"
                        [(ngModel)]="voucherCode"
                        (keyup.enter)="applyVoucher()"
                        placeholder="Nhập mã"
                      />
                      <button class="btn btn-outline btn-input-action" (click)="applyVoucher()">
                        Áp dụng
                      </button>
                    </div>
                  </div>
                </div>

                <!-- STATE A: MULTIPLE MATCHES (Trùng khớp nhiều khách hàng) -->
                <div *ngIf="matchedCustomers.length > 1 && !customer" class="matched-cust-list">
                  <div class="matched-header">
                    <span class="material-symbols-outlined matched-icon">group</span>
                    <span>Tìm thấy <b>{{ matchedCustomers.length }}</b> khách hàng trùng khớp:</span>
                  </div>
                  <div class="matched-items">
                    <div 
                      *ngFor="let mc of matchedCustomers" 
                      class="matched-item"
                      (click)="selectMatchedCustomer(mc)"
                    >
                      <div class="m-cust-info">
                        <span class="m-cust-name">{{ mc.fullName }}</span>
                        <span class="m-cust-phone font-mono">{{ mc.phone || mc.phoneNumber }}</span>
                        <span class="m-cust-pts">({{ (mc.points || mc.loyaltyPoints || 0) | number:'1.0-0' }} điểm)</span>
                      </div>
                      <button type="button" class="btn-select-chip">Chọn</button>
                    </div>
                  </div>
                </div>

                <!-- STATE B: NOT FOUND -> REGISTER NEW CUSTOMER (Bắt buộc nhập họ tên) -->
                <div *ngIf="customerNotFound && !customer" class="new-customer-box">
                  <div class="new-cust-header">
                    <span class="material-symbols-outlined new-cust-icon">person_add</span>
                    <span class="new-cust-msg">SĐT <b>{{ checkedPhone }}</b> chưa có trên hệ thống</span>
                  </div>
                  <div class="new-cust-form">
                    <div class="input-with-btn">
                      <input
                        type="text"
                        [(ngModel)]="newCustomerName"
                        (keyup.enter)="confirmCreateNewCustomer()"
                        placeholder="Nhập họ và tên khách hàng (bắt buộc)..."
                        class="new-cust-name-input"
                      />
                      <button 
                        type="button"
                        class="btn btn-primary btn-input-action" 
                        [disabled]="!newCustomerName.trim() || isCreatingCustomer"
                        (click)="confirmCreateNewCustomer()"
                      >
                        {{ isCreatingCustomer ? 'Đang lưu...' : 'Xác Nhận & Tích Điểm' }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- STATE C: CUSTOMER SELECTED / EXISTING -->
                <div *ngIf="customer" class="customer-info-banner">
                  <div class="customer-name-tier">
                    <div class="cust-title-wrap">
                      <span class="material-symbols-outlined cust-avatar-icon">verified_user</span>
                      <span class="cust-name">Khách hàng: <b>{{ customer.fullName }}</b></span>
                      <span class="cust-phone font-mono">({{ customer.phone || customer.phoneNumber }})</span>
                    </div>
                    <button type="button" class="btn-remove-cust" (click)="clearCustomer()" title="Bỏ chọn / Đổi khách khác">
                      <span class="material-symbols-outlined icon-nano">close</span>
                    </button>
                  </div>
                  <div class="cust-points-row">
                    <span class="cust-tier">Hạng: {{ customer.tier || 'COPPER' }}</span>
                    <span class="cust-points">Điểm tích lũy: <b>{{ (customer.points || customer.loyaltyPoints || 0) | number:'1.0-0' }} điểm</b></span>
                  </div>
                  <!-- Use Points Input -->
                  <div class="points-use-field" *ngIf="(customer.points || customer.loyaltyPoints || 0) > 0">
                    <label>Dùng điểm thanh toán (1 điểm = 1.000 đ):</label>
                    <div class="points-ctrl">
                      <input
                        type="number"
                        [(ngModel)]="pointsToUse"
                        (change)="recalculatePreview()"
                        min="0"
                        [max]="customer.points || customer.loyaltyPoints || 0"
                        step="10"
                      />
                      <button class="btn btn-sm btn-outline" (click)="useMaxPoints()">Dùng tối đa</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Final calculation & Payment method -->
            <div class="payment-column">
              <div class="card-box payment-box">
                <h4 class="box-title">
                  <span class="material-symbols-outlined box-title-icon">calculate</span>
                  Tổng Kết Thanh Toán
                </h4>

                <div class="summary-lines">
                  <div class="sum-row">
                    <span>Tiền món ăn:</span>
                    <span class="font-bold">{{ preview.subtotal | number:'1.0-0' }} đ</span>
                  </div>

                  <div class="sum-row discount-row" *ngIf="preview.voucherDiscount > 0">
                    <span>Voucher ({{ preview.voucherCode }}):</span>
                    <span>-{{ preview.voucherDiscount | number:'1.0-0' }} đ</span>
                  </div>

                  <div class="sum-row discount-row" *ngIf="preview.pointsDiscount > 0">
                    <span>Giảm trừ điểm ({{ preview.pointsUsed }} điểm):</span>
                    <span>-{{ preview.pointsDiscount | number:'1.0-0' }} đ</span>
                  </div>

                  <div class="sum-row">
                    <span>Thuế VAT ({{ preview.vatRate }}%):</span>
                    <span>+{{ preview.vatAmount | number:'1.0-0' }} đ</span>
                  </div>

                  <div class="sum-divider"></div>

                  <div class="sum-row final-row">
                    <span>CẦN THANH TOÁN:</span>
                    <span class="final-price">{{ preview.finalAmount | number:'1.0-0' }} đ</span>
                  </div>

                  <div class="points-earned-tag" *ngIf="customer">
                    🎉 Tích thêm +{{ preview.pointsEarned }} điểm sau thanh toán
                  </div>
                </div>

                <!-- Payment Methods Selector -->
                <div class="method-selector">
                  <label class="section-label">Phương thức thanh toán</label>
                  <div class="method-buttons">
                    <button
                      type="button"
                      class="btn-method"
                      [class.active]="paymentMethod === 'CASH'"
                      (click)="setMethod('CASH')"
                    >
                      <span class="material-symbols-outlined">payments</span>
                      <span>Tiền mặt</span>
                    </button>

                    <button
                      type="button"
                      class="btn-method"
                      [class.active]="paymentMethod === 'BANK_TRANSFER'"
                      (click)="setMethod('BANK_TRANSFER')"
                    >
                      <span class="material-symbols-outlined">qr_code_2</span>
                      <span>Chuyển khoản QR</span>
                    </button>

                    <button
                      type="button"
                      class="btn-method"
                      [class.active]="paymentMethod === 'CREDIT_CARD'"
                      (click)="setMethod('CREDIT_CARD')"
                    >
                      <span class="material-symbols-outlined">credit_card</span>
                      <span>Quẹt thẻ POS</span>
                    </button>
                  </div>
                </div>

                <!-- CASH DETAILS: Received amount & Change calculation -->
                <div class="cash-calc" *ngIf="paymentMethod === 'CASH'">
                  <label class="section-label">Tiền khách đưa (VND)</label>
                  <input
                    type="number"
                    [(ngModel)]="receivedAmount"
                    class="received-input"
                    placeholder="Nhập số tiền..."
                  />

                  <!-- Quick cash buttons -->
                  <div class="quick-cash-row">
                    <button type="button" (click)="receivedAmount = preview.finalAmount">Vừa đủ</button>
                    <button type="button" (click)="receivedAmount = 500000">500.000</button>
                    <button type="button" (click)="receivedAmount = 1000000">1.000.000</button>
                    <button type="button" (click)="receivedAmount = 2000000">2.000.000</button>
                  </div>

                  <div class="change-row" *ngIf="receivedAmount >= preview.finalAmount">
                    <span>Tiền thối lại:</span>
                    <span class="change-amount">{{ (receivedAmount - preview.finalAmount) | number:'1.0-0' }} đ</span>
                  </div>
                </div>

                <!-- QR PAYMENT VISUAL (TECHCOMBANK - DUONG GIA HUY) -->
                <div class="qr-visual" *ngIf="paymentMethod === 'BANK_TRANSFER'">
                  <div class="qr-bank-card">
                    <div class="bank-card-header">
                      <div class="bank-brand-block">
                        <span class="bank-tag-badge">TECHCOMBANK</span>
                        <span class="bank-brand-sub">Ngân hàng TMCP Kỹ Thương Việt Nam</span>
                      </div>
                      <span class="napas-pill">Napas 247</span>
                    </div>

                    <div class="qr-box">
                      <img
                        [src]="getVietQrUrl()"
                        alt="VietQR Techcombank"
                        class="qr-image"
                      />
                    </div>

                    <div class="qr-bank-details">
                      <div class="qr-detail-row">
                        <span class="qd-label">Chủ TK:</span>
                        <span class="qd-val font-bold">DƯƠNG GIA HUY</span>
                      </div>
                      <div class="qr-detail-row">
                        <span class="qd-label">Số TK:</span>
                        <div class="qd-val-copy">
                          <span class="qd-val font-mono">8016220208</span>
                          <button type="button" class="btn-copy-chip" (click)="copyText('8016220208')">
                            <span class="material-symbols-outlined icon-nano">content_copy</span>
                            {{ copiedField === '8016220208' ? 'Đã chép' : 'Chép' }}
                          </button>
                        </div>
                      </div>
                      <div class="qr-detail-row">
                        <span class="qd-label">Số tiền:</span>
                        <span class="qd-val qd-amount">{{ preview.finalAmount | number:'1.0-0' }} đ</span>
                      </div>
                      <div class="qr-detail-row">
                        <span class="qd-label">Nội dung:</span>
                        <div class="qd-val-copy">
                          <span class="qd-val font-mono">{{ preview.orderCode }}</span>
                          <button type="button" class="btn-copy-chip" (click)="copyText(preview.orderCode)">
                            <span class="material-symbols-outlined icon-nano">content_copy</span>
                            {{ copiedField === preview.orderCode ? 'Đã chép' : 'Chép' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span class="qr-hint">⚡ Quét mã bằng App Ngân hàng hoặc MoMo / VNPay</span>
                </div>

                <!-- ACTION: PROCESS CHECKOUT -->
                <button
                  type="button"
                  class="btn btn-primary btn-process-checkout"
                  (click)="processCheckout()"
                  [disabled]="isProcessing || (paymentMethod === 'CASH' && receivedAmount < preview.finalAmount)"
                >
                  <span class="material-symbols-outlined">receipt</span>
                  <span>{{ isProcessing ? 'Đang hoàn tất...' : 'Hoàn Tất Thanh Toán & In Bill' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal: Unserved Items Warning -->
        <div class="modal-backdrop" *ngIf="showUnservedWarningModal">
          <div class="warning-modal">
            <div class="warn-modal-header">
              <span class="material-symbols-outlined warn-big-icon">warning</span>
              <h3>Bàn Còn Món Chưa Lên Bàn!</h3>
              <p>
                <b>{{ selectedOrder?.tableName || selectedOrder?.tableNumber }}</b> hiện vẫn còn 
                <b class="text-danger">{{ unservedItems.length }}</b> món chưa phục vụ xong:
              </p>
            </div>

            <div class="unserved-items-list">
              <div *ngFor="let it of unservedItems" class="unserved-row">
                <div class="unserved-dish-name">
                  <b>{{ it.quantity }}x</b> {{ it.dishName }}
                </div>
                <span class="kitchen-status-pill" [ngClass]="getKitchenStatusClass(it.kitchenStatus)">
                  {{ getKitchenStatusLabel(it.kitchenStatus) }}
                </span>
              </div>
            </div>

            <p class="warn-modal-question">
              Khách có dùng đầy đủ các món này (hoặc mang về) không?
            </p>

            <div class="warn-modal-actions">
              <button 
                type="button" 
                class="btn btn-outline btn-warn-back" 
                (click)="goToTableToManageDishes()"
                title="Về lại bàn để hủy các món khách không dùng"
              >
                <span class="material-symbols-outlined icon-nano">arrow_back</span>
                Về Bàn Hủy Món
              </button>
              <button 
                type="button" 
                class="btn btn-primary btn-warn-proceed" 
                (click)="confirmCheckoutWithUnserved()"
                title="Vẫn thanh toán đủ các món trên và hoàn tất"
              >
                <span class="material-symbols-outlined icon-nano">check</span>
                Vẫn Thanh Toán Đủ
              </button>
            </div>
            <button type="button" class="btn-close-warn" (click)="showUnservedWarningModal = false">
              Đóng lại & xem hóa đơn
            </button>
          </div>
        </div>

        <!-- State 3: Payment Success Modal / Receipt -->
        <div class="modal-backdrop" *ngIf="completedBill">
          <div class="receipt-modal">
            <div class="receipt-header">
              <span class="material-symbols-outlined success-icon">check_circle</span>
              <h3>Thanh Toán Thành Công!</h3>
              <p>Mã hóa đơn: <b>{{ completedBill.billCode }}</b></p>
            </div>

            <div class="receipt-content">
              <div class="r-row">
                <span>Bàn ăn:</span>
                <b>{{ completedBill.tableName || selectedOrder?.tableName || selectedOrder?.tableNumber || ('Bàn #' + completedBill.orderId) }}</b>
              </div>
              <div class="r-row">
                <span>Thu ngân:</span>
                <span>{{ completedBill.cashierName }}</span>
              </div>
              <div class="r-row">
                <span>Phương thức:</span>
                <span>{{ completedBill.paymentMethod }}</span>
              </div>
              <div class="r-row">
                <span>Tổng tiền:</span>
                <b class="r-price">{{ completedBill.finalAmount | number:'1.0-0' }} đ</b>
              </div>
              <div class="r-row" *ngIf="completedBill.paymentMethod === 'CASH'">
                <span>Tiền thối lại:</span>
                <b>{{ completedBill.changeAmount | number:'1.0-0' }} đ</b>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline" (click)="printFinalBill()">
                <span class="material-symbols-outlined">print</span>
                In Hóa Đơn (K80)
              </button>
              <button class="btn btn-primary" (click)="closeSuccessModal()">
                Đóng
              </button>
            </div>
          </div>
        </div>

        <!-- 80mm Thermal Receipt (Print Only) -->
        <div id="thermal-receipt" *ngIf="selectedOrder && preview">
          <div class="th-header">
            <div class="th-brand">NHÀ HÀNG NOM NOM</div>
            <div class="th-address">Đại Cồ Việt, Hai Bà Trưng, Hà Nội</div>
            <div class="th-phone">Hotline: 0987.654.321</div>
            <div class="th-divider">--------------------------------</div>
            <div class="th-title">{{ printMode === 'FINAL' ? 'HÓA ĐƠN THANH TOÁN' : 'PHIẾU TẠM TÍNH' }}</div>
            <div class="th-meta" *ngIf="completedBill">Mã HĐ: {{ completedBill.billCode }}</div>
            <div class="th-meta">Mã Đơn: {{ selectedOrder.orderCode }}</div>
            <div class="th-meta">Bàn: {{ selectedOrder.tableName || selectedOrder.tableNumber }} | Khách: {{ selectedOrder.guestCount || preview.guestCount || 4 }}</div>
            <div class="th-meta" *ngIf="selectedOrder.areaName">Khu vực: {{ selectedOrder.areaName }}</div>
            <div class="th-meta">Thời gian: {{ getPrintTime() }}</div>
            <div class="th-divider">--------------------------------</div>
          </div>

          <table class="th-table">
            <thead>
              <tr>
                <th align="left">Món</th>
                <th align="center">SL</th>
                <th align="right">Đ.Giá</th>
                <th align="right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of selectedOrder.items">
                <td>{{ it.dishName }}</td>
                <td align="center">{{ it.quantity }}</td>
                <td align="right">{{ it.priceAtOrder | number:'1.0-0' }}</td>
                <td align="right">{{ (it.totalPrice || it.totalAmount || (it.priceAtOrder * it.quantity)) | number:'1.0-0' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="th-divider">--------------------------------</div>

          <div class="th-summary">
            <div class="th-row">
              <span>Tiền món:</span>
              <span>{{ preview.subtotal | number:'1.0-0' }} đ</span>
            </div>
            <div class="th-row" *ngIf="preview.voucherDiscount > 0">
              <span>Voucher ({{ preview.voucherCode }}):</span>
              <span>-{{ preview.voucherDiscount | number:'1.0-0' }} đ</span>
            </div>
            <div class="th-row" *ngIf="preview.pointsDiscount > 0">
              <span>Điểm tích lũy:</span>
              <span>-{{ preview.pointsDiscount | number:'1.0-0' }} đ</span>
            </div>
            <div class="th-row">
              <span>VAT ({{ preview.vatRate }}%):</span>
              <span>+{{ preview.vatAmount | number:'1.0-0' }} đ</span>
            </div>
            <div class="th-divider">================================</div>
            <div class="th-row th-total">
              <b>TỔNG CỘNG:</b>
              <b>{{ preview.finalAmount | number:'1.0-0' }} đ</b>
            </div>
            <div class="th-divider">================================</div>
            <div class="th-row" *ngIf="printMode === 'FINAL' && completedBill">
              <span>Phương thức:</span>
              <span>{{ completedBill.paymentMethod }}</span>
            </div>
            <div class="th-row" *ngIf="printMode === 'FINAL' && completedBill && completedBill.paymentMethod === 'CASH'">
              <span>Tiền khách đưa:</span>
              <span>{{ completedBill.receivedAmount | number:'1.0-0' }} đ</span>
            </div>
            <div class="th-row" *ngIf="printMode === 'FINAL' && completedBill && completedBill.paymentMethod === 'CASH'">
              <span>Tiền thối lại:</span>
              <span>{{ completedBill.changeAmount | number:'1.0-0' }} đ</span>
            </div>
          </div>

          <div class="th-footer">
            <div class="th-divider">--------------------------------</div>
            <div>CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
            <div class="th-sub">Nom Nom Hub • Wifi: NomNom / Pass: nomnom2026</div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .checkout-page {
      display: flex;
      height: calc(100vh - 64px);
      max-height: calc(100vh - 64px);
      overflow: hidden;
      background: var(--bg-app);
    }

    /* LEFT SIDEBAR (COMPACT 220px) */
    .orders-sidebar {
      width: 220px;
      min-width: 220px;
      max-width: 220px;
      background: #ffffff;
      border-right: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      height: 100%;
    }

    .sidebar-header {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-light);
      background: #f8fafc;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 800;
      color: var(--navy);
    }

    .icon-hdr {
      font-size: 18px;
      color: var(--primary);
    }

    .header-title h3 {
      font-size: 0.84375rem;
      margin: 0;
      white-space: nowrap;
    }

    .badge-count {
      background: var(--status-occupied-bg);
      color: var(--status-occupied);
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      border: 1px solid #fecaca;
      white-space: nowrap;
    }

    .orders-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .order-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 3px;
      transition: all 0.15s;
    }

    .order-card:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .order-card.selected {
      border-color: var(--primary);
      background: #f0fdfa;
      box-shadow: 0 0 0 2px var(--primary-glow);
    }

    .order-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
    }

    .table-title {
      font-weight: 800;
      font-size: 0.875rem;
      color: var(--navy);
      white-space: nowrap;
    }

    .card-area-badge {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: var(--radius-sm);
      border: 1px solid #bae6fd;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .order-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .order-card-meta {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.6875rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
    }

    .order-card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
      padding-top: 3px;
      border-top: 1px dashed #f1f5f9;
    }

    .order-total {
      font-weight: 800;
      font-size: 0.8125rem;
      color: var(--primary);
    }

    .btn-select-hint {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--primary);
    }

    .empty-orders {
      padding: 30px 10px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .empty-icon {
      font-size: 32px;
      color: var(--status-empty);
      margin-bottom: 6px;
    }

    /* RIGHT BILLING DESK */
    .billing-desk {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 16px;
      min-width: 0;
      box-sizing: border-box;
    }

    .no-selection {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--text-secondary);
    }

    .no-sel-icon .material-symbols-outlined {
      font-size: 56px;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .invoice-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 1200px;
      min-height: 0;
    }

    /* TOP INVOICE HEADER: Sleek 1-line Bar */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      min-height: 46px;
      gap: 10px;
    }

    .invoice-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .invoice-badge-status {
      background: #ecfdf5;
      color: #059669;
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      border: 1px solid #a7f3d0;
      letter-spacing: 0.5px;
    }

    .invoice-table-name {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0;
      line-height: 1;
    }

    .invoice-area-badge {
      background: #f1f5f9;
      color: #475569;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
    }

    .invoice-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: #f8fafc;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
    }

    .icon-chip {
      font-size: 14px;
      color: var(--text-muted);
    }

    .invoice-code-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.71875rem;
      color: var(--text-muted);
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-action-sm {
      height: 32px;
      padding: 0 10px;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-radius: var(--radius-sm);
    }

    .icon-action {
      font-size: 16px;
    }

    /* INVOICE BODY: Itemized column + Payment column */
    .invoice-body {
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: flex-start;
      width: 100%;
    }

    .items-column {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .payment-column {
      width: 340px;
      min-width: 310px;
      flex-shrink: 0;
    }

    @media (max-width: 1100px) {
      .invoice-body {
        flex-direction: column;
      }
      .payment-column {
        width: 100%;
      }
    }

    .card-box {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      box-shadow: var(--shadow-sm);
    }

    .box-title {
      font-size: 0.84375rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 10px 0;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .box-title.m-0 {
      margin: 0 !important;
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }

    .box-title-icon {
      font-size: 17px;
      color: var(--primary);
    }

    .box-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }

    .badge-unserved-count {
      background: #fef2f2;
      color: #ef4444;
      border: 1px solid #fecaca;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }

    .unserved-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 0.78125rem;
      color: #92400e;
    }

    .unserved-alert .icon-warn {
      font-size: 18px;
      color: #f59e0b;
      flex-shrink: 0;
    }

    /* ITEMS TABLE */
    .items-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .items-table th {
      background: #f8fafc;
      padding: 6px 10px;
      font-weight: 700;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
      font-size: 0.75rem;
    }

    .items-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
    }

    .dish-name-col {
      min-width: 160px;
      text-align: left;
      font-weight: 700;
      color: var(--navy);
      word-break: normal;
    }

    .dish-name-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .kitchen-status-pill {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .status-pending {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }

    .status-cooking {
      background: #fef3c7;
      color: #d97706;
      border: 1px solid #fde68a;
    }

    .status-ready {
      background: #dbeafe;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .status-served {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .status-cancel-req {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .status-cancelled {
      background: #f3f4f6;
      color: #9ca3af;
      text-decoration: line-through;
    }

    .item-cancelled {
      opacity: 0.5;
      text-decoration: line-through;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-muted { color: var(--text-muted); }

    /* LOYALTY & VOUCHER BOX: Fixed overflow */
    .loyalty-box {
      margin-top: 0;
    }

    .loyalty-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      width: 100%;
      min-width: 0;
    }

    .loyalty-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .loyalty-field label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .input-with-btn {
      display: flex;
      gap: 5px;
      width: 100%;
      min-width: 0;
    }

    .input-with-btn input {
      flex: 1 1 0;
      min-width: 0;
      width: 100%;
      height: 32px;
      padding: 0 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      font-size: 0.78125rem;
      box-sizing: border-box;
    }

    .btn-input-action {
      flex-shrink: 0;
      height: 32px;
      padding: 0 10px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
      border-radius: var(--radius-sm);
    }

    .btn-clear-cust {
      color: #e11d48;
      border-color: #fecdd3;
    }

    .btn-clear-cust:hover {
      background: #fff1f2;
      border-color: #e11d48;
    }

    .new-customer-box {
      margin-top: 8px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      background: #fffbeb;
      border: 1px solid #fde68a;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .new-cust-header {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: #92400e;
    }

    .new-cust-icon {
      font-size: 16px;
      color: #d97706;
    }

    .new-cust-name-input {
      background: #ffffff;
    }

    .matched-cust-list {
      margin-top: 8px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      background: #f8fafc;
      border: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 130px;
      overflow-y: auto;
    }

    .matched-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-secondary);
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }

    .matched-icon {
      font-size: 15px;
      color: var(--primary);
    }

    .matched-items {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .matched-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .matched-item:hover {
      background: #e0f2fe;
    }

    .m-cust-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
    }

    .m-cust-name {
      font-weight: 700;
      color: var(--navy);
    }

    .m-cust-phone {
      color: var(--text-secondary);
      font-size: 0.6875rem;
    }

    .m-cust-pts {
      color: #059669;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .btn-select-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--primary);
      background: #ffffff;
      border: 1px solid var(--primary-glow);
      padding: 1px 8px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-select-chip:hover {
      background: var(--primary);
      color: #ffffff;
    }

    .customer-info-banner {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.78125rem;
    }

    .customer-name-tier {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cust-title-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .cust-avatar-icon {
      font-size: 16px;
      color: var(--primary);
    }

    .cust-phone {
      font-size: 0.71875rem;
      color: var(--text-muted);
    }

    .btn-remove-cust {
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 50%;
    }

    .btn-remove-cust:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    .cust-points-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
    }

    .cust-tier {
      font-weight: 800;
      color: var(--primary);
    }

    .points-use-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
      border-top: 1px dashed #99f6e4;
      padding-top: 6px;
    }

    .points-ctrl {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .points-ctrl input {
      width: 120px;
      height: 30px;
      padding: 0 8px;
      border-radius: var(--radius-sm);
      border: 1px solid #99f6e4;
      font-size: 0.78125rem;
    }

    /* RIGHT PAYMENT SUMMARY */
    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.8125rem;
    }

    .sum-row {
      display: flex;
      justify-content: space-between;
      color: var(--text-secondary);
    }

    .discount-row {
      color: #059669;
      font-weight: 700;
    }

    .sum-divider {
      border-bottom: 1px dashed var(--border-light);
      margin: 4px 0;
    }

    .final-row {
      font-size: 1rem;
      font-weight: 800;
      color: var(--navy);
      align-items: center;
    }

    .final-price {
      color: var(--primary);
      font-size: 1.25rem;
    }

    .points-earned-tag {
      font-size: 0.71875rem;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      text-align: center;
    }

    .method-selector {
      margin-top: 12px;
    }

    .section-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 6px;
    }

    .method-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    .btn-method {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 2px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #f8fafc;
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-method .material-symbols-outlined {
      font-size: 20px;
    }

    .btn-method.active {
      border-color: var(--primary);
      background: #ffffff;
      color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-glow);
    }

    .cash-calc {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .received-input {
      height: 36px;
      padding: 0 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      font-size: 1rem;
      font-weight: 800;
      color: var(--navy);
    }

    .quick-cash-row {
      display: flex;
      gap: 4px;
    }

    .quick-cash-row button {
      flex: 1;
      height: 26px;
      font-size: 0.6875rem;
      font-weight: 700;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #f1f5f9;
      cursor: pointer;
    }

    .change-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f0fdf4;
      border-radius: var(--radius-sm);
      border: 1px solid #bbf7d0;
      font-weight: 700;
      color: #166534;
      font-size: 0.8125rem;
    }

    .change-amount {
      font-size: 1.05rem;
    }

    .qr-visual {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .qr-bank-card {
      width: 100%;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 10px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .bank-card-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
    }

    .bank-brand-block {
      display: flex;
      flex-direction: column;
    }

    .bank-tag-badge {
      font-size: 0.78125rem;
      font-weight: 900;
      color: #e11d48;
      letter-spacing: 0.5px;
    }

    .bank-brand-sub {
      font-size: 0.5625rem;
      color: var(--text-muted);
    }

    .napas-pill {
      background: #0284c7;
      color: #ffffff;
      font-size: 0.625rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: var(--radius-full);
    }

    .qr-box {
      width: 140px;
      height: 140px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .qr-bank-details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }

    .qr-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .qd-label {
      color: var(--text-secondary);
      font-size: 0.6875rem;
    }

    .qd-val {
      color: var(--navy);
    }

    .qd-val-copy {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }

    .btn-copy-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 1px 4px;
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--primary);
      cursor: pointer;
    }

    .btn-copy-chip:hover {
      background: #f0fdfa;
      border-color: var(--primary);
    }

    .qd-amount {
      color: #e11d48;
      font-weight: 800;
      font-size: 0.8125rem;
    }

    .qr-hint {
      font-size: 0.6875rem;
      color: var(--text-secondary);
      text-align: center;
    }

    .btn-process-checkout {
      width: 100%;
      height: 42px;
      margin-top: 12px;
      font-size: 0.875rem;
      font-weight: 800;
      border-radius: var(--radius-sm);
    }

    /* SUCCESS MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    /* WARNING MODAL: UNSERVED ITEMS */
    .warning-modal {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: var(--shadow-xl);
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      0% { transform: scale(0.92); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .warn-modal-header {
      text-align: center;
    }

    .warn-big-icon {
      font-size: 46px;
      color: #f59e0b;
      margin-bottom: 4px;
    }

    .warn-modal-header h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 6px 0;
    }

    .warn-modal-header p {
      font-size: 0.84375rem;
      color: #475569;
      margin: 0;
    }

    .text-danger {
      color: #ef4444;
    }

    .unserved-items-list {
      max-height: 180px;
      overflow-y: auto;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-md);
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .unserved-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 0.8125rem;
    }

    .unserved-row:last-child {
      border-bottom: none;
    }

    .unserved-dish-name {
      color: #0f172a;
      font-weight: 600;
    }

    .warn-modal-question {
      font-size: 0.8125rem;
      color: #64748b;
      text-align: center;
      margin: 0;
      font-style: italic;
    }

    .warn-modal-actions {
      display: flex;
      gap: 10px;
    }

    .warn-modal-actions button {
      flex: 1;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: var(--radius-sm);
    }

    .btn-warn-back {
      border: 1.5px solid #cbd5e1;
      color: #334155;
    }

    .btn-warn-back:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-warn-proceed {
      background: #0d9488;
      color: #ffffff;
      border: none;
    }

    .btn-warn-proceed:hover {
      background: #0f766e;
    }

    .btn-close-warn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
      text-align: center;
      padding: 4px;
      text-decoration: underline;
    }

    .btn-close-warn:hover {
      color: #475569;
    }

    .receipt-modal {
      width: 100%;
      max-width: 400px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: var(--shadow-xl);
    }

    .receipt-header {
      text-align: center;
    }

    .success-icon {
      font-size: 48px;
      color: #10b981;
      margin-bottom: 6px;
    }

    .receipt-content {
      background: #f8fafc;
      padding: 14px;
      border-radius: var(--radius-md);
      border: 1px dashed var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.8125rem;
    }

    .r-row {
      display: flex;
      justify-content: space-between;
    }

    .r-price {
      color: var(--primary);
      font-size: 1.05rem;
    }

    .modal-footer {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    .modal-footer button {
      flex: 1;
      height: 38px;
    }

    #thermal-receipt {
      display: none;
    }

    @media print {
      body * {
        visibility: hidden !important;
      }
      #thermal-receipt, #thermal-receipt * {
        visibility: visible !important;
      }
      #thermal-receipt {
        display: block !important;
        position: fixed;
        left: 0;
        top: 0;
        width: 76mm;
        margin: 0;
        padding: 2mm 3mm;
        background: #ffffff;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        line-height: 1.35;
        color: #000000;
      }
      .th-header {
        text-align: center;
        margin-bottom: 6px;
      }
      .th-brand {
        font-size: 14px;
        font-weight: bold;
      }
      .th-address, .th-phone {
        font-size: 10px;
      }
      .th-title {
        font-size: 13px;
        font-weight: bold;
        margin: 4px 0;
      }
      .th-meta {
        font-size: 10px;
        text-align: left;
      }
      .th-divider {
        font-size: 10px;
        text-align: center;
        letter-spacing: -1px;
        margin: 2px 0;
      }
      .th-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10.5px;
      }
      .th-table th {
        border-bottom: 1px dashed #000;
        padding: 3px 0;
      }
      .th-table td {
        padding: 2px 0;
      }
      .th-summary {
        font-size: 10.5px;
      }
      .th-row {
        display: flex;
        justify-content: space-between;
        padding: 1px 0;
      }
      .th-total {
        font-size: 13px;
        font-weight: bold;
      }
      .th-footer {
        text-align: center;
        font-size: 10.5px;
        margin-top: 6px;
      }
      .th-sub {
        font-size: 9.5px;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private billService = inject(BillService);
  private customerService = inject(CustomerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private routeSub?: Subscription;

  activeOrders: Order[] = [];
  selectedOrder: Order | null = null;
  preview: BillPreview | null = null;

  showUnservedWarningModal = false;

  get unservedItems(): OrderItem[] {
    if (!this.selectedOrder?.items) return [];
    return this.selectedOrder.items.filter(
      it => it.kitchenStatus === 'PENDING' || it.kitchenStatus === 'COOKING' || it.kitchenStatus === 'CANCEL_REQUESTED'
    );
  }

  getKitchenStatusLabel(status?: KitchenStatus | string): string {
    switch (status) {
      case 'PENDING': return 'Chờ nấu';
      case 'COOKING': return 'Đang nấu';
      case 'READY': return 'Đã xong';
      case 'SERVED': return 'Đã lên bàn';
      case 'CANCEL_REQUESTED': return 'Xin hủy';
      case 'CANCELLED': return 'Đã hủy';
      default: return 'Đang xử lý';
    }
  }

  getKitchenStatusClass(status?: KitchenStatus | string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'COOKING': return 'status-cooking';
      case 'READY': return 'status-ready';
      case 'SERVED': return 'status-served';
      case 'CANCEL_REQUESTED': return 'status-cancel-req';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  customerPhone = '';
  customer: Customer | null = null;
  customerNotFound = false;
  checkedPhone = '';
  newCustomerName = '';
  isSearchingCustomer = false;
  isCreatingCustomer = false;
  matchedCustomers: Customer[] = [];

  voucherCode = '';
  pointsToUse = 0;

  paymentMethod: PaymentMethod = 'CASH';
  receivedAmount = 0;
  isProcessing = false;
  completedBill: BillResponse | null = null;
  printMode: 'PRE_BILL' | 'FINAL' = 'PRE_BILL';
  copiedField = '';

  getVietQrUrl(): string {
    if (!this.preview) return '';
    const amount = this.preview.finalAmount || 0;
    const addInfo = encodeURIComponent(this.preview.orderCode || 'NOMNOM');
    return `https://img.vietqr.io/image/TCB-8016220208-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=DUONG%20GIA%20HUY`;
  }

  copyText(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField = text;
      setTimeout(() => {
        if (this.copiedField === text) {
          this.copiedField = '';
        }
      }, 2000);
    }).catch(() => {
      this.copiedField = text;
      setTimeout(() => this.copiedField = '', 2000);
    });
  }

  printPreBill(): void {
    this.printMode = 'PRE_BILL';
    setTimeout(() => window.print(), 100);
  }

  printFinalBill(): void {
    this.printMode = 'FINAL';
    setTimeout(() => window.print(), 100);
  }

  getPrintTime(): string {
    return new Date().toLocaleString('vi-VN');
  }

  ngOnInit(): void {
    this.loadActiveOrders();

    // Listen to query params so if navigating between tables to checkout, it updates smoothly
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      const orderId = params.get('orderId');
      const tableId = params.get('tableId');
      if (orderId || tableId) {
        this.orderService.getActiveOrders().subscribe(orders => {
          this.activeOrders = orders;
          this.selectOrderByQuery(orderId, tableId);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadActiveOrders(): void {
    this.orderService.getActiveOrders().subscribe(orders => {
      this.activeOrders = orders;
      const orderId = this.route.snapshot.queryParamMap.get('orderId');
      const tableId = this.route.snapshot.queryParamMap.get('tableId');
      if (orderId || tableId) {
        this.selectOrderByQuery(orderId, tableId);
      } else if (this.selectedOrder) {
        const refreshed = orders.find(o => o.id === this.selectedOrder!.id);
        if (refreshed) {
          this.selectedOrder = refreshed;
        }
      }
    });
  }

  selectOrderByQuery(orderId: string | null, tableId: string | null): void {
    const match = this.activeOrders.find(o =>
      (orderId && String(o.id) === String(orderId)) ||
      (tableId && String(o.tableId) === String(tableId))
    );
    if (match) {
      this.selectOrder(match);
    }
  }

  selectOrder(order: Order): void {
    this.selectedOrder = order;
    this.customerPhone = '';
    this.customer = null;
    this.customerNotFound = false;
    this.checkedPhone = '';
    this.newCustomerName = '';
    this.matchedCustomers = [];
    this.voucherCode = '';
    this.pointsToUse = 0;

    // Luôn tải trực tiếp dữ liệu mới nhất của đơn hàng từ Backend để đồng bộ trạng thái món ăn mới nhất
    this.orderService.getOrderById(order.id).subscribe({
      next: (freshOrder) => {
        if (freshOrder) {
          this.selectedOrder = freshOrder;
          const idx = this.activeOrders.findIndex(o => o.id === freshOrder.id);
          if (idx !== -1) {
            this.activeOrders[idx] = freshOrder;
          }
        }
      }
    });

    this.recalculatePreview();
  }

  recalculatePreview(): void {
    if (!this.selectedOrder) return;

    this.billService.previewBill(
      this.selectedOrder.id,
      this.voucherCode || undefined,
      this.customerPhone || undefined,
      this.pointsToUse || undefined
    ).subscribe({
      next: (prev) => {
        this.preview = prev;
        if (this.receivedAmount === 0 || this.receivedAmount < prev.finalAmount) {
          this.receivedAmount = prev.finalAmount;
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi tính toán hóa đơn!');
      }
    });
  }

  onPhoneInput(event: any): void {
    const raw = event.target.value || '';
    // Chỉ cho phép nhập số và ký tự '+' ở đầu
    this.customerPhone = raw.replace(/[^\d+]/g, '');
    this.customerNotFound = false;
    this.matchedCustomers = [];
  }

  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    const clean = phone.trim();
    return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(clean) || (clean.length >= 9 && clean.length <= 11 && /^\d+$/.test(clean));
  }

  searchCustomer(): void {
    const phone = this.customerPhone.trim();
    if (!phone) return;

    if (!this.isValidPhone(phone)) {
      alert('Vui lòng nhập đúng định dạng số điện thoại (ví dụ: 0987654321)!');
      return;
    }

    this.isSearchingCustomer = true;
    this.customerNotFound = false;
    this.matchedCustomers = [];

    this.customerService.getCustomerByPhone(phone).subscribe({
      next: (cust) => {
        this.isSearchingCustomer = false;
        if (cust) {
          this.selectMatchedCustomer(cust);
        } else {
          this.customerNotFound = true;
          this.checkedPhone = phone;
          this.customer = null;
          this.newCustomerName = '';
        }
      },
      error: () => {
        // Chưa có trong DB -> hiển thị khung đăng ký nhanh
        this.isSearchingCustomer = false;
        this.customerNotFound = true;
        this.checkedPhone = phone;
        this.customer = null;
        this.newCustomerName = '';
      }
    });
  }

  selectMatchedCustomer(cust: Customer): void {
    this.customer = cust;
    this.customerPhone = cust.phone || cust.phoneNumber || '';
    this.customerNotFound = false;
    this.matchedCustomers = [];
    this.newCustomerName = '';
    this.recalculatePreview();
  }

  confirmCreateNewCustomer(): void {
    if (!this.newCustomerName.trim()) {
      alert('Vui lòng nhập họ và tên khách hàng (bắt buộc)!');
      return;
    }
    const phone = (this.checkedPhone || this.customerPhone).trim();
    if (!phone) {
      alert('Vui lòng nhập số điện thoại hợp lệ!');
      return;
    }

    this.isCreatingCustomer = true;
    this.customerService.createOrUpdateCustomer({
      phone: phone,
      fullName: this.newCustomerName.trim()
    }).subscribe({
      next: (created) => {
        this.isCreatingCustomer = false;
        this.customerNotFound = false;
        this.newCustomerName = '';
        this.selectMatchedCustomer(created);
      },
      error: (err) => {
        this.isCreatingCustomer = false;
        alert(err.error?.message || 'Lỗi khi tạo mới khách hàng!');
      }
    });
  }

  clearCustomer(): void {
    this.customer = null;
    this.customerPhone = '';
    this.pointsToUse = 0;
    this.customerNotFound = false;
    this.matchedCustomers = [];
    this.newCustomerName = '';
    this.recalculatePreview();
  }

  applyVoucher(): void {
    if (!this.voucherCode) return;
    this.recalculatePreview();
  }

  useMaxPoints(): void {
    if (!this.customer) return;
    this.pointsToUse = this.customer.points || this.customer.loyaltyPoints || 0;
    this.recalculatePreview();
  }

  setMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
  }

  processCheckout(): void {
    if (!this.selectedOrder || !this.preview) return;

    // Cảnh báo nếu bàn còn món chưa phục vụ
    if (this.unservedItems.length > 0) {
      this.showUnservedWarningModal = true;
      return;
    }

    this.executeCheckout();
  }

  confirmCheckoutWithUnserved(): void {
    this.showUnservedWarningModal = false;
    this.executeCheckout();
  }

  goToTableToManageDishes(): void {
    this.showUnservedWarningModal = false;
    if (this.selectedOrder) {
      this.router.navigate(['/waiter'], {
        queryParams: { tableId: this.selectedOrder.tableId }
      });
    }
  }

  executeCheckout(): void {
    if (!this.selectedOrder || !this.preview) return;

    this.isProcessing = true;
    this.billService.checkout({
      orderId: this.selectedOrder.id,
      customerPhone: this.customerPhone || undefined,
      voucherCode: this.voucherCode || undefined,
      pointsToUse: this.pointsToUse || undefined,
      paymentMethod: this.paymentMethod,
      receivedAmount: this.receivedAmount
    }).subscribe({
      next: (bill) => {
        this.isProcessing = false;
        this.completedBill = bill;
        // Reload active orders list
        this.loadActiveOrders();
      },
      error: (err) => {
        this.isProcessing = false;
        alert(err.error?.message || 'Lỗi khi hoàn tất thanh toán!');
      }
    });
  }

  closeSuccessModal(): void {
    this.completedBill = null;
    this.selectedOrder = null;
    this.preview = null;
  }
}


