import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableService, AreaWithTables } from '../../core/services/table.service';
import { MenuService } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { KitchenService } from '../../core/services/kitchen.service';
import { AuthService } from '../../core/services/auth.service';
import { Category, DiningTable, Dish, Order, OrderItem, TableStatus, KitchenQueueItem } from '../../core/models/restaurant.models';

interface CartItem {
  dish: Dish;
  quantity: number;
  note: string;
}

@Component({
  selector: 'app-waiter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="waiter-container">
      <!-- Pinned Header Wrapper (Both Row 1 and Row 2 pinned at top, matching Admin) -->
      <div class="pinned-header-wrapper">
        <!-- Top Action & Statistics Bar -->
        <div class="control-header">
          <!-- View Mode Switcher + Selected Table Badge -->
          <div class="header-left-group">
            <div class="view-toggle">
              <button
                class="toggle-btn"
                [class.active]="currentView === 'MAP'"
                (click)="currentView = 'MAP'"
              >
                <span class="material-symbols-outlined">grid_view</span>
                <span>Sơ đồ</span>
              </button>

              <button
                class="toggle-btn"
                [class.active]="currentView === 'MENU'"
                (click)="switchToMenuView()"
                [disabled]="!selectedTable"
              >
                <span class="material-symbols-outlined">restaurant_menu</span>
                <span>Gọi món</span>
              </button>
            </div>

            <!-- Selected Table Badge Pill (Only show on Map view) -->
            <div
              class="selected-table-badge"
              *ngIf="selectedTable && currentView === 'MAP'"
              (click)="switchToMenuView()"
              title="Bấm để vào đơn gọi món"
            >
              <span class="st-dot" [ngClass]="'dot-' + selectedTable.status.toLowerCase()"></span>
              <span class="st-name">{{ getTableName(selectedTable) }}</span>
              <span class="st-status-tag" [ngClass]="'tag-' + selectedTable.status.toLowerCase()">
                {{ getStatusLabel(selectedTable.status) }}
              </span>
            </div>
          </div>

          <!-- Compact Stats Pills (Single Line) -->
          <div class="stats-strip">
            <div class="stat-item stat-total">
              <span class="stat-dot dot-total"></span>
              <span>Tổng bàn: <b>{{ allTables.length }}</b></span>
            </div>
            <div class="stat-item stat-empty">
              <span class="stat-dot dot-empty"></span>
              <span>Bàn trống: <b>{{ countByStatus('EMPTY') }}</b></span>
            </div>
            <div class="stat-item stat-occupied">
              <span class="stat-dot dot-occupied"></span>
              <span>Có khách: <b>{{ countByStatus('OCCUPIED') }}</b></span>
            </div>
            <div class="stat-item stat-cleaning">
              <span class="stat-dot dot-cleaning"></span>
              <span>Đang dọn: <b>{{ countByStatus('CLEANING') }}</b></span>
            </div>
            <div class="stat-item stat-reserved">
              <span class="stat-dot dot-reserved"></span>
              <span>Đặt trước: <b>{{ countByStatus('RESERVED') }}</b></span>
            </div>
          </div>
        </div>

        <!-- Area Dropdown & Admin Map Tools (Row 2: Pinned on Map View) -->
        <div class="area-toolbar-row pinned-toolbar" *ngIf="currentView === 'MAP'">
          <div class="area-dropdown-group">
            <span class="material-symbols-outlined area-icon">location_on</span>
            <select
              class="area-select-box"
              [ngModel]="selectedAreaId"
              (ngModelChange)="selectArea($event)"
            >
              <option [ngValue]="null">Tất cả khu vực ({{ allTables.length }} bàn)</option>
              <option *ngFor="let area of areas; trackBy: trackByAreaId" [ngValue]="area.id">
                {{ area.name }} ({{ area.tables.length }} bàn)
              </option>
            </select>
          </div>

          <!-- Admin & Manager Map Actions Bar -->
          <div class="admin-map-actions">
            <!-- Add Area Button (visible in edit mode) -->
            <button
              *ngIf="isAdmin && isEditMapMode"
              type="button"
              class="btn-action-add-area"
              (click)="openAddAreaModal()"
              title="Thêm khu vực / sảnh / tầng mới"
            >
              <span class="material-symbols-outlined icon-nano">add_circle</span>
              <span>Thêm Khu Vực</span>
            </button>

            <!-- Edit Toggle Button -->
            <button
              *ngIf="isAdmin"
              type="button"
              class="btn-edit-toggle"
              [class.active]="isEditMapMode"
              (click)="toggleEditMapMode()"
              title="Bật/Tắt chế độ chỉnh sửa sơ đồ và bàn ăn"
            >
              <span class="material-symbols-outlined icon-nano">{{ isEditMapMode ? 'edit_attributes' : 'tune' }}</span>
              <span>{{ isEditMapMode ? 'Đang chỉnh sửa' : 'Chỉnh sửa' }}</span>
              <span class="toggle-switch-pill" [class.on]="isEditMapMode"></span>
            </button>

            <!-- Refresh Button -->
            <button
              type="button"
              class="btn-refresh-pill"
              (click)="loadData()"
              [disabled]="isLoadingTables"
              title="Tải lại danh sách bàn"
            >
              <span class="material-symbols-outlined icon-nano" [class.spin]="isLoadingTables">refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- VIEW 1: CLEAN FULL-WIDTH TABLE MAP         -->
      <!-- ========================================== -->
      <div class="map-container" *ngIf="currentView === 'MAP'">
        <!-- Render By Area Sections (Or Filtered Area) -->
        <div class="areas-wrapper">
          <div
            *ngFor="let area of displayedAreas; trackBy: trackByAreaId"
            class="area-section"
          >
            <div class="area-section-header">
              <div class="area-title-group">
                <span class="area-title">{{ area.name }}</span>
                <span class="area-counter">{{ area.tables.length }} bàn</span>
              </div>
              <!-- Admin Add Table Button in Edit Mode -->
              <button
                *ngIf="isAdmin && isEditMapMode"
                type="button"
                class="btn-area-add-table"
                (click)="openAddTableModal(area)"
                title="Thêm bàn mới vào {{ area.name }}"
              >
                <span class="material-symbols-outlined icon-nano">add</span>
                <span>Thêm Bàn</span>
              </button>
            </div>

            <!-- Table Cards Grid (Compact & Responsive) -->
            <div class="table-compact-grid">
              <div
                *ngFor="let table of area.tables; trackBy: trackByTableId"
                class="compact-table-card"
                [ngClass]="getTableCardClass(table)"
                [class.selected]="selectedTable?.id === table.id"
                [class.card-editing]="isAdmin && isEditMapMode"
                (click)="onTableClick(table, area)"
              >
                <!-- Card Header -->
                <div class="c-card-top">
                  <span class="c-table-name">{{ getTableName(table) }}</span>
                  <div class="c-top-meta">
                    <span class="c-capacity">
                      <span class="material-symbols-outlined icon-tiny">person</span>
                      {{ table.capacity }}
                    </span>
                    <!-- Admin Edit Button in Edit Mode -->
                    <button
                      *ngIf="isAdmin && isEditMapMode"
                      type="button"
                      class="btn-card-edit"
                      (click)="$event.stopPropagation(); openEditTableModal(table, area)"
                      title="Sửa thông tin hoặc xóa bàn"
                    >
                      <span class="material-symbols-outlined icon-nano">edit</span>
                    </button>
                  </div>
                </div>

                <!-- Ready Dish Bell Badge! -->
                <div *ngIf="getReadyCount(table) > 0" class="ready-bell-pill" title="Có món nấu xong chờ bưng">
                  <span class="bell-icon">🔔</span>
                  <span>{{ getReadyCount(table) }} món xong</span>
                </div>

                <!-- Status Center -->
                <div class="c-card-center">
                  <span class="status-pill" [ngClass]="'sp-' + table.status.toLowerCase()">
                    {{ getStatusLabel(table.status) }}
                  </span>
                </div>

                <!-- Footer Hint -->
                <div class="c-card-bottom">
                  <span *ngIf="table.status === 'EMPTY'" class="hint-empty">
                    <span class="material-symbols-outlined icon-nano">add_circle</span>
                    Mở bàn
                  </span>
                  <span *ngIf="table.status === 'OCCUPIED'" class="hint-occupied">
                    <span class="material-symbols-outlined icon-nano">receipt_long</span>
                    Xem đơn
                  </span>
                  <span *ngIf="table.status === 'CLEANING'" class="hint-cleaning">
                    <span class="material-symbols-outlined icon-nano">cleaning_services</span>
                    Xác nhận dọn
                  </span>
                  <span *ngIf="table.status === 'RESERVED'" class="hint-reserved">
                    <span class="material-symbols-outlined icon-nano">event_available</span>
                    Đã giữ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- VIEW 2: POS MENU CATALOG & ORDER CART      -->
      <!-- ========================================== -->
      <div class="pos-workspace" *ngIf="currentView === 'MENU'">
        <!-- Left: Menu Catalog -->
        <div class="menu-catalog-pane">
          <div class="menu-toolbar">
            <div class="search-field">
              <span class="material-symbols-outlined">search</span>
              <input
                type="text"
                [(ngModel)]="searchKeyword"
                placeholder="Tìm món ăn hoặc mã món..."
              />
            </div>

            <div class="category-tabs">
              <button
                class="cat-tab"
                [class.active]="selectedCategoryId === null"
                (click)="selectedCategoryId = null"
              >
                Tất cả món
              </button>
              <button
                *ngFor="let cat of categories"
                class="cat-tab"
                [class.active]="selectedCategoryId === cat.id"
                (click)="selectedCategoryId = cat.id"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>

          <!-- Dishes Grid -->
          <div class="dishes-grid">
            <div
              *ngFor="let dish of filteredDishes"
              class="dish-item-card"
              [class.dish-already-ordered]="getOrderedQuantity(dish.id) > 0"
            >
              <div class="dish-card-badges">
                <span class="dish-station-tag">{{ getStationLabel(dish.station) }}</span>
                <span *ngIf="getOrderedQuantity(dish.id) > 0" class="badge-ordered-chip" title="Bàn này đã gọi món này">
                  <span class="material-symbols-outlined icon-nano">check</span>
                  Đã gọi ({{ getOrderedQuantity(dish.id) }}x)
                </span>
              </div>
              <div class="dish-content">
                <div class="dish-meta-line">
                  <span class="d-code">{{ dish.code || ('#M0' + dish.id) }}</span>
                  <span class="d-time">{{ dish.preparationTime || dish.estimatedPrepTime || 15 }}p</span>
                </div>
                <h4 class="d-name">{{ dish.name }}</h4>
                <div class="d-bottom">
                  <span class="d-price">{{ dish.price | number:'1.0-0' }} đ</span>
                  <button
                    class="btn-add"
                    [class.btn-suspended]="dish.status === 'SUSPENDED'"
                    [class.btn-out]="dish.status === 'OUT_OF_STOCK' || !dish.isAvailable"
                    (click)="addToCart(dish)"
                    [disabled]="!dish.isAvailable || dish.status === 'SUSPENDED'"
                    [title]="dish.status === 'SUSPENDED' ? 'Món đang tạm ngưng phục vụ bởi Quản lý' : (!dish.isAvailable ? 'Món đã hết hàng trong ca' : 'Thêm vào giỏ gọi món')"
                  >
                    {{ dish.status === 'SUSPENDED' ? 'Tạm ngưng' : (!dish.isAvailable ? 'Hết món' : '+ Thêm') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order Cart & Actions -->
        <div class="order-cart-pane">
          <div class="cart-header" *ngIf="selectedTable">
            <div>
              <h3>{{ getTableName(selectedTable) }}</h3>
              <div class="cart-header-sub">
                <span class="status-pill sp-occupied">Đang Dùng Bữa</span>
                <span class="cart-capacity-tag">
                  <span class="material-symbols-outlined icon-nano">person</span>
                  {{ selectedTable.capacity || 4 }} khách
                </span>
              </div>
            </div>
          </div>

          <!-- Internal Tab Bar for Order Pane -->
          <div class="order-tabs-bar">
            <button
              type="button"
              class="ot-tab-btn"
              [class.active]="orderTabMode === 'SENT'"
              (click)="orderTabMode = 'SENT'"
            >
              <span class="material-symbols-outlined icon-nano">restaurant</span>
              <span>Đã Gửi Bếp ({{ activeOrder?.items?.length || 0 }})</span>
            </button>
            <button
              type="button"
              class="ot-tab-btn"
              [class.active]="orderTabMode === 'CART'"
              (click)="orderTabMode = 'CART'"
            >
              <span class="material-symbols-outlined icon-nano">shopping_cart</span>
              <span>Đang Chọn ({{ cart.length }})</span>
              <span class="cart-count-badge" *ngIf="cart.length > 0">{{ cart.length }}</span>
            </button>
          </div>

          <!-- Tab Content Body (Scrolls Internally) -->
          <div class="cart-scroll-body">
            <!-- Loading Indicator when switching tables -->
            <div *ngIf="isLoadingOrder" class="order-loading-box">
              <span class="material-symbols-outlined icon-spin">sync</span>
              <span>Đang tải thông tin đơn hàng {{ selectedTable ? getTableName(selectedTable) : '' }}...</span>
            </div>

            <!-- TAB 1: MÓN ĐÃ GỬI BẾP -->
            <div *ngIf="!isLoadingOrder && orderTabMode === 'SENT'" class="tab-view-container">
              <div *ngIf="activeOrder && activeOrder.items && activeOrder.items.length > 0; else noSentItems" class="sent-items-list">
                <div *ngFor="let it of activeOrder.items" class="sent-item-row" [class.row-cancelled]="it.kitchenStatus === 'CANCELLED'">
                  <div class="sent-main">
                    <span class="it-name" [class.line-through]="it.kitchenStatus === 'CANCELLED'">{{ it.dishName }}</span>
                    <span class="it-status" [ngClass]="'ks-' + (it.kitchenStatus || '').toLowerCase()">
                      {{ getKitchenStatusLabel(it.kitchenStatus) }}
                    </span>
                  </div>
                  <div class="sent-sub">
                    <span>{{ it.quantity }}x {{ it.priceAtOrder | number:'1.0-0' }} đ</span>
                    <b>{{ (it.totalAmount || (it.priceAtOrder * it.quantity)) | number:'1.0-0' }} đ</b>
                  </div>
                  <!-- Waiter Actions for this dish -->
                  <div class="sent-item-actions">
                    <button
                      *ngIf="it.kitchenStatus === 'READY'"
                      class="btn-it-act btn-it-serve"
                      (click)="markItemServed(it)"
                    >
                      <span class="material-symbols-outlined icon-nano">check</span>
                      Đã Lên Bàn
                    </button>
                    <button
                      *ngIf="it.kitchenStatus === 'PENDING'"
                      class="btn-it-act btn-it-cancel"
                      (click)="cancelOrderItem(it)"
                    >
                      ✕ Hủy món
                    </button>
                    <button
                      *ngIf="it.kitchenStatus === 'COOKING'"
                      class="btn-it-act btn-it-req-cancel"
                      (click)="cancelOrderItem(it)"
                    >
                      ⚠️ Xin hủy
                    </button>
                    <span *ngIf="it.kitchenStatus === 'CANCEL_REQUESTED'" class="tag-waiting-cancel">
                      Chờ Bếp duyệt hủy...
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noSentItems>
                <div class="cart-empty-text">
                  <span class="material-symbols-outlined icon-empty-muted">receipt_long</span>
                  <p>Bàn này chưa gửi món nào tới Bếp.</p>
                  <button type="button" class="btn btn-sm btn-outline mt-2" (click)="orderTabMode = 'CART'">
                    Chọn món từ thực đơn →
                  </button>
                </div>
              </ng-template>
            </div>

            <!-- TAB 2: MÓN MỚI ĐANG CHỌN TRONG GIỎ -->
            <div *ngIf="!isLoadingOrder && orderTabMode === 'CART'" class="tab-view-container">
              <div class="cart-sub-header">
                <span>Món mới chọn ({{ cart.length }})</span>
                <button *ngIf="cart.length > 0" class="btn-clear" (click)="cart = []">Xóa hết</button>
              </div>

              <div *ngIf="cart.length === 0" class="cart-empty-text">
                <span class="material-symbols-outlined icon-empty-muted">add_shopping_cart</span>
                <p>Chưa chọn món mới nào.</p>
                <span class="hint-small">Chạm nút "+ Thêm" ở thực đơn bên trái để thêm món vào giỏ.</span>
              </div>

              <div *ngFor="let item of cart; let idx = index" class="new-cart-item">
                <div class="c-row-1">
                  <span class="c-item-title">{{ item.dish.name }}</span>
                  <b>{{ (item.dish.price * item.quantity) | number:'1.0-0' }} đ</b>
                </div>
                <div class="c-row-2">
                  <div class="qty-ctrl">
                    <button [disabled]="isSubmitting" (click)="decreaseQty(idx)">-</button>
                    <span>{{ item.quantity }}</span>
                    <button [disabled]="isSubmitting" (click)="increaseQty(idx)">+</button>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="item.note"
                    placeholder="Ghi chú (ít cay, không hành)..."
                    class="c-note-input"
                    [disabled]="isSubmitting"
                  />
                  <button class="btn-del" [disabled]="isSubmitting" (click)="removeItem(idx)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cart Bottom Summary & Triggers (ALWAYS PINNED TO BOTTOM) -->
          <div class="cart-checkout-footer">
            <div class="summary-line" *ngIf="cart.length > 0">
              <span>Món mới chọn ({{ cart.length }} món):</span>
              <b class="text-primary">+{{ calculateCartTotal() | number:'1.0-0' }} đ</b>
            </div>
            <div class="summary-line" *ngIf="activeOrder">
              <span>Tiền món (chưa VAT):</span>
              <span class="font-bold">{{ (activeOrder.totalAmount + calculateCartTotal()) | number:'1.0-0' }} đ</span>
            </div>
            <div class="summary-line total-line" *ngIf="activeOrder">
              <span>Tạm tính (gồm VAT 10%):</span>
              <span class="total-val">{{ ((activeOrder.totalAmount + calculateCartTotal()) * 1.1) | number:'1.0-0' }} đ</span>
            </div>

            <button
              class="btn btn-primary btn-send-kitchen"
              (click)="sendItemsToKitchen()"
              [disabled]="cart.length === 0 || isSubmitting"
            >
              <span class="material-symbols-outlined">skillet</span>
              <span>{{ isSubmitting ? 'Đang gửi...' : (cart.length > 0 ? 'Gửi Bếp Nấu (' + cart.length + ' món mới)' : 'Chưa có món mới để gửi') }}</span>
            </button>

            <div class="actions-grid-3">
              <button type="button" class="btn btn-act-change" (click)="openChangeTableModal()" title="Đổi sang bàn trống khác">
                <span class="material-symbols-outlined icon-nano">sync_alt</span>
                Đổi bàn
              </button>
              <button type="button" class="btn btn-act-cancel" (click)="openCancelTableModal()" title="Hủy bàn mở nhầm hoặc khách đi về">
                <span class="material-symbols-outlined icon-nano">delete_sweep</span>
                Hủy bàn
              </button>
              <button type="button" class="btn btn-checkout-fast" (click)="goToCheckout()">
                <span class="material-symbols-outlined icon-nano">point_of_sale</span>
                Tính tiền
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: OPEN EMPTY TABLE                    -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showOpenModal && modalTable">
        <div class="modal-card">
          <div class="modal-top">
            <span class="material-symbols-outlined modal-icon">deck</span>
            <h3>Mở Bàn: {{ getTableName(modalTable) }}</h3>
            <p>Xác nhận chỉ chỗ cho khách vào ngồi (Sức chứa: {{ modalTable.capacity }} người)</p>
          </div>

          <div class="modal-form">
            <div class="m-field">
              <label>Số lượng khách vào bàn</label>
              <div class="guest-counter">
                <button type="button" [disabled]="guestCount <= 1 || isSubmitting" (click)="guestCount = guestCount > 1 ? guestCount - 1 : 1">-</button>
                <span class="guest-val">{{ guestCount }}</span>
                <button type="button" [disabled]="isSubmitting" (click)="guestCount = guestCount + 1">+</button>
              </div>
            </div>

            <div class="m-field">
              <label>Ghi chú phục vụ</label>
              <input
                type="text"
                [(ngModel)]="openTableNote"
                placeholder="VD: Khách gọi tiệc, mang ghế trẻ em..."
                [disabled]="isSubmitting"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeOpenModal()" [disabled]="isSubmitting">Hủy bỏ</button>
            <button class="btn btn-primary" (click)="confirmOpenTable()" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Đang mở...' : 'Xác Nhận Mở Bàn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADMIN ADD AREA                      -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showAddAreaModal">
        <div class="modal-card modal-sm">
          <div class="modal-top">
            <div class="modal-icon-badge icon-badge-area">
              <span class="material-symbols-outlined">domain_add</span>
            </div>
            <div>
              <h3>Thêm Khu Vực / Tầng Mới</h3>
              <p>Tạo phân vùng mới trong nhà hàng để quản lý sơ đồ bàn</p>
            </div>
          </div>

          <div class="modal-form">
            <div class="m-field">
              <label>Tên khu vực / Tầng <span class="text-danger">*</span></label>
              <input
                type="text"
                [(ngModel)]="newAreaName"
                placeholder="VD: Tầng 3 - Sân Thượng, VIP 2..."
                (keyup.enter)="confirmAddArea()"
                [disabled]="isSubmitting"
                autofocus
              />
            </div>

            <div class="quick-reasons-chips mt-2">
              <button type="button" class="reason-chip" [disabled]="isSubmitting" (click)="newAreaName = 'Tầng 3 - Sân thượng'">Tầng 3 - Sân thượng</button>
              <button type="button" class="reason-chip" [disabled]="isSubmitting" (click)="newAreaName = 'Phòng VIP 2'">Phòng VIP 2</button>
              <button type="button" class="reason-chip" [disabled]="isSubmitting" (click)="newAreaName = 'Quầy Bar & Lounge'">Quầy Bar & Lounge</button>
              <button type="button" class="reason-chip" [disabled]="isSubmitting" (click)="newAreaName = 'Khu Ngoài Trời'">Khu Ngoài Trời</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeAddAreaModal()" [disabled]="isSubmitting">Hủy bỏ</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!newAreaName.trim() || isSubmitting"
              (click)="confirmAddArea()"
            >
              <span class="material-symbols-outlined icon-nano">add</span>
              {{ isSubmitting ? 'Đang tạo...' : '+ Xác Nhận Thêm' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADMIN ADD TABLE                     -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showAddTableModal && targetArea">
        <div class="modal-card">
          <div class="modal-top">
            <span class="material-symbols-outlined modal-icon">add_circle</span>
            <h3>Thêm Bàn Mới</h3>
            <p>Khu vực: <b>{{ targetArea.name }}</b></p>
          </div>

          <div class="modal-form">
            <div class="m-field">
              <label>Tên hoặc Số bàn (VD: Bàn 09, VIP 03, Sân Vườn 05)</label>
              <input type="text" [(ngModel)]="newTableNumber" placeholder="Nhập tên / số bàn..." [disabled]="isSubmitting" />
            </div>

            <div class="m-field">
              <label>Sức chứa (Số người ngồi)</label>
              <div class="guest-counter">
                <button type="button" [disabled]="newTableCapacity <= 1 || isSubmitting" (click)="newTableCapacity = newTableCapacity > 1 ? newTableCapacity - 1 : 1">-</button>
                <span class="guest-val">{{ newTableCapacity }}</span>
                <button type="button" [disabled]="isSubmitting" (click)="newTableCapacity = newTableCapacity + 1">+</button>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeAddTableModal()" [disabled]="isSubmitting">Hủy bỏ</button>
            <button class="btn btn-primary" (click)="confirmAddTable()" [disabled]="!newTableNumber.trim() || isSubmitting">
              {{ isSubmitting ? 'Đang thêm...' : '+ Xác Nhận Thêm Bàn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADMIN EDIT TABLE                   -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showEditTableModal && editingTable">
        <div class="modal-card">
          <div class="modal-top">
            <span class="material-symbols-outlined modal-icon">edit_note</span>
            <h3>Chỉnh Sửa: {{ getTableName(editingTable) }}</h3>
            <p>Trạng thái hiện tại: <b>{{ getStatusLabel(editingTable.status) }}</b></p>
          </div>

          <div class="modal-form">
            <div class="m-field">
              <label>Tên hoặc Số bàn</label>
              <input type="text" [(ngModel)]="editTableNumber" [disabled]="isSubmitting" />
            </div>

            <div class="m-field">
              <label>Sức chứa (Số người ngồi)</label>
              <div class="guest-counter">
                <button type="button" [disabled]="editTableCapacity <= 1 || isSubmitting" (click)="editTableCapacity = editTableCapacity > 1 ? editTableCapacity - 1 : 1">-</button>
                <span class="guest-val">{{ editTableCapacity }}</span>
                <button type="button" [disabled]="isSubmitting" (click)="editTableCapacity = editTableCapacity + 1">+</button>
              </div>
            </div>

            <div class="m-field">
              <label>Khu vực phòng / sảnh</label>
              <select [(ngModel)]="editAreaId" class="select-area" [disabled]="isSubmitting">
                <option *ngFor="let a of areas" [value]="a.id">{{ a.name }}</option>
              </select>
            </div>
          </div>

          <div class="modal-actions-edit">
            <button
              *ngIf="editingTable.status === 'EMPTY'"
              class="btn btn-outline-danger"
              (click)="deleteCurrentTable()"
              [disabled]="isSubmitting"
            >
              <span class="material-symbols-outlined icon-nano">delete</span>
              Xóa Bàn
            </button>
            <button class="btn btn-outline" (click)="closeEditTableModal()" [disabled]="isSubmitting">Hủy</button>
            <button class="btn btn-primary" (click)="confirmEditTable()" [disabled]="!editTableNumber.trim() || isSubmitting">
              {{ isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: INTERACTIVE POPUP CHANGE TABLE      -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showChangeTableModal">
        <div class="modal-card modal-lg">
          <div class="modal-top">
            <div class="modal-icon-badge icon-badge-transfer">
              <span class="material-symbols-outlined">sync_alt</span>
            </div>
            <div>
              <h3>Đổi Bàn Cho Khách</h3>
              <p>
                Bàn hiện tại: <b class="text-primary">{{ selectedTable ? getTableName(selectedTable) : '' }}</b>
                <span *ngIf="activeOrder"> • Mã đơn: #{{ activeOrder.orderCode }}</span>
              </p>
            </div>
          </div>

          <!-- Area Filter Chips in Modal -->
          <div class="modal-area-filter">
            <button
              type="button"
              class="filter-chip-sm"
              [class.active]="changeTableAreaFilter === null"
              (click)="changeTableAreaFilter = null"
            >
              Tất cả khu vực ({{ allTables.length }})
            </button>
            <button
              *ngFor="let area of areas; trackBy: trackByAreaId"
              type="button"
              class="filter-chip-sm"
              [class.active]="changeTableAreaFilter === area.id"
              (click)="changeTableAreaFilter = area.id"
            >
              {{ area.name }}
            </button>
          </div>

          <!-- Interactive Table Map Grid -->
          <div class="modal-table-grid-scroll">
            <div *ngFor="let area of getChangeTableAreas(); trackBy: trackByAreaId" class="modal-area-group">
              <div class="modal-area-title">{{ area.name }}</div>
              <div class="modal-table-tiles">
                <button
                  *ngFor="let t of area.tables; trackBy: trackByTableId"
                  type="button"
                  class="table-tile"
                  [ngClass]="{
                    'tile-current': selectedTable?.id === t.id,
                    'tile-empty': t.status === 'EMPTY',
                    'tile-occupied': t.status === 'OCCUPIED' && selectedTable?.id !== t.id,
                    'tile-reserved': t.status === 'RESERVED',
                    'tile-selected': changeTableSelectedTarget?.id === t.id
                  }"
                  [disabled]="t.status !== 'EMPTY' || selectedTable?.id === t.id"
                  (click)="selectTargetChangeTable(t)"
                >
                  <span class="tile-number">{{ getTableName(t) }}</span>
                  <span class="tile-capacity">
                    <span class="material-symbols-outlined icon-nano">person</span>
                    {{ t.capacity }} chỗ
                  </span>
                  <span class="tile-status-tag">
                    {{ selectedTable?.id === t.id ? 'Bàn hiện tại' : (t.status === 'EMPTY' ? 'Còn trống' : (t.status === 'OCCUPIED' ? 'Có khách' : (t.status === 'CLEANING' ? 'Đang dọn' : 'Đặt trước'))) }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Selected Target Preview and Reason -->
          <div class="modal-bottom-details" *ngIf="changeTableSelectedTarget">
            <div class="selected-target-callout">
              <span class="material-symbols-outlined callout-icon">verified</span>
              <div class="callout-text">
                Chuyển từ <b>{{ getTableName(selectedTable!) }}</b> sang <b>{{ getTableName(changeTableSelectedTarget) }}</b>
                (Sức chứa: {{ changeTableSelectedTarget.capacity }} người)
              </div>
            </div>
            <div class="m-field mt-2">
              <label>Lý do đổi bàn (hiển thị cho Bếp & Thu ngân)</label>
              <input type="text" [(ngModel)]="changeTableReason" placeholder="VD: Khách muốn chuyển ra gần cửa sổ..." [disabled]="isSubmitting" />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeChangeTableModal()" [disabled]="isSubmitting">Đóng</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!changeTableSelectedTarget || isSubmitting"
              (click)="confirmChangeTable()"
            >
              <span class="material-symbols-outlined icon-nano">sync_alt</span>
              {{ isSubmitting ? 'Đang chuyển...' : 'Xác Nhận Đổi Bàn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: CONFIRM CANCEL TABLE               -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showCancelTableModal">
        <div class="modal-card modal-cancel-card">
          <div class="modal-top">
            <div class="modal-icon-badge icon-badge-danger">
              <span class="material-symbols-outlined">delete_sweep</span>
            </div>
            <div>
              <h3>Xác Nhận Hủy Bàn: {{ selectedTable ? getTableName(selectedTable) : '' }}</h3>
              <p class="text-danger">Thao tác này sẽ trả bàn về trạng thái Trống và hủy đơn hiện tại.</p>
            </div>
          </div>

          <div class="modal-alert-box" *ngIf="activeOrder && activeOrder.items.length > 0">
            <span class="material-symbols-outlined alert-box-icon">warning</span>
            <div>
              <b>Cảnh báo: Bàn đang có {{ activeOrder.items.length }} món ăn đã gửi Bếp!</b>
              <p>Hủy bàn sẽ tự động hủy các món chưa ra trên màn hình Bếp.</p>
            </div>
          </div>

          <div class="modal-alert-box alert-box-info" *ngIf="!activeOrder || activeOrder.items.length === 0">
            <span class="material-symbols-outlined alert-box-icon">info</span>
            <div>
              Bàn chưa có món ăn nào gửi bếp. Hủy bàn sẽ đưa bàn về trạng thái <b>Trống</b> ngay lập tức.
            </div>
          </div>

          <div class="modal-form">
            <div class="m-field">
              <label>Lý do hủy bàn</label>
              <div class="quick-reasons-chips">
                <button
                  type="button"
                  class="reason-chip"
                  [class.active]="cancelTableReason === 'Nhân viên mở nhầm bàn'"
                  [disabled]="isSubmitting"
                  (click)="cancelTableReason = 'Nhân viên mở nhầm bàn'"
                >
                  Mở nhầm bàn
                </button>
                <button
                  type="button"
                  class="reason-chip"
                  [class.active]="cancelTableReason === 'Khách đổi ý đi về ngay'"
                  [disabled]="isSubmitting"
                  (click)="cancelTableReason = 'Khách đổi ý đi về ngay'"
                >
                  Khách đổi ý đi về
                </button>
                <button
                  type="button"
                  class="reason-chip"
                  [class.active]="cancelTableReason === 'Khách ghép sang bàn khác'"
                  [disabled]="isSubmitting"
                  (click)="cancelTableReason = 'Khách ghép sang bàn khác'"
                >
                  Khách ghép bàn
                </button>
              </div>
              <input
                type="text"
                [(ngModel)]="cancelTableReason"
                placeholder="Nhập lý do chi tiết..."
                class="mt-2"
                [disabled]="isSubmitting"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" (click)="closeCancelTableModal()" [disabled]="isSubmitting">Quay lại</button>
            <button
              type="button"
              class="btn btn-danger-action"
              [disabled]="!cancelTableReason.trim() || isSubmitting"
              (click)="confirmCancelTable()"
            >
              <span class="material-symbols-outlined icon-nano">close</span>
              {{ isSubmitting ? 'Đang hủy...' : 'Xác Nhận Hủy Bàn' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: CONFIRM CLEAN TABLE                 -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showCleanModal && cleaningTableTarget" (click)="closeCleanModal()">
        <div class="modal-card modal-clean-card" (click)="$event.stopPropagation()">
          <div class="modal-top">
            <div class="clean-icon-badge">
              <span class="material-symbols-outlined">cleaning_services</span>
            </div>
            <h3>Xác Nhận Dọn Bàn</h3>
            <p>
              Bàn <b>{{ getTableName(cleaningTableTarget) }}</b> đã được nhân viên dọn dẹp sạch sẽ và sẵn sàng đón lượt khách mới?
            </p>
          </div>

          <div class="clean-modal-details">
            <div class="clean-detail-row">
              <span class="detail-label">Khu vực:</span>
              <span class="detail-value">{{ cleaningTableTarget.areaName || 'Sảnh chung' }}</span>
            </div>
            <div class="clean-detail-row">
              <span class="detail-label">Sức chứa:</span>
              <span class="detail-value">{{ cleaningTableTarget.capacity }} chỗ ngồi</span>
            </div>
            <div class="clean-detail-row">
              <span class="detail-label">Trạng thái hiện tại:</span>
              <span class="status-pill sp-cleaning">Đang dọn</span>
            </div>
          </div>

          <div class="modal-actions-clean">
            <button
              type="button"
              class="btn btn-outline"
              (click)="closeCleanModal()"
              [disabled]="isSubmitting"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              class="btn btn-clean-success"
              (click)="confirmTableCleaned()"
              [disabled]="isSubmitting"
            >
              <span class="material-symbols-outlined icon-nano">check_circle</span>
              <span>{{ isSubmitting ? 'Đang cập nhật...' : 'Đã dọn xong' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waiter-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 52px);
      max-height: calc(100vh - 52px);
      background: var(--bg-app);
      overflow: hidden;
      box-sizing: border-box;
    }

    /* TOP PINNED HEADER WRAPPER (ROW 1 & ROW 2 FIXED AT TOP) */
    .pinned-header-wrapper {
      flex-shrink: 0;
      width: 100%;
      background: #ffffff;
      border-bottom: 1px solid var(--border-light);
      z-index: 30;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    /* TOP ACTION & STATS HEADER */
    .control-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: #ffffff;
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }

    .header-left-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .selected-table-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .selected-table-badge:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .st-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .st-dot.dot-empty { background: #10b981; }
    .st-dot.dot-occupied { background: #f59e0b; }
    .st-dot.dot-cleaning { background: #ef4444; }
    .st-dot.dot-reserved { background: #3b82f6; }

    .st-name {
      font-weight: 700;
      color: var(--navy);
    }

    .st-status-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }
    .st-status-tag.tag-empty {
      background: #d1fae5;
      color: #065f46;
    }
    .st-status-tag.tag-occupied {
      background: #fef3c7;
      color: #92400e;
    }
    .st-status-tag.tag-cleaning {
      background: #fee2e2;
      color: #991b1b;
    }
    .st-status-tag.tag-reserved {
      background: #dbeafe;
      color: #1e40af;
    }

    /* AREA TOOLBAR & ADMIN MAP ACTIONS */
    .area-toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: nowrap;
    }

    .area-toolbar-row.pinned-toolbar {
      padding: 8px 20px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
      margin-bottom: 0;
    }

    .btn-refresh-pill {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-light);
      background: #ffffff;
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-refresh-pill:hover {
      background: #f8fafc;
      color: var(--navy);
      border-color: #cbd5e1;
    }

    .area-dropdown-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1.5px solid var(--border-light);
      border-radius: var(--radius-full);
      padding: 3px 14px 3px 10px;
      box-shadow: var(--shadow-xs);
      transition: all 0.15s ease;
    }

    .area-dropdown-group:hover,
    .area-dropdown-group:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .area-dropdown-group .area-icon {
      font-size: 1.15rem;
      color: var(--primary);
    }

    .area-select-box {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--navy);
      cursor: pointer;
      font-family: inherit;
      padding-right: 4px;
    }

    .admin-map-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    .btn-action-add-area {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      border: 1px dashed #059669;
      background: #ecfdf5;
      color: #047857;
      font-size: 0.775rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-action-add-area:hover {
      background: #d1fae5;
      border-color: #047857;
      box-shadow: 0 1px 3px rgba(5, 150, 105, 0.2);
    }

    /* ADMIN EDIT TOGGLE */
    .admin-edit-bar {
      display: flex;
      align-items: center;
    }

    .btn-edit-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      background: #f8fafc;
      color: var(--text-secondary);
      font-size: 0.775rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-edit-toggle:hover {
      background: #f1f5f9;
      color: var(--navy);
    }

    .btn-edit-toggle.active {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #1d4ed8;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }

    .toggle-switch-pill {
      width: 26px;
      height: 14px;
      background: #cbd5e1;
      border-radius: 999px;
      position: relative;
      transition: background 0.2s;
    }

    .toggle-switch-pill::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 10px;
      height: 10px;
      background: #ffffff;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .toggle-switch-pill.on {
      background: #3b82f6;
    }

    .toggle-switch-pill.on::after {
      transform: translateX(12px);
    }

    .area-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-area-add-table {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.725rem;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-area-add-table:hover {
      background: #dbeafe;
    }

    .c-top-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-card-edit {
      width: 22px;
      height: 22px;
      border-radius: var(--radius-sm);
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: all 0.15s;
    }

    .btn-card-edit:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }

    .btn-card-edit .material-symbols-outlined {
      font-size: 14px;
    }

    .card-editing {
      box-shadow: 0 0 0 1px #93c5fd;
    }

    .select-area {
      width: 100%;
      height: 38px;
      padding: 0 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      background: #ffffff;
      font-size: 0.8125rem;
    }

    .modal-actions-edit {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
    }

    .view-toggle {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: var(--radius-md);
      gap: 3px;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .toggle-btn.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }

    .toggle-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .stats-strip {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .stat-item b {
      color: var(--navy);
    }

    .stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-total { background: #64748b; }
    .dot-empty { background: #10b981; }
    .dot-occupied { background: #f59e0b; }
    .dot-cleaning { background: #ef4444; }
    .dot-reserved { background: #3b82f6; }

    /* VIEW 1: TABLE MAP */
    .map-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      width: 100%;
    }

    .area-filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-chip {
      padding: 5px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      background: #ffffff;
      font-size: 0.775rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .filter-chip.active {
      background: var(--navy);
      color: #ffffff;
      border-color: var(--navy);
    }

    .areas-wrapper {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
    }

    .area-section {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
      box-sizing: border-box;
      width: 100%;
    }

    .area-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }

    .area-title {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--navy);
    }

    .area-counter {
      font-size: 0.725rem;
      font-weight: 600;
      color: var(--text-muted);
      background: #f8fafc;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
    }

    /* COMPACT TABLE GRID */
    .table-compact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    .compact-table-card {
      background: #ffffff;
      border: 1.5px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 10px;
      min-height: 92px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
      transition: all 0.15s ease-in-out;
      user-select: none;
      box-sizing: border-box;
    }

    .compact-table-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .card-empty {
      border-color: #a7f3d0;
      background: linear-gradient(180deg, #ffffff 60%, #ecfdf5 100%);
    }

    .card-occupied {
      border-color: #fde68a;
      background: linear-gradient(180deg, #ffffff 60%, #fffbeb 100%);
    }

    .card-cleaning {
      border-color: #fca5a5;
      background: linear-gradient(180deg, #ffffff 60%, #fef2f2 100%);
    }

    .card-reserved {
      border-color: #bfdbfe;
      background: linear-gradient(180deg, #ffffff 60%, #eff6ff 100%);
    }

    .c-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .c-table-name {
      font-size: 0.9375rem;
      font-weight: 800;
      color: var(--navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .c-capacity {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .icon-tiny { font-size: 13px; }
    .icon-nano { font-size: 12px; }

    .c-card-center {
      display: flex;
      justify-content: center;
    }

    .status-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      letter-spacing: 0.02em;
    }

    .sp-empty { background: #d1fae5; color: #065f46; }
    .sp-occupied { background: #fef3c7; color: #92400e; }
    .sp-cleaning { background: #fee2e2; color: #991b1b; }
    .sp-reserved { background: #dbeafe; color: #1e40af; }

    .c-card-bottom {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .hint-empty { color: #059669; display: flex; align-items: center; gap: 3px; }
    .hint-occupied { color: #d97706; display: flex; align-items: center; gap: 3px; }
    .hint-cleaning { color: #dc2626; display: flex; align-items: center; gap: 3px; }
    .hint-reserved { color: #2563eb; display: flex; align-items: center; gap: 3px; }

    /* VIEW 2: POS WORKSPACE */
    .pos-workspace {
      flex: 1 1 0;
      min-height: 0;
      height: 100%;
      display: flex;
      overflow: hidden;
    }

    .menu-catalog-pane {
      flex: 1 1 0;
      min-height: 0;
      height: 100%;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }

    .menu-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .search-field {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 0 12px;
      height: 40px;
    }

    .search-field input {
      border: none;
      outline: none;
      width: 100%;
      margin-left: 8px;
      font-size: 0.8125rem;
    }

    .category-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
    }

    .cat-tab {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      background: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
    }

    .cat-tab.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .dishes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
      gap: 10px;
    }

    .dish-item-card {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      box-shadow: var(--shadow-sm);
      transition: all 0.15s ease-in-out;
    }

    .dish-item-card:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .dish-item-card.dish-already-ordered {
      border-color: #86efac;
      background: linear-gradient(180deg, #ffffff 75%, #f0fdf4 100%);
      box-shadow: 0 0 0 1px #bbf7d0;
    }

    .dish-card-badges {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
    }

    .dish-station-tag {
      font-size: 0.625rem;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .badge-ordered-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.625rem;
      font-weight: 800;
      color: #166534;
      background: #dcfce7;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      border: 1px solid #bbf7d0;
    }

    .dish-meta-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .d-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--navy);
      line-height: 1.25;
      margin: 1px 0 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 32px;
    }

    .d-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .d-price {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--primary);
    }

    .btn-add {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--primary-light);
      color: var(--primary);
      border: none;
      font-weight: 700;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-add:hover {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-add.btn-suspended {
      background: #fef3c7 !important;
      color: #b45309 !important;
      border: 1px solid #fde68a !important;
      cursor: not-allowed !important;
    }

    .btn-add.btn-out {
      background: #fee2e2 !important;
      color: #dc2626 !important;
      border: 1px solid #fca5a5 !important;
      cursor: not-allowed !important;
    }

    /* RIGHT: ORDER CART PANE */
    .order-cart-pane {
      width: 380px;
      max-width: 400px;
      background: #ffffff;
      border-left: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      overflow: hidden;
      flex-shrink: 0;
    }

    .cart-header {
      flex-shrink: 0;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .cart-header h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--navy);
      margin-bottom: 2px;
    }

    .cart-header-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .order-tabs-bar {
      display: flex;
      background: #f1f5f9;
      padding: 4px;
      border-bottom: 1px solid var(--border-light);
      gap: 4px;
      flex-shrink: 0;
    }

    .ot-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 10px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .ot-tab-btn:hover {
      color: var(--navy);
      background: rgba(255, 255, 255, 0.6);
    }

    .ot-tab-btn.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }

    .cart-count-badge {
      background: var(--primary);
      color: #ffffff;
      font-size: 0.625rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      line-height: 1.2;
    }

    .tab-view-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cart-sub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      border-bottom: 1px dashed var(--border-light);
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    .icon-empty-muted {
      font-size: 40px;
      color: #cbd5e1;
      margin-bottom: 4px;
    }

    .hint-small {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .cart-capacity-tag {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
    }

    .cart-scroll-body {
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-loading-box {
      padding: 30px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .icon-spin {
      animation: spin 1s linear infinite;
      font-size: 24px;
      color: var(--primary);
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .sub-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      border-bottom: 1px dashed var(--border-light);
      padding-bottom: 4px;
    }

    .sub-code {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
    }

    .sent-items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sent-item-row {
      padding: 6px 8px;
      background: #f8fafc;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8125rem;
    }

    .sent-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .it-name { font-weight: 700; color: var(--navy); }
    .it-status { font-size: 0.625rem; font-weight: 700; padding: 1px 4px; border-radius: 3px; }
    .ks-pending { background: #e2e8f0; color: #475569; }
    .ks-cooking { background: #ffedd5; color: #c2410c; }
    .ks-ready { background: #dcfce7; color: #15803d; }
    .ks-served { background: #f1f5f9; color: #64748b; }
    .ks-cancel_requested { background: #ffe4e6; color: #e11d48; }
    .ks-cancelled { background: #fee2e2; color: #991b1b; }

    .ready-bell-pill {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #047857;
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 3px;
      animation: bellShake 1.2s infinite;
      box-shadow: 0 1px 4px rgba(16, 185, 129, 0.25);
    }

    @keyframes bellShake {
      0% { transform: scale(1); }
      50% { transform: scale(1.04); }
      100% { transform: scale(1); }
    }

    .sent-item-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px dashed #e2e8f0;
    }

    .btn-it-act {
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .btn-it-serve {
      background: #10b981;
      color: #ffffff;
    }

    .btn-it-serve:hover {
      background: #059669;
    }

    .btn-it-cancel {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-it-cancel:hover {
      background: #fecaca;
    }

    .btn-it-req-cancel {
      background: #fef3c7;
      color: #d97706;
    }

    .btn-it-req-cancel:hover {
      background: #fde68a;
    }

    .tag-waiting-cancel {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #e11d48;
      font-style: italic;
    }

    .row-cancelled {
      opacity: 0.55;
      background: #fef2f2;
    }

    .line-through {
      text-decoration: line-through;
    }

    .sent-sub {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .cart-empty-text {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 16px 0;
    }

    .new-cart-item {
      padding: 8px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .c-row-1 {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }

    .c-item-title { font-weight: 700; color: var(--navy); }

    .c-row-2 {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .qty-ctrl {
      display: flex;
      align-items: center;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }

    .qty-ctrl button {
      border: none;
      background: #f8fafc;
      width: 20px;
      height: 20px;
      font-weight: 700;
      cursor: pointer;
    }

    .qty-ctrl span {
      padding: 0 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .c-note-input {
      flex: 1;
      height: 24px;
      padding: 0 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      font-size: 0.6875rem;
    }

    .btn-del {
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
    }

    .btn-del:hover { color: #ef4444; }

    .cart-checkout-footer {
      flex-shrink: 0;
      padding: 12px 16px;
      border-top: 1px solid var(--border-light);
      background: #ffffff;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .total-line {
      font-size: 0.9375rem;
      font-weight: 800;
      color: var(--navy);
      border-top: 1px dashed var(--border-light);
      padding-top: 6px;
    }

    .total-val {
      color: var(--primary);
      font-size: 1.05rem;
    }

    .btn-send-kitchen {
      width: 100%;
      height: 38px;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .actions-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 6px;
    }

    .btn-act-change {
      background: #f0fdfa;
      color: #0f766e;
      border: 1px solid #99f6e4;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-act-change:hover {
      background: #ccfbf1;
      border-color: #5eead4;
    }

    .btn-act-cancel {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-act-cancel:hover {
      background: #fee2e2;
      border-color: #f87171;
    }

    .btn-checkout-fast {
      background: #059669;
      color: #ffffff;
      border: 1px solid #059669;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
    }

    .btn-checkout-fast:hover {
      background: #047857;
    }

    .btn-clear {
      border: none;
      background: transparent;
      color: #dc2626;
      font-size: 0.6875rem;
      cursor: pointer;
    }

    /* MODAL STYLES */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .modal-card {
      width: 100%;
      max-width: 380px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-xl);
    }

    .modal-top {
      text-align: center;
    }

    .modal-icon {
      font-size: 40px;
      color: var(--status-empty);
      margin-bottom: 6px;
    }

    .modal-top h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--navy);
      margin-bottom: 2px;
    }

    .modal-top p {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .m-field label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 4px;
    }

    .guest-counter {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 6px;
    }

    .guest-counter button {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      background: #ffffff;
      font-weight: 700;
      cursor: pointer;
    }

    .guest-val {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--navy);
    }

    .m-field input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      font-size: 0.8125rem;
    }

    .m-field input:disabled,
    .modal-form input:disabled,
    .modal-form select:disabled,
    .guest-counter button:disabled {
      background-color: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
      border-color: #e2e8f0;
      opacity: 0.8;
    }

    .modal-actions {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 10px;
      margin-top: 4px;
    }

    /* ADD AREA MODAL POPUP */
    .modal-sm {
      max-width: 440px;
      width: 95%;
    }

    .icon-badge-area {
      background: #ecfdf5;
      color: #059669;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* CHANGE TABLE MODAL POPUP */
    .modal-lg {
      max-width: 680px;
      width: 95%;
    }

    .icon-badge-transfer {
      background: #ccfbf1;
      color: #0f766e;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-area-filter {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 12px;
    }

    .filter-chip-sm {
      padding: 5px 12px;
      border-radius: 9999px;
      border: 1px solid var(--border-light);
      background: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .filter-chip-sm:hover {
      background: #e2e8f0;
    }

    .filter-chip-sm.active {
      background: #0f766e;
      color: #ffffff;
      border-color: #0f766e;
    }

    .modal-table-grid-scroll {
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .modal-area-group {
      margin-bottom: 12px;
    }

    .modal-area-title {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal-table-tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
    }

    .table-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 6px;
      border-radius: 8px;
      border: 1.5px solid var(--border-light);
      background: #ffffff;
      cursor: pointer;
      transition: all 0.18s ease;
      text-align: center;
    }

    .table-tile:disabled {
      cursor: not-allowed;
      opacity: 0.5;
      background: #f1f5f9;
      border-color: #e2e8f0;
    }

    .tile-empty {
      border-color: #86efac;
      background: #f0fdf4;
    }

    .tile-empty:hover:not(:disabled) {
      border-color: #16a34a;
      background: #dcfce7;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .tile-selected {
      border-color: #0f766e !important;
      background: #ccfbf1 !important;
      box-shadow: 0 0 0 2px #0f766e;
      transform: scale(1.02);
    }

    .tile-current {
      border-color: #cbd5e1;
      background: #f8fafc;
      opacity: 0.65;
    }

    .tile-occupied {
      border-color: #fde68a;
      background: #fffbeb;
    }

    .tile-cleaning {
      border-color: #fca5a5;
      background: #fef2f2;
    }

    .tile-reserved {
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .tile-number {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .tile-capacity {
      font-size: 11px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 2px;
      margin-top: 2px;
    }

    .tile-status-tag {
      font-size: 10px;
      font-weight: 700;
      margin-top: 4px;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .tile-empty .tile-status-tag {
      background: #dcfce7;
      color: #15803d;
    }

    .tile-occupied .tile-status-tag {
      background: #fef3c7;
      color: #92400e;
    }

    .tile-cleaning .tile-status-tag {
      background: #fee2e2;
      color: #b91c1c;
    }

    .tile-reserved .tile-status-tag {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .modal-bottom-details {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border-light);
    }

    .selected-target-callout {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .callout-icon {
      color: #0f766e;
      font-size: 20px;
    }

    .callout-text {
      font-size: 13px;
      color: #0f766e;
    }

    /* CANCEL TABLE MODAL */
    .modal-cancel-card {
      max-width: 460px;
      width: 95%;
    }

    .icon-badge-danger {
      background: #fee2e2;
      color: #dc2626;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-alert-box {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 12px;
      margin-bottom: 12px;
    }

    .alert-box-icon {
      font-size: 18px;
      color: #d97706;
      flex-shrink: 0;
    }

    .alert-box-info {
      background: #f0fdfa;
      border-color: #99f6e4;
      color: #0f766e;
    }

    .alert-box-info .alert-box-icon {
      color: #0f766e;
    }

    .quick-reasons-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
      margin-bottom: 6px;
    }

    .reason-chip {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .reason-chip:hover {
      background: #e2e8f0;
    }

    .reason-chip.active {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fca5a5;
      font-weight: 700;
    }

    .btn-danger-action {
      background: #dc2626;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-danger-action:hover:not(:disabled) {
      background: #b91c1c;
    }

    .btn-danger-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* CONFIRM CLEAN TABLE MODAL */
    .modal-clean-card {
      max-width: 440px;
      width: 95%;
    }

    .clean-icon-badge {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
    }

    .clean-icon-badge .material-symbols-outlined {
      font-size: 28px;
    }

    .clean-modal-details {
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 14px 0 16px;
      font-size: 0.8125rem;
    }

    .clean-detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .clean-detail-row .detail-label {
      color: var(--text-secondary);
    }

    .clean-detail-row .detail-value {
      font-weight: 700;
      color: var(--navy);
    }

    .modal-actions-clean {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .btn-clean-success {
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      padding: 9px 18px;
      font-size: 0.875rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-clean-success:hover:not(:disabled) {
      background: #059669;
    }

    .btn-clean-success:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class WaiterComponent implements OnInit, OnDestroy {
  private tableService = inject(TableService);
  private menuService = inject(MenuService);
  private orderService = inject(OrderService);
  private kitchenService = inject(KitchenService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  currentView: 'MAP' | 'MENU' = 'MAP';
  areas: AreaWithTables[] = [];
  displayedAreas: AreaWithTables[] = [];
  allTables: DiningTable[] = [];
  categories: Category[] = [];
  dishes: Dish[] = [];
  readyQueueItems: KitchenQueueItem[] = [];
  readyCountMap = new Map<string | number, number>();
  private pollInterval: any = null;

  selectedAreaId: number | null = null;
  selectedCategoryId: number | null = null;
  searchKeyword = '';

  selectedTable: DiningTable | null = null;
  activeOrder: Order | null = null;
  isLoadingOrder = false;
  isLoadingTables = false;
  orderTabMode: 'SENT' | 'CART' = 'SENT';

  // Modal open table state
  showOpenModal = false;
  modalTable: DiningTable | null = null;
  guestCount = 4;
  openTableNote = '';

  // Modal clean table state
  showCleanModal = false;
  cleaningTableTarget: DiningTable | null = null;

  // Admin Edit Map Mode state
  isEditMapMode = false;
  showAddAreaModal = false;
  newAreaName = '';
  showAddTableModal = false;
  targetArea: AreaWithTables | null = null;
  newTableNumber = '';
  newTableCapacity = 4;

  showEditTableModal = false;
  editingTable: DiningTable | null = null;
  editTableNumber = '';
  editTableCapacity = 4;
  editAreaId = 1;

  // Modal Interactive Change Table State
  showChangeTableModal = false;
  changeTableSelectedTarget: DiningTable | null = null;
  changeTableAreaFilter: number | null = null;
  changeTableReason = 'Khách yêu cầu chuyển chỗ ngồi';

  // Modal Cancel Table State (mở nhầm / khách về)
  showCancelTableModal = false;
  cancelTableReason = 'Nhân viên mở nhầm bàn';

  cart: CartItem[] = [];
  isSubmitting = false;

  get isAdmin(): boolean {
    const role = this.authService.getRole();
    return role === 'ROLE_MANAGER';
  }

  ngOnInit(): void {
    const role = this.authService.getRole();
    if (role === 'ROLE_ADMIN') {
      this.router.navigate(['/admin'], { queryParams: { tab: 'TABLES' } });
      return;
    }

    this.loadData();
    this.loadKitchenReadyItems();
    this.ngZone.runOutsideAngular(() => {
      this.pollInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.loadKitchenReadyItems();
          this.reloadTablesLive();
          if (this.selectedTable && this.activeOrder) {
            this.loadActiveOrder(this.selectedTable.id, true);
          }
        });
      }, 5000);
    });
  }

  reloadTablesLive(): void {
    this.tableService.getAreasWithTables(1, true).subscribe({
      next: (areas) => {
        this.areas = areas || [];
        this.allTables = (areas || []).flatMap(a => a.tables);
        this.updateDisplayedAreas();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // Admin Actions for Area & Table Management
  toggleEditMapMode(): void {
    this.isEditMapMode = !this.isEditMapMode;
  }

  switchToMenuView(): void {
    if (!this.selectedTable) return;
    if (this.isEditMapMode) {
      this.isEditMapMode = false;
    }
    this.currentView = 'MENU';
  }

  openAddAreaModal(): void {
    this.newAreaName = '';
    this.showAddAreaModal = true;
  }

  closeAddAreaModal(): void {
    this.showAddAreaModal = false;
    this.newAreaName = '';
  }

  confirmAddArea(): void {
    if (!this.newAreaName.trim()) return;

    this.isSubmitting = true;
    const branchId = this.authService.getUser()?.branchId || 1;
    this.tableService.createArea(this.newAreaName.trim(), branchId).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.closeAddAreaModal();
        this.loadData();
        alert(`Đã thêm khu vực "${res.name}" thành công!`);
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi thêm khu vực!');
      }
    });
  }

  openAddTableModal(area: AreaWithTables): void {
    this.targetArea = area;
    this.newTableNumber = `Bàn ${area.tables.length + 1}`;
    this.newTableCapacity = 4;
    this.showAddTableModal = true;
  }

  closeAddTableModal(): void {
    this.showAddTableModal = false;
    this.targetArea = null;
  }

  confirmAddTable(): void {
    if (!this.targetArea || !this.newTableNumber.trim()) return;

    this.isSubmitting = true;
    this.tableService.createTable({
      areaId: this.targetArea.id,
      tableNumber: this.newTableNumber.trim(),
      capacity: this.newTableCapacity
    } as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddTableModal();
        this.loadData();
        alert('Đã thêm bàn mới vào sơ đồ thành công!');
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi thêm bàn mới!');
      }
    });
  }

  openEditTableModal(table: DiningTable, area?: AreaWithTables): void {
    this.editingTable = table;
    this.editTableNumber = table.tableNumber || '';
    this.editTableCapacity = table.capacity || 4;
    this.editAreaId = table.areaId || (area ? area.id : (this.areas[0]?.id || 1));
    this.showEditTableModal = true;
  }

  closeEditTableModal(): void {
    this.showEditTableModal = false;
    this.editingTable = null;
  }

  confirmEditTable(): void {
    if (!this.editingTable || !this.editTableNumber.trim()) return;

    this.isSubmitting = true;
    this.tableService.updateTable(this.editingTable.id, {
      areaId: this.editAreaId,
      tableNumber: this.editTableNumber.trim(),
      capacity: this.editTableCapacity
    } as any).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeEditTableModal();
        this.loadData();
        alert('Đã cập nhật thông tin bàn thành công!');
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi cập nhật bàn!');
      }
    });
  }

  deleteCurrentTable(): void {
    if (!this.editingTable) return;
    if (this.editingTable.status !== 'EMPTY') {
      alert('Không thể xóa bàn đang có khách ngồi hoặc đã đặt trước!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa "${this.getTableName(this.editingTable)}" khỏi sơ đồ?`)) {
      return;
    }

    this.isSubmitting = true;
    this.tableService.deleteTable(this.editingTable.id).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeEditTableModal();
        this.loadData();
        alert('Đã xóa bàn khỏi sơ đồ.');
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi xóa bàn!');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadKitchenReadyItems(): void {
    this.kitchenService.getKitchenQueue().subscribe({
      next: (items) => {
        this.readyQueueItems = (items || []).filter(i => i.kitchenStatus === 'READY');
        const map = new Map<string | number, number>();
        for (const item of this.readyQueueItems) {
          if (item.tableId != null) {
            map.set(item.tableId, (map.get(item.tableId) || 0) + 1);
          }
          if (item.tableNumber) {
            map.set(item.tableNumber, (map.get(item.tableNumber) || 0) + 1);
          }
        }
        this.readyCountMap = map;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  getReadyCount(table: DiningTable): number {
    return this.readyCountMap.get(table.id) || (table.tableNumber ? this.readyCountMap.get(table.tableNumber) : 0) || 0;
  }

  markItemServed(item: OrderItem): void {
    this.kitchenService.updateItemStatus(item.id, 'SERVED').subscribe({
      next: () => {
        item.kitchenStatus = 'SERVED';
        if (this.selectedTable) {
          this.loadActiveOrder(this.selectedTable.id);
        }
        this.loadKitchenReadyItems();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi đánh dấu món đã lên bàn!');
      }
    });
  }

  cancelOrderItem(item: OrderItem): void {
    if (!this.activeOrder) return;

    if (item.kitchenStatus === 'PENDING') {
      if (!confirm(`Xác nhận hủy món "${item.dishName}"?`)) return;
      this.orderService.cancelItem(this.activeOrder.id, item.id, 'Khách yêu cầu hủy khi chưa nấu').subscribe({
        next: (updatedOrder) => {
          this.activeOrder = updatedOrder;
          alert(`Đã hủy món "${item.dishName}" thành công.`);
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi hủy món!');
        }
      });
    } else if (item.kitchenStatus === 'COOKING') {
      const reason = prompt(`Món "${item.dishName}" đang được nấu trong Bếp. Nhập lý do yêu cầu Bếp hủy món:`);
      if (!reason || !reason.trim()) return;

      this.orderService.cancelItem(this.activeOrder.id, item.id, reason.trim()).subscribe({
        next: (updatedOrder) => {
          this.activeOrder = updatedOrder;
          alert(`Đã gửi yêu cầu hủy món "${item.dishName}" tới Bếp. Vui lòng chờ Bếp trưởng phê duyệt!`);
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi gửi yêu cầu hủy món!');
        }
      });
    }
  }

  loadData(): void {
    this.isLoadingTables = true;
    this.tableService.getAreasWithTables().subscribe({
      next: (areas) => {
        this.areas = areas || [];
        this.allTables = (areas || []).flatMap(a => a.tables);
        this.updateDisplayedAreas();
        this.isLoadingTables = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingTables = false;
        console.error('Error loading areas:', err);
      }
    });

    this.menuService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading categories:', err)
    });

    this.menuService.getDishes().subscribe({
      next: (dishes) => {
        this.dishes = dishes || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading dishes:', err)
    });
  }

  updateDisplayedAreas(): void {
    if (this.selectedAreaId === null) {
      this.displayedAreas = this.areas;
    } else {
      this.displayedAreas = this.areas.filter(a => a.id === this.selectedAreaId);
    }
  }

  selectArea(areaId: number | null): void {
    this.selectedAreaId = areaId;
    this.updateDisplayedAreas();
  }

  trackByAreaId(_index: number, area: AreaWithTables): number {
    return area.id;
  }

  trackByTableId(_index: number, table: DiningTable): number {
    return table.id;
  }

  get filteredDishes(): Dish[] {
    if (!this.dishes) return [];
    return this.dishes.filter(d => {
      const matchCat = this.selectedCategoryId === null || d.categoryId === this.selectedCategoryId;
      if (!matchCat) return false;
      if (!this.searchKeyword || !this.searchKeyword.trim()) return true;
      const term = this.searchKeyword.trim().toLowerCase();
      const name = (d.name || '').toLowerCase();
      const code = (d.code || ('#M0' + d.id)).toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }

  countByStatus(status: TableStatus): number {
    return this.allTables.filter(t => t.status === status).length;
  }

  getTableName(table: DiningTable): string {
    return table.tableNumber || table.name || ('Bàn ' + table.id);
  }

  getTableCardClass(table: DiningTable): string {
    switch (table.status) {
      case 'EMPTY': return 'card-empty';
      case 'OCCUPIED': return 'card-occupied';
      case 'CLEANING': return 'card-cleaning';
      case 'RESERVED': return 'card-reserved';
      default: return '';
    }
  }

  getStatusLabel(status: TableStatus): string {
    switch (status) {
      case 'EMPTY': return 'Trống';
      case 'OCCUPIED': return 'Có khách';
      case 'CLEANING': return 'Đang dọn';
      case 'RESERVED': return 'Đặt trước';
      case 'OUT_OF_SERVICE': return 'Bảo trì';
      default: return status;
    }
  }

  getStationLabel(station: string): string {
    switch (station) {
      case 'KITCHEN_HOT':
      case 'GRILL':
        return 'Bếp Nóng';
      case 'KITCHEN_COLD':
        return 'Bếp Lạnh';
      case 'BAR':
        return 'Quầy Bar';
      default:
        return station || 'Bếp Nóng';
    }
  }

  getKitchenStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Chờ nấu';
      case 'COOKING': return 'Đang nấu';
      case 'READY': return 'Đã xong';
      case 'SERVED': return 'Đã lên bàn';
      default: return status;
    }
  }

  onTableClick(table: DiningTable, area?: AreaWithTables): void {
    if (this.isEditMapMode && this.isAdmin) {
      this.openEditTableModal(table, area);
      return;
    }

    this.selectedTable = table;

    if (table.status === 'EMPTY') {
      // Open Modal to seat guests
      this.modalTable = table;
      this.guestCount = Math.min(table.capacity, 4);
      this.openTableNote = '';
      this.showOpenModal = true;
    } else if (table.status === 'OCCUPIED') {
      // Clear previous table's data immediately so it doesn't linger!
      this.activeOrder = null;
      this.cart = [];
      this.orderTabMode = 'SENT';
      this.loadActiveOrder(table.id);
      this.currentView = 'MENU';
    } else if (table.status === 'CLEANING') {
      // Modal confirm cleaned table
      this.cleaningTableTarget = table;
      this.showCleanModal = true;
    }
  }

  closeCleanModal(): void {
    this.showCleanModal = false;
    this.cleaningTableTarget = null;
  }

  confirmTableCleaned(): void {
    if (!this.cleaningTableTarget) return;

    this.isSubmitting = true;
    this.tableService.updateTableStatus(this.cleaningTableTarget.id, 'EMPTY').subscribe({
      next: () => {
        this.isSubmitting = false;
        if (this.cleaningTableTarget) {
          this.cleaningTableTarget.status = 'EMPTY';
        }
        this.closeCleanModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi cập nhật trạng thái bàn!');
      }
    });
  }

  closeOpenModal(): void {
    this.showOpenModal = false;
    this.modalTable = null;
  }

  confirmOpenTable(): void {
    if (!this.modalTable) return;

    this.isSubmitting = true;
    this.orderService.openTable({
      tableId: this.modalTable.id,
      guestCount: this.guestCount,
      note: this.openTableNote
    }).subscribe({
      next: (order) => {
        this.isSubmitting = false;
        this.modalTable!.status = 'OCCUPIED';
        this.selectedTable = this.modalTable;
        this.activeOrder = order;
        this.orderTabMode = 'CART';
        this.closeOpenModal();
        this.loadData();
        // Immediately switch to Menu so staff can pick dishes!
        this.currentView = 'MENU';
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi mở bàn!');
      }
    });
  }

  loadActiveOrder(tableId: number, isPolling = false): void {
    if (!isPolling) {
      this.isLoadingOrder = true;
    }
    this.orderService.getActiveOrderByTable(tableId).subscribe({
      next: (order) => {
        this.isLoadingOrder = false;
        if (this.selectedTable && this.selectedTable.id === tableId) {
          this.activeOrder = order;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.isLoadingOrder = false;
        if (this.selectedTable && this.selectedTable.id === tableId) {
          this.activeOrder = null;
          this.cdr.detectChanges();
        }
      }
    });
  }

  addToCart(dish: Dish): void {
    if (!dish.isAvailable || dish.status === 'SUSPENDED' || dish.status === 'OUT_OF_STOCK') {
      alert(dish.status === 'SUSPENDED'
        ? `Món "${dish.name}" đang tạm ngưng phục vụ theo lệnh của Quản lý!`
        : `Món "${dish.name}" hiện đã hết hàng trong ca!`);
      return;
    }

    const existing = this.cart.find(c => c.dish.id === dish.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({
        dish,
        quantity: 1,
        note: ''
      });
    }
    this.orderTabMode = 'CART';
  }

  increaseQty(idx: number): void {
    this.cart[idx].quantity++;
  }

  decreaseQty(idx: number): void {
    if (this.cart[idx].quantity > 1) {
      this.cart[idx].quantity--;
    } else {
      this.cart.splice(idx, 1);
    }
  }

  removeItem(idx: number): void {
    this.cart.splice(idx, 1);
  }

  calculateCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
  }

  sendItemsToKitchen(): void {
    if (!this.activeOrder || this.cart.length === 0) return;

    this.isSubmitting = true;
    const itemsDto = this.cart.map(c => ({
      dishId: c.dish.id,
      quantity: c.quantity,
      note: c.note
    }));

    this.orderService.addItemsToOrder(this.activeOrder.id, itemsDto).subscribe({
      next: (updatedOrder) => {
        this.isSubmitting = false;
        this.activeOrder = updatedOrder;
        this.cart = [];
        this.orderTabMode = 'SENT';
        this.reloadTablesLive();
        this.loadKitchenReadyItems();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi gửi món xuống Bếp!');
      }
    });
  }

  // ==========================================
  // CHỨC NĂNG ĐỔI BÀN (POPUP SƠ ĐỒ TRỰC QUAN)
  // ==========================================
  openChangeTableModal(): void {
    if (!this.selectedTable) {
      alert('Vui lòng chọn bàn đang phục vụ để đổi!');
      return;
    }
    this.changeTableSelectedTarget = null;
    this.changeTableAreaFilter = null;
    this.changeTableReason = 'Khách yêu cầu chuyển chỗ ngồi';
    this.showChangeTableModal = true;
  }

  closeChangeTableModal(): void {
    this.showChangeTableModal = false;
    this.changeTableSelectedTarget = null;
  }

  selectTargetChangeTable(table: DiningTable): void {
    if (table.status !== 'EMPTY' || table.id === this.selectedTable?.id) return;
    this.changeTableSelectedTarget = table;
  }

  getChangeTableAreas(): AreaWithTables[] {
    if (this.changeTableAreaFilter === null) {
      return this.areas;
    }
    return this.areas.filter(a => a.id === this.changeTableAreaFilter);
  }

  confirmChangeTable(): void {
    if (!this.activeOrder || !this.changeTableSelectedTarget) return;

    this.isSubmitting = true;
    this.orderService.changeTable(
      this.activeOrder.id,
      this.changeTableSelectedTarget.id,
      this.changeTableReason.trim()
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        alert(`Đã đổi từ ${this.getTableName(this.selectedTable!)} sang ${this.getTableName(this.changeTableSelectedTarget!)} thành công!`);
        this.closeChangeTableModal();
        this.selectedTable = null;
        this.activeOrder = null;
        this.loadData();
        this.currentView = 'MAP';
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi chuyển bàn!');
      }
    });
  }

  // ==========================================
  // CHỨC NĂNG HỦY BÀN (CHO TH NHÂN VIÊN MỞ NHẦM)
  // ==========================================
  openCancelTableModal(): void {
    if (!this.selectedTable) {
      alert('Vui lòng chọn bàn cần hủy!');
      return;
    }
    this.cancelTableReason = 'Nhân viên mở nhầm bàn';
    this.showCancelTableModal = true;
  }

  closeCancelTableModal(): void {
    this.showCancelTableModal = false;
  }

  confirmCancelTable(): void {
    if (!this.selectedTable) return;

    this.isSubmitting = true;

    // Nếu có activeOrder thì hủy theo orderId, nếu không có order thì hủy theo tableId
    const cancelObs = this.activeOrder
      ? this.orderService.cancelOrder(this.activeOrder.id, this.cancelTableReason.trim())
      : this.orderService.cancelOrderByTableId(this.selectedTable.id, this.cancelTableReason.trim());

    cancelObs.subscribe({
      next: () => {
        this.isSubmitting = false;
        alert(`Đã hủy bàn ${this.getTableName(this.selectedTable!)} thành công. Bàn đã chuyển về trạng thái Trống!`);
        this.closeCancelTableModal();
        this.selectedTable = null;
        this.activeOrder = null;
        this.cart = [];
        this.loadData();
        this.currentView = 'MAP';
      },
      error: (err) => {
        this.isSubmitting = false;
        alert(err.error?.message || 'Lỗi khi hủy bàn!');
      }
    });
  }

  getOrderedQuantity(dishId: number): number {
    if (!this.activeOrder || !this.activeOrder.items) return 0;
    return this.activeOrder.items
      .filter(it => it.dishId === dishId && it.kitchenStatus !== 'CANCELLED')
      .reduce((sum, it) => sum + (it.quantity || 1), 0);
  }

  goToCheckout(): void {
    if (this.activeOrder) {
      this.router.navigate(['/checkout'], { queryParams: { orderId: this.activeOrder.id, tableId: this.selectedTable?.id } });
    } else if (this.selectedTable) {
      this.router.navigate(['/checkout'], { queryParams: { tableId: this.selectedTable.id } });
    } else {
      this.router.navigate(['/checkout']);
    }
  }
}
