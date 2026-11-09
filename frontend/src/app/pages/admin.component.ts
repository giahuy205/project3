import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MenuService } from '../core/services/menu.service';
import { TableService, AreaWithTables } from '../core/services/table.service';
import { CustomerService } from '../core/services/customer.service';
import { UserService } from '../core/services/user.service';
import { AuthService } from '../core/services/auth.service';
import { OrderService } from '../core/services/order.service';
import { Category, DiningTable, Dish, DishStatus, Customer, TableStatus, UserResponse, Role, Order, OrderItem, KitchenStatus } from '../core/models/restaurant.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-workspace">
      <!-- Top Pinned Control & Filter Bar (Fixed at top for TABLES Tab, edge-to-edge, matching Waiter & Manager) -->
      <div *ngIf="activeTab === 'TABLES'" class="pinned-header-wrapper">
        <!-- Row 1: Mode Switcher & Realtime Table Stats Strip -->
        <div class="control-header">
          <div class="header-left-group">
            <div class="view-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="tableViewMode === 'grid'"
                (click)="tableViewMode = 'grid'"
              >
                <span class="material-symbols-outlined">grid_view</span>
                <span>Dạng ô</span>
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="tableViewMode === 'list'"
                (click)="tableViewMode = 'list'"
              >
                <span class="material-symbols-outlined">view_list</span>
                <span>Danh sách</span>
              </button>
            </div>
          </div>

          <!-- Compact Stats Strip (Single Line) -->
          <div class="stats-strip">
            <div class="stat-item stat-total">
              <span class="stat-dot dot-total"></span>
              <span>Tổng bàn: <b>{{ tables.length }}</b></span>
            </div>
            <div class="stat-item stat-empty">
              <span class="stat-dot dot-empty"></span>
              <span>Bàn trống: <b>{{ countTableByStatus('EMPTY') }}</b></span>
            </div>
            <div class="stat-item stat-occupied">
              <span class="stat-dot dot-occupied"></span>
              <span>Có khách: <b>{{ countTableByStatus('OCCUPIED') }}</b></span>
            </div>
            <div class="stat-item stat-cleaning">
              <span class="stat-dot dot-cleaning"></span>
              <span>Đang dọn: <b>{{ countTableByStatus('CLEANING') }}</b></span>
            </div>
            <div class="stat-item stat-reserved">
              <span class="stat-dot dot-reserved"></span>
              <span>Đặt trước: <b>{{ countTableByStatus('RESERVED') }}</b></span>
            </div>
          </div>
        </div>

        <!-- Row 2: Area Dropdown & Edit Toolbar (Pinned) -->
        <div class="area-toolbar-row pinned-toolbar">
          <div class="area-dropdown-group">
            <span class="material-symbols-outlined area-icon">location_on</span>
            <select
              class="area-select-box"
              [ngModel]="selectedAreaFilter"
              (ngModelChange)="onAreaFilterChange($event)"
            >
              <option value="ALL">Tất cả khu vực ({{ tables.length }} bàn)</option>
              <option *ngFor="let area of areas" [value]="area.id">
                {{ area.name }} ({{ getTablesForArea(area.id).length }} bàn)
              </option>
            </select>
          </div>

          <!-- Admin Map Actions Bar -->
          <div class="admin-map-actions">
            <!-- Add Area Button (visible in edit mode) -->
            <button
              *ngIf="isEditMapMode"
              type="button"
              class="btn-action-add-area"
              (click)="openAddAreaModal()"
              title="Thêm khu vực / sảnh / tầng mới"
            >
              <span class="material-symbols-outlined icon-nano">add_circle</span>
              <span>Thêm Khu Vực</span>
            </button>

            <!-- Add Table Button (visible in list mode when edit is on) -->
            <button
              *ngIf="isEditMapMode && tableViewMode === 'list'"
              type="button"
              class="btn-action-add-area"
              (click)="openAddTableModal()"
              title="Thêm bàn ăn mới"
            >
              <span class="material-symbols-outlined icon-nano">add</span>
              <span>Thêm Bàn</span>
            </button>

            <!-- Edit Toggle Button -->
            <button
              type="button"
              class="btn-edit-toggle"
              [class.active]="isEditMapMode"
              (click)="isEditMapMode = !isEditMapMode"
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
              (click)="loadTablesAndAreas()"
              [disabled]="isLoadingTables"
              title="Tải lại danh sách bàn"
            >
              <span class="material-symbols-outlined icon-nano" [class.spin]="isLoadingTables">refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <main class="admin-content" [class.no-top-pad]="activeTab === 'TABLES'">
        <!-- ========================================== -->
        <!-- TAB 1: MENU MANAGEMENT                    -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'MENU'" class="tab-panel">
          <div class="panel-top">
            <div>
              <h3>Danh Sách Thực Đơn Món Ăn</h3>
              <p class="panel-sub">Quản lý món ăn, giá bán và trạng thái còn hàng/hết hàng theo thời gian thực</p>
            </div>
            <div class="panel-actions">
              <input
                type="text"
                [(ngModel)]="menuSearch"
                placeholder="Tìm tên món, mã món..."
                class="search-input"
              />
              <button class="btn btn-outline btn-icon" (click)="loadDishes()" [disabled]="isLoadingDishes" title="Làm mới danh sách món">
                <span class="material-symbols-outlined" [class.spin]="isLoadingDishes">refresh</span>
              </button>
              <button class="btn btn-primary" (click)="openAddDishModal()" title="Thêm món ăn mới vào thực đơn">
                <span class="material-symbols-outlined icon-nano">add</span>
                <span>Thêm Món</span>
              </button>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div *ngIf="isLoadingDishes" class="loading-state">
            <div class="spinner"></div>
            <span>Đang tải danh sách món ăn từ máy chủ...</span>
          </div>

          <!-- Dishes Table -->
          <div *ngIf="!isLoadingDishes" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã món</th>
                  <th>Tên món ăn</th>
                  <th>Danh mục</th>
                  <th>Đơn giá</th>
                  <th>Trạm nấu</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th class="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let dish of filteredDishes">
                  <td class="font-mono text-muted">{{ dish.code || ('#M0' + dish.id) }}</td>
                  <td class="font-bold text-navy">{{ dish.name }}</td>
                  <td>{{ dish.categoryName || 'Món chính' }}</td>
                  <td class="font-bold text-primary">{{ dish.price | number:'1.0-0' }} đ</td>
                  <td>
                    <span class="badge-station">{{ getStationLabel(dish.station) }}</span>
                  </td>
                  <td>{{ dish.preparationTime || dish.estimatedPrepTime || 15 }} phút</td>
                  <td>
                    <select
                      class="dish-status-select"
                      [ngClass]="getDishStatusClass(dish)"
                      [ngModel]="getDishStatus(dish)"
                      (ngModelChange)="onDishStatusChange(dish, $event)"
                      title="Chọn trạng thái phục vụ của món ăn"
                    >
                      <option value="AVAILABLE">🟢 Đang phục vụ</option>
                      <option value="SUSPENDED">🟡 Tạm ngưng</option>
                      <option value="OUT_OF_STOCK">🔴 Hết món</option>
                    </select>
                  </td>
                  <td class="text-right">
                    <div class="action-btn-group">
                      <button
                        *ngIf="getDishStatus(dish) !== 'AVAILABLE'"
                        type="button"
                        class="btn btn-xs btn-outline-success"
                        (click)="onDishStatusChange(dish, 'AVAILABLE')"
                        title="Mở phục vụ lại món này"
                      >
                        Mở bán
                      </button>
                      <button
                        *ngIf="getDishStatus(dish) === 'AVAILABLE'"
                        type="button"
                        class="btn btn-xs btn-outline-warning"
                        (click)="onDishStatusChange(dish, 'SUSPENDED')"
                        title="Tạm ngưng phục vụ món này"
                      >
                        Tạm ngưng
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs btn-edit-table"
                        (click)="openEditDishModal(dish)"
                        title="Chỉnh sửa thông tin món ăn"
                      >
                        <span class="material-symbols-outlined icon-nano">edit</span>
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs btn-delete-table"
                        (click)="confirmDeleteDish(dish)"
                        title="Xóa món này khỏi thực đơn"
                      >
                        <span class="material-symbols-outlined icon-nano">delete</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredDishes.length === 0">
                  <td colspan="8" class="text-center text-muted" style="padding: 24px;">
                    Không tìm thấy món ăn nào phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: TABLES & AREAS MANAGEMENT          -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'TABLES'" class="tab-panel admin-tables-panel">
          <!-- Loading Spinner -->
          <div *ngIf="isLoadingTables" class="loading-state">
            <div class="spinner"></div>
            <span>Đang tải danh sách bàn ăn và khu vực...</span>
          </div>

          <!-- 3. VIEW MODE: DẠNG Ô (GRID VIEW) -->
          <div *ngIf="!isLoadingTables && tableViewMode === 'grid'" class="areas-wrapper">
            <div *ngFor="let area of displayAreas" class="area-section">
              <div class="area-section-header">
                <div class="area-title-group">
                  <span class="area-title">{{ area.name }}</span>
                  <span class="area-counter">{{ getTablesForArea(area.id).length }} bàn</span>
                </div>

                <!-- Admin Add Table Button in Edit Mode -->
                <button
                  *ngIf="isEditMapMode"
                  type="button"
                  class="btn-area-add-table"
                  (click)="openAddTableModalForArea(area)"
                  title="Thêm bàn mới vào {{ area.name }}"
                >
                  <span class="material-symbols-outlined icon-nano">add</span>
                  <span>Thêm Bàn</span>
                </button>
              </div>

              <!-- Table Compact Grid -->
              <div class="table-compact-grid">
                <div
                  *ngFor="let table of getTablesForArea(area.id)"
                  class="compact-table-card"
                  [ngClass]="getTableCardClass(table)"
                  [class.card-editing]="isEditMapMode"
                  (click)="onAdminTableClick(table)"
                >
                  <!-- Card Header -->
                  <div class="c-card-top">
                    <span class="c-table-name">{{ table.tableNumber || ('Bàn ' + table.id) }}</span>
                    <div class="c-top-meta">
                      <span class="c-capacity">
                        <span class="material-symbols-outlined icon-tiny">person</span>
                        {{ table.capacity }}
                      </span>
                      <!-- Sửa bàn (khi bật Chỉnh sửa) -->
                      <button
                        *ngIf="isEditMapMode"
                        type="button"
                        class="btn-card-edit"
                        (click)="$event.stopPropagation(); openEditTableModal(table)"
                        title="Sửa thông tin hoặc xóa bàn"
                      >
                        <span class="material-symbols-outlined icon-nano">edit</span>
                      </button>
                    </div>
                  </div>

                  <!-- Status Center -->
                  <div class="c-card-center">
                    <span class="status-pill" [ngClass]="'sp-' + (table.status || 'EMPTY').toLowerCase()">
                      {{ getStatusLabel(table.status) }}
                    </span>
                  </div>

                  <!-- Footer Hint -->
                  <div class="c-card-bottom">
                    <span *ngIf="table.status === 'OCCUPIED'" class="hint-occupied">
                      <span class="material-symbols-outlined icon-nano">receipt_long</span>
                      Xem đơn
                    </span>
                    <span *ngIf="table.status === 'CLEANING'" class="hint-cleaning">
                      <span class="material-symbols-outlined icon-nano">cleaning_services</span>
                      Xác nhận dọn
                    </span>
                    <span *ngIf="table.status === 'EMPTY'" class="hint-empty-read">
                      <span class="material-symbols-outlined icon-nano">check_circle</span>
                      Trống
                    </span>
                    <span *ngIf="table.status === 'RESERVED'" class="hint-reserved">
                      <span class="material-symbols-outlined icon-nano">event_available</span>
                      Đã giữ
                    </span>
                  </div>
                </div>

                <div *ngIf="getTablesForArea(area.id).length === 0" class="empty-area-notice">
                  Chưa có bàn nào trong khu vực này.
                </div>
              </div>
            </div>

            <!-- Unassigned tables if any -->
            <div *ngIf="unassignedTables.length > 0 && selectedAreaFilter === 'ALL'" class="area-section">
              <div class="area-section-header">
                <div class="area-title-group">
                  <span class="area-title">Chưa phân khu vực</span>
                  <span class="area-counter">{{ unassignedTables.length }} bàn</span>
                </div>
              </div>
              <div class="table-compact-grid">
                <div
                  *ngFor="let table of unassignedTables"
                  class="compact-table-card"
                  [ngClass]="getTableCardClass(table)"
                  [class.card-editing]="isEditMapMode"
                  (click)="onAdminTableClick(table)"
                >
                  <div class="c-card-top">
                    <span class="c-table-name">{{ table.tableNumber || ('Bàn ' + table.id) }}</span>
                    <div class="c-top-meta">
                      <span class="c-capacity">
                        <span class="material-symbols-outlined icon-tiny">person</span>
                        {{ table.capacity }}
                      </span>
                      <button
                        *ngIf="isEditMapMode"
                        type="button"
                        class="btn-card-edit"
                        (click)="$event.stopPropagation(); openEditTableModal(table)"
                        title="Sửa thông tin hoặc xóa bàn"
                      >
                        <span class="material-symbols-outlined icon-nano">edit</span>
                      </button>
                    </div>
                  </div>
                  <div class="c-card-center">
                    <span class="status-pill" [ngClass]="'sp-' + (table.status || 'EMPTY').toLowerCase()">
                      {{ getStatusLabel(table.status) }}
                    </span>
                  </div>
                  <div class="c-card-bottom">
                    <span *ngIf="table.status === 'OCCUPIED'" class="hint-occupied">
                      <span class="material-symbols-outlined icon-nano">receipt_long</span>
                      Xem đơn
                    </span>
                    <span *ngIf="table.status === 'CLEANING'" class="hint-cleaning">
                      <span class="material-symbols-outlined icon-nano">cleaning_services</span>
                      Xác nhận dọn
                    </span>
                    <span *ngIf="table.status === 'EMPTY'" class="hint-empty-read">
                      <span class="material-symbols-outlined icon-nano">check_circle</span>
                      Trống
                    </span>
                    <span *ngIf="table.status === 'RESERVED'" class="hint-reserved">
                      <span class="material-symbols-outlined icon-nano">event_available</span>
                      Đã giữ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="displayAreas.length === 0" class="empty-state">
              Không tìm thấy khu vực nào phù hợp với bộ lọc.
            </div>
          </div>

          <!-- 4. VIEW MODE: DẠNG DANH SÁCH (LIST VIEW) -->
          <div *ngIf="!isLoadingTables && tableViewMode === 'list'" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã bàn</th>
                  <th>Tên bàn</th>
                  <th>Khu vực</th>
                  <th>Sức chứa</th>
                  <th>Trạng thái hiện tại</th>
                  <th class="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of filteredTables">
                  <td class="font-mono text-muted">#TB-0{{ t.id }}</td>
                  <td class="font-bold text-navy">{{ t.tableNumber || ('Bàn ' + t.id) }}</td>
                  <td>{{ t.areaName || getAreaName(t.areaId) }}</td>
                  <td>{{ t.capacity }} chỗ ngồi</td>
                  <td>
                    <span class="badge" [ngClass]="'badge-' + (t.status || 'EMPTY').toLowerCase()">
                      {{ getStatusLabel(t.status) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="action-btn-group">
                      <!-- Giám sát món bàn đang dùng (Read-only) -->
                      <button
                        *ngIf="t.status === 'OCCUPIED'"
                        type="button"
                        class="btn btn-xs btn-view-order"
                        (click)="openViewTableOrderModal(t)"
                        title="Xem chi tiết các món khách bàn này đã gọi"
                      >
                        <span class="material-symbols-outlined icon-nano">receipt_long</span>
                        <span>Xem đơn</span>
                      </button>

                      <!-- Xác nhận dọn bàn -->
                      <button
                        *ngIf="t.status === 'CLEANING'"
                        type="button"
                        class="btn btn-xs btn-clean-table"
                        (click)="onAdminTableClick(t)"
                        title="Xác nhận bàn đã được dọn sạch"
                      >
                        <span class="material-symbols-outlined icon-nano">cleaning_services</span>
                        <span>Xác nhận dọn</span>
                      </button>

                      <!-- Sửa bàn (khi bật Chỉnh sửa) -->
                      <button
                        *ngIf="isEditMapMode"
                        type="button"
                        class="btn btn-xs btn-edit-table"
                        (click)="openEditTableModal(t)"
                        title="Chỉnh sửa tên bàn, khu vực hoặc sức chứa"
                      >
                        <span class="material-symbols-outlined icon-nano">edit</span>
                        <span>Sửa</span>
                      </button>

                      <!-- Xóa bàn (khi bật Chỉnh sửa & bàn trống) -->
                      <button
                        *ngIf="isEditMapMode && t.status === 'EMPTY'"
                        type="button"
                        class="btn btn-xs btn-delete-table"
                        (click)="confirmDeleteTable(t)"
                        title="Xóa bàn này khỏi hệ thống"
                      >
                        <span class="material-symbols-outlined icon-nano">delete</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredTables.length === 0">
                  <td colspan="6" class="text-center text-muted" style="padding: 24px;">
                    Không tìm thấy bàn ăn nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 3: CUSTOMERS & LOYALTY                -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'CUSTOMERS'" class="tab-panel">
          <div class="panel-top">
            <div>
              <h3>Khách Hàng Thân Thiết & Điểm Tích Lũy</h3>
              <p class="panel-sub">Tra cứu thông tin khách hàng, số điểm tích lũy và thứ hạng thành viên</p>
            </div>
            <div class="panel-actions">
              <input
                type="text"
                [(ngModel)]="customerKeyword"
                (keyup.enter)="searchCustomers()"
                placeholder="Nhập SĐT hoặc tên khách hàng..."
                class="search-input"
              />
              <button class="btn btn-outline" (click)="searchCustomers()">
                <span class="material-symbols-outlined icon-nano">search</span>
                <span>Tìm kiếm</span>
              </button>
              <button class="btn btn-outline btn-icon" (click)="searchCustomers()" title="Làm mới danh sách">
                <span class="material-symbols-outlined">refresh</span>
              </button>
              <button class="btn btn-primary" (click)="openAddCustomerModal()" title="Thêm khách hàng thân thiết mới">
                <span class="material-symbols-outlined icon-nano">person_add</span>
                <span>Thêm Khách Hàng</span>
              </button>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Điểm tích lũy</th>
                  <th>Hạng thành viên</th>
                  <th class="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of customers">
                  <td class="font-bold text-navy">{{ c.fullName }}</td>
                  <td class="font-mono">{{ c.phone || c.phoneNumber }}</td>
                  <td class="text-muted">{{ c.email || 'Chưa cập nhật' }}</td>
                  <td class="font-bold text-primary">{{ c.points ?? c.loyaltyPoints ?? 0 }} điểm</td>
                  <td>
                    <span class="badge badge-tier" [ngClass]="'tier-' + (c.tier ? c.tier.toLowerCase() : 'copper')">
                      {{ c.tier || 'COPPER' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn btn-xs btn-edit-table"
                      (click)="openEditCustomerModal(c)"
                      title="Sửa thông tin khách hàng"
                    >
                      <span class="material-symbols-outlined icon-nano">edit</span>
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="customers.length === 0">
                  <td colspan="6" class="text-center text-muted" style="padding: 24px;">
                    Nhập số điện thoại để tra cứu khách hàng hoặc bấm "Thêm Khách Hàng" để tạo mới.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 4: REVENUE & ANALYTICS REPORTS (SOON)  -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'REPORTS'" class="tab-panel">
          <div class="coming-soon-card">
            <div class="soon-badge">Tính Năng Giai Đoạn Tiếp Theo</div>
            <div class="soon-icon-wrap">
              <span class="material-symbols-outlined soon-icon">monitoring</span>
            </div>
            <h2>Báo Cáo Doanh Thu & Hiệu Suất Nhà Hàng</h2>
            <p class="soon-desc">
              Phân hệ thống kê doanh thu theo ngày/tháng, tỷ trọng món bán chạy và hiệu suất lấp đầy bàn ăn đang trong lộ trình phát triển theo tài liệu đặc tả đồ án.
            </p>
            <div class="mockup-grid">
              <div class="mock-card">
                <span class="mock-title">Doanh Thu Trong Ngày</span>
                <span class="mock-val">--.---.--- đ</span>
                <span class="mock-sub">Sẽ cập nhật từ dữ liệu Bill đã thanh toán</span>
              </div>
              <div class="mock-card">
                <span class="mock-title">Top Món Ăn Bán Chạy</span>
                <span class="mock-val">Top 5 món</span>
                <span class="mock-sub">Thống kê theo số lượng món được order</span>
              </div>
              <div class="mock-card">
                <span class="mock-title">Tỷ Lệ Lấp Đầy Bàn</span>
                <span class="mock-val">-- %</span>
                <span class="mock-sub">Hiệu suất phục vụ theo khung giờ vàng</span>
              </div>
            </div>
            <div class="soon-footer-note">
              <span class="material-symbols-outlined icon-nano">info</span>
              <span>Tính năng này sẽ được hoàn thiện sau khi hoàn tất các nghiệp vụ cốt lõi tại sàn và bếp.</span>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 5: STAFF & USER MANAGEMENT             -->
        <!-- ========================================== -->
        <div *ngIf="activeTab === 'STAFF'" class="tab-panel">
          <div class="panel-top">
            <div>
              <h3>{{ isAdmin ? 'Quản Lý Nhân Sự & Tài Khoản' : 'Danh Bạ Nhân Viên Chi Nhánh' }}</h3>
              <p class="panel-sub">
                {{ isAdmin ? 'Quản lý tài khoản, phân quyền vai trò, bảo mật đăng nhập và phân bổ ca làm việc' : 'Tra cứu danh sách nhân sự và thông tin liên hệ của nhân viên tại chi nhánh' }}
              </p>
            </div>
            <div class="panel-actions">
              <input
                type="text"
                [(ngModel)]="staffSearch"
                placeholder="Tìm tên, username, SĐT..."
                class="search-input"
              />
              <select [(ngModel)]="staffRoleFilter" class="filter-select">
                <option value="">-- Tất cả vai trò --</option>
                <option value="ROLE_ADMIN">Quản Trị Viên (Admin)</option>
                <option value="ROLE_MANAGER">Quản Lý (Manager)</option>
                <option value="ROLE_STAFF">Phục Vụ / Thu Ngân</option>
                <option value="ROLE_CHEF">Đầu Bếp (Chef)</option>
              </select>
              <select [(ngModel)]="staffStatusFilter" class="filter-select">
                <option value="">-- Tất cả trạng thái --</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã khoá</option>
              </select>
              <button class="btn btn-outline" (click)="loadStaffUsers()" [disabled]="isLoadingStaff" title="Tải lại danh sách">
                <span class="material-symbols-outlined" [class.spin]="isLoadingStaff">refresh</span>
                <span>Làm mới</span>
              </button>
              <button *ngIf="isAdmin" class="btn btn-primary-staff" (click)="openAddUserModal()">
                <span class="material-symbols-outlined">person_add</span>
                <span>Thêm Nhân Viên</span>
              </button>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div *ngIf="isLoadingStaff" class="loading-state">
            <div class="spinner"></div>
            <span>Đang tải danh sách nhân viên từ máy chủ...</span>
          </div>

          <!-- Staff Table -->
          <div *ngIf="!isLoadingStaff" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Tên đăng nhập</th>
                  <th>Vai trò</th>
                  <th>Chi nhánh</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th class="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let staff of filteredStaffUsers">
                  <td>
                    <div class="staff-user-cell">
                      <div class="staff-avatar" [ngClass]="getRoleClass(staff.role)">
                        {{ staff.fullName.charAt(0) || 'U' }}
                      </div>
                      <div class="staff-name-wrap">
                        <span class="staff-name">{{ cleanName(staff.fullName) }}</span>
                        <span class="staff-join-date" *ngIf="staff.createdAt">
                          Tạo ngày: {{ staff.createdAt | date:'dd/MM/yyyy' }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code class="staff-username">{{ staff.username }}</code>
                  </td>
                  <td>
                    <span class="staff-role-badge" [ngClass]="getRoleClass(staff.role)">
                      {{ getRoleLabel(staff.role) }}
                    </span>
                  </td>
                  <td>
                    <span class="staff-branch-text">{{ (staff.branchName && !staff.branchName.includes('Bách Khoa')) ? staff.branchName : 'Nhà hàng Nom Nom' }}</span>
                  </td>
                  <td>
                    <span class="staff-phone" *ngIf="staff.phone">
                      <span class="material-symbols-outlined phone-icon">call</span>
                      {{ staff.phone }}
                    </span>
                    <span class="text-muted" *ngIf="!staff.phone">Chưa có SĐT</span>
                  </td>
                  <td>
                    <span class="staff-status-badge" [class.status-active]="staff.isActive" [class.status-inactive]="!staff.isActive">
                      <span class="status-dot"></span>
                      {{ staff.isActive ? 'Đang hoạt động' : 'Đã khoá' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <!-- Actions for Admin -->
                    <div class="staff-actions-row" *ngIf="isAdmin">
                      <button class="btn-action btn-edit-staff" (click)="openEditUserModal(staff)" title="Sửa thông tin">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button class="btn-action btn-reset-staff" (click)="openResetPasswordModal(staff)" title="Đặt lại mật khẩu">
                        <span class="material-symbols-outlined">key</span>
                      </button>
                      <button
                        class="btn-action"
                        [ngClass]="staff.isActive ? 'btn-lock-staff' : 'btn-unlock-staff'"
                        (click)="toggleStaffStatus(staff)"
                        [title]="staff.isActive ? 'Khoá tài khoản này' : 'Kích hoạt lại tài khoản'"
                      >
                        <span class="material-symbols-outlined">
                          {{ staff.isActive ? 'lock' : 'lock_open' }}
                        </span>
                      </button>
                    </div>

                    <!-- Label for Manager -->
                    <span *ngIf="!isAdmin" class="view-only-tag">
                      <span class="material-symbols-outlined view-icon">visibility</span>
                      Xem danh bạ
                    </span>
                  </td>
                </tr>

                <tr *ngIf="filteredStaffUsers.length === 0">
                  <td colspan="7" class="empty-cell">
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <!-- ========================================== -->
      <!-- MODAL: ADD / EDIT STAFF USER               -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showUserModal">
        <div class="modal-box">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">
              {{ isEditingUser ? 'edit' : 'person_add' }}
            </span>
            <div>
              <h3>{{ isEditingUser ? 'Chỉnh Sửa Thông Tin Nhân Viên' : 'Thêm Nhân Viên / Tài Khoản Mới' }}</h3>
              <p>{{ isEditingUser ? 'Cập nhật vai trò, họ tên, chi nhánh làm việc' : 'Tạo tài khoản đăng nhập ca làm việc mới trên hệ thống' }}</p>
            </div>
            <button class="btn-close-modal" (click)="showUserModal = false" [disabled]="isSavingUser">✕</button>
          </div>

          <form (ngSubmit)="saveUser()" class="modal-form">
            <div class="form-group" *ngIf="!isEditingUser">
              <label>Tên đăng nhập (Username) <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="userForm.username"
                name="username"
                placeholder="Ví dụ: waiter2, chef2..."
                class="modal-input"
                [disabled]="isSavingUser"
                required
              />
            </div>

            <div class="form-group" *ngIf="!isEditingUser">
              <label>Mật khẩu khởi tạo <span class="required">*</span></label>
              <input
                type="password"
                [(ngModel)]="userForm.password"
                name="password"
                placeholder="Tối thiểu 6 ký tự..."
                class="modal-input"
                [disabled]="isSavingUser"
                required
              />
            </div>

            <div class="form-group">
              <label>Họ và tên nhân viên <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="userForm.fullName"
                name="fullName"
                placeholder="Ví dụ: Hoàng Văn Phục Vụ"
                class="modal-input"
                [disabled]="isSavingUser"
                required
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Vai trò phân quyền <span class="required">*</span></label>
                <select [(ngModel)]="userForm.role" name="role" class="modal-input" [disabled]="isSavingUser" required>
                  <option value="ROLE_ADMIN">Quản Trị Viên (Admin)</option>
                  <option value="ROLE_MANAGER">Quản Lý (Manager)</option>
                  <option value="ROLE_STAFF">Phục Vụ / Thu Ngân (Staff)</option>
                  <option value="ROLE_CHEF">Đầu Bếp (Chef)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Chi nhánh làm việc <span class="required">*</span></label>
                <select [(ngModel)]="userForm.branchId" name="branchId" class="modal-input" [disabled]="isSavingUser" required>
                  <option [value]="1">Chi nhánh 1 - Nhà hàng Nom Nom</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Số điện thoại liên lạc</label>
              <input
                type="text"
                [(ngModel)]="userForm.phone"
                name="phone"
                placeholder="Ví dụ: 0912345678"
                class="modal-input"
                [disabled]="isSavingUser"
              />
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="showUserModal = false" [disabled]="isSavingUser">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingUser || !userForm.fullName.trim() || (!isEditingUser && (!userForm.username.trim() || !userForm.password))"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingUser">
                  {{ isSavingUser ? 'progress_activity' : 'save' }}
                </span>
                <span>{{ isSavingUser ? 'Đang lưu...' : (isEditingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: RESET PASSWORD                      -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showResetPassModal">
        <div class="modal-box modal-box-sm">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon reset-icon">key</span>
            <div>
              <h3>Đặt Lại Mật Khẩu</h3>
              <p>Cấp mật khẩu mới cho nhân viên: <b>{{ resetPassUserName }}</b></p>
            </div>
            <button class="btn-close-modal" (click)="showResetPassModal = false" [disabled]="isResettingPass">✕</button>
          </div>

          <form (ngSubmit)="confirmResetPassword()" class="modal-form">
            <div class="form-group">
              <label>Mật khẩu mới <span class="required">*</span></label>
              <input
                type="password"
                [(ngModel)]="resetPassNewValue"
                name="resetPass"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                class="modal-input"
                [disabled]="isResettingPass"
                required
              />
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="showResetPassModal = false" [disabled]="isResettingPass">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-warning"
                [disabled]="isResettingPass || resetPassNewValue.length < 6"
              >
                <span class="material-symbols-outlined" [class.spin]="isResettingPass">
                  {{ isResettingPass ? 'progress_activity' : 'lock_reset' }}
                </span>
                <span>{{ isResettingPass ? 'Đang cập nhật...' : 'Xác Nhận Đổi Mật Khẩu' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADD / EDIT TABLE                     -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showTableModal">
        <div class="modal-box modal-box-sm">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">table_restaurant</span>
            <div>
              <h3>{{ isEditingTable ? 'Chỉnh Sửa Bàn Ăn' : 'Thêm Bàn Ăn Mới' }}</h3>
              <p>{{ isEditingTable ? 'Cập nhật tên bàn, vị trí khu vực và sức chứa' : 'Khai báo bàn mới vào hệ thống sơ đồ quán' }}</p>
            </div>
            <button class="btn-close-modal" (click)="showTableModal = false" [disabled]="isSavingTable">✕</button>
          </div>

          <form (ngSubmit)="saveTable()" class="modal-form">
            <div class="form-group">
              <label>Tên / Số hiệu bàn <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="tableForm.tableNumber"
                name="tableNumber"
                placeholder="Ví dụ: Bàn 05, VIP 01, Vườn 02..."
                class="modal-input"
                [disabled]="isSavingTable"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Khu vực / Tầng <span class="required">*</span></label>
                <select [(ngModel)]="tableForm.areaId" name="areaId" class="modal-input" [disabled]="isSavingTable" required>
                  <option *ngFor="let a of areas" [value]="a.id">{{ a.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Sức chứa (số ghế) <span class="required">*</span></label>
                <input
                  type="number"
                  [(ngModel)]="tableForm.capacity"
                  name="capacity"
                  min="1"
                  max="50"
                  class="modal-input"
                  [disabled]="isSavingTable"
                  required
                />
              </div>
            </div>

            <div class="modal-foot">
              <button
                *ngIf="isEditingTable && editingTableStatus === 'EMPTY'"
                type="button"
                class="btn btn-outline-danger"
                (click)="deleteCurrentEditingTable()"
                [disabled]="isSavingTable"
                style="margin-right: auto;"
              >
                <span class="material-symbols-outlined icon-nano">delete</span>
                <span>Xóa Bàn</span>
              </button>
              <button type="button" class="btn btn-outline" (click)="showTableModal = false" [disabled]="isSavingTable">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingTable || !tableForm.tableNumber.trim() || tableForm.capacity < 1"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingTable">
                  {{ isSavingTable ? 'progress_activity' : 'save' }}
                </span>
                <span>{{ isSavingTable ? 'Đang lưu...' : (isEditingTable ? 'Lưu Thay Đổi' : 'Tạo Bàn Mới') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADD AREA                             -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showAreaModal">
        <div class="modal-box modal-box-sm">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">add_location_alt</span>
            <div>
              <h3>Thêm Khu Vực / Tầng Mới</h3>
              <p>Mở rộng không gian phục vụ và sơ đồ chỗ ngồi của nhà hàng</p>
            </div>
            <button class="btn-close-modal" (click)="showAreaModal = false" [disabled]="isSavingArea">✕</button>
          </div>

          <form (ngSubmit)="saveArea()" class="modal-form">
            <div class="form-group">
              <label>Tên khu vực / Tầng <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="newAreaName"
                name="newAreaName"
                placeholder="Ví dụ: Tầng 3 - Sân Thượng, Phòng Hội Nghị..."
                class="modal-input"
                [disabled]="isSavingArea"
                required
              />
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="showAreaModal = false" [disabled]="isSavingArea">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingArea || !newAreaName.trim()"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingArea">
                  {{ isSavingArea ? 'progress_activity' : 'check' }}
                </span>
                <span>{{ isSavingArea ? 'Đang tạo...' : 'Tạo Khu Vực' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: VIEW TABLE ORDER (READ-ONLY)        -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showTableOrderModal">
        <div class="modal-box modal-box-lg">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">receipt_long</span>
            <div>
              <h3>Giám Sát Món Ăn — {{ viewingTable?.tableNumber || ('Bàn ' + viewingTable?.id) }}</h3>
              <p>Khu vực: <b>{{ viewingTable?.areaName || getAreaName(viewingTable?.areaId) }}</b> • Sức chứa: <b>{{ viewingTable?.capacity }} ghế</b></p>
            </div>
            <button class="btn-close-modal" (click)="closeTableOrderModal()">✕</button>
          </div>

          <div class="modal-body-pad">
            <!-- Loading -->
            <div *ngIf="isLoadingTableOrder" class="loading-state">
              <div class="spinner"></div>
              <span>Đang tải thông tin đơn hàng hiện tại...</span>
            </div>

            <!-- Empty / No order found -->
            <div *ngIf="!isLoadingTableOrder && (!tableActiveOrder || !tableActiveOrder.items || tableActiveOrder.items.length === 0)" class="empty-state-card">
              <span class="material-symbols-outlined empty-icon">room_service</span>
              <p>Bàn này hiện chưa gọi món ăn nào hoặc đơn hàng chưa cập nhật.</p>
            </div>

            <!-- Order Details -->
            <div *ngIf="!isLoadingTableOrder && tableActiveOrder && tableActiveOrder.items && tableActiveOrder.items.length > 0" class="table-order-view">
              <div class="order-meta-strip">
                <span>Mã đơn: <b class="font-mono">{{ tableActiveOrder.orderCode }}</b></span>
                <span>Khách: <b>{{ tableActiveOrder.guestCount || viewingTable?.capacity || 4 }} người</b></span>
                <span>Vào lúc: <b>{{ tableActiveOrder.createdAt | date:'HH:mm • dd/MM' }}</b></span>
              </div>

              <div class="table-container order-items-scroll">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tên món ăn</th>
                      <th class="text-center">Số lượng</th>
                      <th class="text-right">Đơn giá</th>
                      <th class="text-right">Thành tiền</th>
                      <th class="text-center">Trạng thái bếp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of tableActiveOrder.items" [class.row-cancelled]="it.kitchenStatus === 'CANCELLED'">
                      <td class="font-bold text-navy">
                        {{ it.dishName }}
                        <span *ngIf="it.notes" class="dish-note-text">📝 {{ it.notes }}</span>
                      </td>
                      <td class="text-center font-mono font-bold">{{ it.quantity }}</td>
                      <td class="text-right text-muted">{{ it.priceAtOrder | number:'1.0-0' }} đ</td>
                      <td class="text-right font-bold">{{ (it.totalPrice || it.totalAmount || (it.priceAtOrder * it.quantity)) | number:'1.0-0' }} đ</td>
                      <td class="text-center">
                        <span class="kitchen-pill" [ngClass]="'kp-' + (it.kitchenStatus || '').toLowerCase()">
                          {{ getKitchenItemStatusLabel(it.kitchenStatus) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Summary Totals -->
              <div class="order-summary-box">
                <div class="sum-row">
                  <span>Tiền món ăn (chưa VAT):</span>
                  <span class="font-bold">{{ tableActiveOrder.totalAmount | number:'1.0-0' }} đ</span>
                </div>
                <div class="sum-row sum-highlight">
                  <span>Tạm tính (gồm VAT 10%):</span>
                  <span class="sum-total-val">{{ (tableActiveOrder.totalAmount * 1.1) | number:'1.0-0' }} đ</span>
                </div>
              </div>
            </div>

            <!-- Admin Notice Banner -->
            <div class="admin-monitor-banner">
              <span class="material-symbols-outlined icon-nano">security</span>
              <span>Chế độ giám sát dành riêng cho Quản trị viên (Chỉ xem dữ liệu • Không gọi món hoặc tính tiền).</span>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn btn-primary" (click)="closeTableOrderModal()">
              Đóng Cửa Sổ
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
              Bàn <b>{{ cleaningTableTarget.tableNumber || ('Bàn ' + cleaningTableTarget.id) }}</b> đã được nhân viên dọn dẹp sạch sẽ và sẵn sàng đón lượt khách mới?
            </p>
          </div>

          <div class="clean-modal-details">
            <div class="clean-detail-row">
              <span class="detail-label">Khu vực:</span>
              <span class="detail-value">{{ cleaningTableTarget.areaName || getAreaName(cleaningTableTarget.areaId) }}</span>
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

      <!-- ========================================== -->
      <!-- MODAL: ADD / EDIT DISH                     -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showDishModal">
        <div class="modal-box">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">{{ isEditingDish ? 'edit_note' : 'restaurant_menu' }}</span>
            <div>
              <h3>{{ isEditingDish ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Ăn Mới' }}</h3>
              <p>{{ isEditingDish ? 'Cập nhật thông tin chi tiết và đơn giá món ăn' : 'Thêm món ăn mới vào thực đơn phục vụ của nhà hàng' }}</p>
            </div>
            <button class="btn-close-modal" (click)="closeDishModal()" [disabled]="isSavingDish">✕</button>
          </div>

          <form (ngSubmit)="saveDish()" class="modal-form">
            <div class="form-group">
              <label>Tên món ăn <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="dishForm.name"
                name="dishName"
                placeholder="Ví dụ: Bò bít tết sốt tiêu đen, Salad ức gà..."
                class="modal-input"
                [disabled]="isSavingDish"
                required
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Danh mục <span class="required">*</span></label>
                <select [(ngModel)]="dishForm.categoryId" name="dishCategoryId" class="modal-input" [disabled]="isSavingDish" required>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Đơn giá (VNĐ) <span class="required">*</span></label>
                <input
                  type="number"
                  [(ngModel)]="dishForm.price"
                  name="dishPrice"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 85000"
                  class="modal-input"
                  [disabled]="isSavingDish"
                  required
                />
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Trạm chế biến <span class="required">*</span></label>
                <select [(ngModel)]="dishForm.station" name="dishStation" class="modal-input" [disabled]="isSavingDish" required>
                  <option value="KITCHEN_HOT">🔥 Bếp Nóng (Xào, Nấu, Chiên, Nướng)</option>
                  <option value="KITCHEN_COLD">❄️ Bếp Lạnh (Salad, Khai vị, Gỏi)</option>
                  <option value="BAR">🍹 Quầy Bar (Đồ uống, Tráng miệng)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Thời gian nấu ước tính (phút) <span class="required">*</span></label>
                <input
                  type="number"
                  [(ngModel)]="dishForm.preparationTime"
                  name="dishPrepTime"
                  min="1"
                  max="180"
                  placeholder="15"
                  class="modal-input"
                  [disabled]="isSavingDish"
                  required
                />
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label>Đơn vị tính</label>
                <input
                  type="text"
                  [(ngModel)]="dishForm.unit"
                  name="dishUnit"
                  placeholder="Đĩa, Bát, Ly, Phần..."
                  class="modal-input"
                  [disabled]="isSavingDish"
                />
              </div>

              <div class="form-group">
                <label>Link ảnh món ăn</label>
                <input
                  type="text"
                  [(ngModel)]="dishForm.imageUrl"
                  name="dishImageUrl"
                  placeholder="https://... hoặc /assets/dishes/..."
                  class="modal-input"
                  [disabled]="isSavingDish"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Mô tả món ăn</label>
              <textarea
                [(ngModel)]="dishForm.description"
                name="dishDesc"
                rows="2"
                placeholder="Mô tả nguyên liệu, hương vị đặc trưng..."
                class="modal-input"
                [disabled]="isSavingDish"
                style="height: auto; padding: 8px 12px;"
              ></textarea>
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="closeDishModal()" [disabled]="isSavingDish">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingDish || !dishForm.name.trim() || dishForm.price < 0"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingDish">
                  {{ isSavingDish ? 'progress_activity' : 'save' }}
                </span>
                <span>{{ isSavingDish ? 'Đang lưu...' : (isEditingDish ? 'Lưu Thay Đổi' : 'Thêm Món Ăn') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: ADD / EDIT CUSTOMER                 -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showCustomerModal">
        <div class="modal-box modal-box-sm">
          <div class="modal-head">
            <span class="material-symbols-outlined modal-icon">{{ isEditingCustomer ? 'manage_accounts' : 'person_add' }}</span>
            <div>
              <h3>{{ isEditingCustomer ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới' }}</h3>
              <p>{{ isEditingCustomer ? 'Cập nhật họ tên và thông tin liên hệ của khách hàng' : 'Đăng ký hội viên thân thiết mới để tích điểm thưởng' }}</p>
            </div>
            <button class="btn-close-modal" (click)="closeCustomerModal()" [disabled]="isSavingCustomer">✕</button>
          </div>

          <form (ngSubmit)="saveCustomer()" class="modal-form">
            <div class="form-group">
              <label>Họ và tên khách hàng <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="customerForm.fullName"
                name="customerFullName"
                placeholder="Ví dụ: Nguyễn Văn An"
                class="modal-input"
                [disabled]="isSavingCustomer"
                required
              />
            </div>

            <div class="form-group">
              <label>Số điện thoại <span class="required">*</span></label>
              <input
                type="tel"
                [(ngModel)]="customerForm.phone"
                name="customerPhone"
                placeholder="Ví dụ: 0912345678"
                class="modal-input"
                [disabled]="isEditingCustomer || isSavingCustomer"
                required
              />
              <small class="form-hint" *ngIf="!isValidCustomerPhone(customerForm.phone) && customerForm.phone">
                ⚠️ Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0 (hoặc +84)
              </small>
            </div>

            <div class="form-group">
              <label>Email liên hệ</label>
              <input
                type="email"
                [(ngModel)]="customerForm.email"
                name="customerEmail"
                placeholder="Ví dụ: customer@gmail.com (không bắt buộc)"
                class="modal-input"
                [disabled]="isSavingCustomer"
              />
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline" (click)="closeCustomerModal()" [disabled]="isSavingCustomer">
                Huỷ Bỏ
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingCustomer || !customerForm.fullName.trim() || !isValidCustomerPhone(customerForm.phone)"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingCustomer">
                  {{ isSavingCustomer ? 'progress_activity' : 'save' }}
                </span>
                <span>{{ isSavingCustomer ? 'Đang lưu...' : (isEditingCustomer ? 'Lưu Thông Tin' : 'Tạo Khách Hàng') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-workspace {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 52px);
      max-height: calc(100vh - 52px);
      width: 100%;
      background: var(--bg-app);
      overflow: hidden;
    }

    .admin-content {
      flex: 1;
      padding: 24px 28px;
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* COMING SOON CARD */
    .coming-soon-card {
      max-width: 760px;
      margin: 32px auto;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      padding: 40px 32px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: var(--shadow-sm);
    }

    .soon-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #b45309;
      font-size: 0.8125rem;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .soon-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      margin-bottom: 16px;
    }

    .soon-icon {
      font-size: 32px;
    }

    .coming-soon-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 8px;
    }

    .soon-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
      max-width: 580px;
      line-height: 1.5;
      margin: 0 0 28px;
    }

    .mockup-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      width: 100%;
      margin-bottom: 24px;
      text-align: left;
    }

    .mock-card {
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mock-title {
      font-size: 0.775rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .mock-val {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--navy);
    }

    .mock-sub {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .soon-footer-note {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--text-muted);
      background: #f8fafc;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
    }

    .tab-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .panel-top h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 4px;
    }

    .panel-sub {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .search-input {
      height: 38px;
      padding: 0 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      font-size: 0.875rem;
      width: 240px;
      background: #ffffff;
      transition: all 0.15s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .btn-icon {
      width: 38px;
      height: 38px;
      padding: 0;
      justify-content: center;
    }

    .btn-outline {
      border: 1px solid var(--border-light);
      background: #ffffff;
      color: var(--text-secondary);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--bg-muted);
      color: var(--navy);
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #0f766e;
    }

    .loading-state {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 32px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
      color: var(--text-secondary);
      font-size: 0.875rem;
      justify-content: center;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid #e2e8f0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spin {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .table-container {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .data-table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-weight: 700;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
      white-space: nowrap;
    }

    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      white-space: nowrap;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem; }
    .font-bold { font-weight: 700; }
    .text-navy { color: var(--navy); }
    .text-primary { color: var(--primary); }
    .text-muted { color: var(--text-muted); }

    .badge-station {
      background: #f1f5f9;
      color: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .badge-available { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-out { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

    .badge-empty { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-occupied { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-cleaning { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-reserved { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

    /* TABLE MANAGEMENT TOOLBAR & ACTIONS */
    .area-filter-select-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 0 10px;
      height: 36px;
    }

    .select-area-filter {
      border: none;
      background: transparent;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--navy);
      outline: none;
      cursor: pointer;
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
    }

    .btn-xs {
      padding: 3px 8px;
      font-size: 0.71875rem;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      font-weight: 700;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .btn-view-order {
      background: #f0fdfa;
      color: #0d9488;
      border-color: #99f6e4;
    }

    .btn-view-order:hover {
      background: #ccfbf1;
      border-color: #5eead4;
    }

    .btn-clean-table {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fca5a5;
    }

    .btn-clean-table:hover {
      background: #fee2e2;
      border-color: #ef4444;
    }

    .btn-edit-table {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }

    .btn-edit-table:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    .btn-delete-table {
      background: #fef2f2;
      color: #ef4444;
      border-color: #fecaca;
    }

    .btn-delete-table:hover {
      background: #fee2e2;
    }

    .btn-reset-table {
      background: #fffbeb;
      color: #d97706;
      border-color: #fde68a;
    }

    .btn-reset-table:hover {
      background: #fef3c7;
    }

    /* ADMIN TABLES - MANAGER MIRROR LAYOUT */
    .admin-tables-panel {
      padding: 0;
      background: transparent;
      border: none;
      box-shadow: none;
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

    .control-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 24px;
      background: #ffffff;
      flex-shrink: 0;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }

    .admin-content.no-top-pad {
      padding-top: 16px;
    }

    .header-left-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
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

    .toggle-btn:hover {
      color: var(--navy);
    }

    .toggle-btn.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
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

    /* AREA TOOLBAR & EDIT TOGGLE */
    .area-toolbar-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      gap: 12px;
      flex-wrap: nowrap;
    }

    .area-toolbar-row.pinned-toolbar {
      padding: 8px 24px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
      margin-bottom: 0;
      box-sizing: border-box;
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

    .area-filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-chip {
      padding: 6px 14px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      background: #ffffff;
      font-size: 0.775rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .filter-chip:hover {
      background: #f8fafc;
      color: var(--navy);
    }

    .filter-chip.active {
      background: var(--navy);
      color: #ffffff;
      border-color: var(--navy);
    }

    .admin-map-actions {
      display: flex;
      align-items: center;
      gap: 8px;
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

    .toggle-switch-pill.on {
      background: #2563eb;
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

    .toggle-switch-pill.on::after {
      transform: translateX(12px);
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
    }

    /* AREAS WRAPPER & SECTIONS */
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

    .area-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
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

    /* COMPACT TABLE GRID (MATCHING WAITER & MANAGER) */
    .table-compact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
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

    .c-top-meta {
      display: flex;
      align-items: center;
      gap: 4px;
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

    .btn-card-edit {
      width: 22px;
      height: 22px;
      border-radius: var(--radius-sm);
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-card-edit:hover {
      background: #dbeafe;
    }

    .btn-card-delete {
      width: 22px;
      height: 22px;
      border-radius: var(--radius-sm);
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-card-delete:hover {
      background: #fee2e2;
    }

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
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 700;
    }

    .hint-occupied {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #d97706;
    }

    .hint-cleaning {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #dc2626;
    }

    .hint-empty-read {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
    }

    .hint-reserved {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #2563eb;
    }

    .empty-area-notice {
      grid-column: 1 / -1;
      padding: 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 0.8125rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }

    /* MODAL VIEW TABLE ORDER (READ-ONLY) */
    .modal-box-lg {
      max-width: 660px;
    }

    .modal-body-pad {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-meta-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.78125rem;
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
    }

    .order-items-scroll {
      max-height: 250px;
      overflow-y: auto;
    }

    .dish-note-text {
      display: block;
      font-size: 0.6875rem;
      color: #b45309;
      font-weight: normal;
    }

    .kitchen-pill {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .kp-pending { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
    .kp-cooking { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
    .kp-ready { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
    .kp-served { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .kp-cancelled { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }

    .order-summary-box {
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--border-light);
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

    .sum-highlight {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-weight: 800;
      color: var(--navy);
    }

    .sum-total-val {
      color: var(--primary);
      font-size: 1rem;
    }

    .admin-monitor-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 0.71875rem;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .empty-state-card {
      text-align: center;
      padding: 30px 16px;
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .empty-state-card .empty-icon {
      font-size: 36px;
      color: #cbd5e1;
      margin-bottom: 6px;
    }

    .badge-tier { font-weight: 800; }
    .tier-copper { background: #fed7aa; color: #9a3412; }
    .tier-silver { background: #e2e8f0; color: #334155; }
    .tier-gold { background: #fef08a; color: #854d0e; }
    .tier-diamond { background: #e0e7ff; color: #3730a3; }

    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
    }

    .btn-outline-danger {
      border: 1px solid #fecaca;
      background: #fff;
      color: #dc2626;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-outline-danger:hover {
      background: #fef2f2;
    }

    .btn-outline-success {
      border: 1px solid #a7f3d0;
      background: #fff;
      color: #059669;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-outline-success:hover {
      background: #ecfdf5;
    }

    .btn-outline-warning {
      border: 1px solid #fde68a;
      background: #fff;
      color: #b45309;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-outline-warning:hover {
      background: #fef3c7;
    }

    .dish-status-select {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.775rem;
      font-weight: 700;
      cursor: pointer;
      outline: none;
      transition: all 0.15s;
      border-width: 1px;
      border-style: solid;
    }

    .status-available {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }

    .status-suspended {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .status-out-of-stock {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }

    /* Staff Tab & Modals */
    .btn-primary-staff {
      background: var(--primary);
      color: #ffffff;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-primary-staff:hover {
      background: var(--primary-hover);
    }

    .filter-select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #ffffff;
      color: var(--text-primary);
      font-size: 0.8125rem;
      font-weight: 600;
      outline: none;
      cursor: pointer;
    }

    .filter-select:focus {
      border-color: var(--primary);
    }

    .staff-user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .staff-avatar {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      background: var(--navy);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .staff-avatar.role-admin { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .staff-avatar.role-manager { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .staff-avatar.role-staff { background: linear-gradient(135deg, #10b981, #047857); }
    .staff-avatar.role-chef { background: linear-gradient(135deg, #0284c7, #0369a1); }

    .staff-name-wrap {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .staff-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--navy);
    }

    .staff-join-date {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .staff-username {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      color: #0284c7;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .staff-role-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .staff-role-badge.role-admin { background: #fee2e2; color: #b91c1c; }
    .staff-role-badge.role-manager { background: #fef3c7; color: #b45309; }
    .staff-role-badge.role-staff { background: #dcfce7; color: #15803d; }
    .staff-role-badge.role-chef { background: #e0f2fe; color: #0369a1; }

    .staff-branch-text {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .staff-phone {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .phone-icon {
      font-size: 15px;
      color: var(--text-muted);
    }

    .staff-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
    }

    .status-active {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .status-inactive {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .staff-actions-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-light);
      background: #ffffff;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-action .material-symbols-outlined {
      font-size: 17px;
    }

    .btn-edit-staff { color: #0284c7; }
    .btn-edit-staff:hover { background: #f0f9ff; border-color: #38bdf8; }

    .btn-reset-staff { color: #f59e0b; }
    .btn-reset-staff:hover { background: #fffbeb; border-color: #fde68a; }

    .btn-lock-staff { color: #ef4444; }
    .btn-lock-staff:hover { background: #fef2f2; border-color: #fca5a5; }

    .btn-unlock-staff { color: #10b981; }
    .btn-unlock-staff:hover { background: #ecfdf5; border-color: #a7f3d0; }

    .view-only-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .view-icon {
      font-size: 15px;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-box {
      width: 100%;
      max-width: 540px;
      background: #ffffff;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.2s ease-out;
    }

    .modal-box-sm {
      max-width: 440px;
    }

    @keyframes slideUp {
      from { transform: translateY(16px); opacity: 0.9; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-light);
      background: #f8fafc;
      position: relative;
    }

    .modal-icon {
      font-size: 28px;
      color: var(--primary);
    }

    .reset-icon {
      color: #f59e0b;
    }

    .modal-head h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 2px;
    }

    .modal-head p {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 0;
    }

    .btn-close-modal {
      position: absolute;
      right: 18px;
      top: 18px;
      background: transparent;
      border: none;
      font-size: 1.125rem;
      color: var(--text-muted);
      cursor: pointer;
    }

    .btn-close-modal:hover {
      color: var(--navy);
    }

    .modal-form {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-hint {
      font-size: 0.78rem;
      color: #dc2626;
      margin-top: 4px;
      display: block;
    }

    .modal-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--text-primary);
      box-sizing: border-box;
      outline: none;
      transition: all 0.15s;
    }

    .modal-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .modal-input:disabled,
    select.modal-input:disabled,
    textarea.modal-input:disabled {
      background-color: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
      border-color: #e2e8f0;
      opacity: 0.8;
    }

    .modal-foot {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--border-light);
      margin-top: 6px;
    }

    /* CONFIRM CLEAN TABLE MODAL */
    .modal-clean-card {
      max-width: 440px;
      width: 95%;
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-lg);
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
export class AdminComponent implements OnInit {
  private menuService = inject(MenuService);
  private tableService = inject(TableService);
  private customerService = inject(CustomerService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'MENU' | 'TABLES' | 'CUSTOMERS' | 'REPORTS' | 'STAFF' = 'MENU';

  dishes: Dish[] = [];
  categories: Category[] = [];
  menuSearch = '';
  isLoadingDishes = false;
  showDishModal = false;
  isEditingDish = false;
  editingDishId: number | null = null;
  isSavingDish = false;
  dishForm: {
    name: string;
    categoryId: number;
    price: number;
    station: 'KITCHEN_HOT' | 'KITCHEN_COLD' | 'BAR';
    preparationTime: number;
    unit: string;
    imageUrl: string;
    description: string;
  } = {
    name: '',
    categoryId: 1,
    price: 0,
    station: 'KITCHEN_HOT',
    preparationTime: 15,
    unit: 'Đĩa',
    imageUrl: '',
    description: ''
  };

  // Tables & Areas State
  tables: DiningTable[] = [];
  areas: AreaWithTables[] = [];
  selectedAreaFilter: number | 'ALL' = 'ALL';
  tableViewMode: 'grid' | 'list' = 'grid';
  isEditMapMode = false;
  isLoadingTables = false;

  showTableModal = false;
  isEditingTable = false;
  editingTableId: number | null = null;
  editingTableStatus: TableStatus | null = null;
  isSavingTable = false;
  showCleanModal = false;
  cleaningTableTarget: DiningTable | null = null;
  isSubmitting = false;
  tableForm = {
    tableNumber: '',
    areaId: 1,
    capacity: 4
  };

  showAreaModal = false;
  newAreaName = '';
  isSavingArea = false;

  // View table active order (Read-only for Admin)
  showTableOrderModal = false;
  viewingTable: DiningTable | null = null;
  tableActiveOrder: Order | null = null;
  isLoadingTableOrder = false;

  customers: Customer[] = [];
  customerKeyword = '';
  showCustomerModal = false;
  isEditingCustomer = false;
  editingCustomerId: number | null = null;
  isSavingCustomer = false;
  customerForm = {
    fullName: '',
    phone: '',
    email: ''
  };

  // Staff State
  staffUsers: UserResponse[] = [];
  isLoadingStaff = false;
  staffSearch = '';
  staffRoleFilter: Role | '' = '';
  staffStatusFilter: string = '';

  showUserModal = false;
  isEditingUser = false;
  selectedUserId: number | null = null;
  isSavingUser = false;
  userForm = {
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'ROLE_STAFF' as Role,
    branchId: 1
  };

  showResetPassModal = false;
  resetPassUserId: number | null = null;
  resetPassUserName = '';
  resetPassNewValue = '';
  isResettingPass = false;

  get isAdmin(): boolean {
    return this.authService.getRole() === 'ROLE_ADMIN';
  }

  get filteredTables(): DiningTable[] {
    if (this.selectedAreaFilter === 'ALL') {
      return this.tables;
    }
    return this.tables.filter(t => t.areaId === Number(this.selectedAreaFilter));
  }

  get displayAreas(): AreaWithTables[] {
    if (this.selectedAreaFilter === 'ALL') {
      return this.areas;
    }
    return this.areas.filter(a => a.id === Number(this.selectedAreaFilter));
  }

  getTablesForArea(areaId: number): DiningTable[] {
    return this.tables.filter(t => t.areaId === areaId);
  }

  get unassignedTables(): DiningTable[] {
    const areaIds = new Set(this.areas.map(a => a.id));
    return this.tables.filter(t => !t.areaId || !areaIds.has(t.areaId));
  }

  getAreaName(areaId?: number): string {
    if (!areaId) return 'Sảnh chính';
    const found = this.areas.find(a => a.id === areaId);
    return found ? found.name : 'Sảnh chính';
  }

  getKitchenItemStatusLabel(status?: KitchenStatus | string): string {
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

  ngOnInit(): void {
    // Listen to query params so clicking sidebar switches tabs correctly
    this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'TABLES' || tabParam === 'MENU' || tabParam === 'CUSTOMERS' || tabParam === 'REPORTS' || tabParam === 'STAFF') {
        this.activeTab = tabParam;
        if (this.activeTab === 'MENU' && this.dishes.length === 0) {
          this.loadDishes();
        } else if (this.activeTab === 'TABLES') {
          this.loadTablesAndAreas();
        } else if (this.activeTab === 'STAFF') {
          this.loadStaffUsers();
        } else if (this.activeTab === 'CUSTOMERS') {
          this.searchCustomers();
        }
      }
    });

    this.loadCategories();
    if (this.activeTab === 'MENU') {
      this.loadDishes();
    } else if (this.activeTab === 'CUSTOMERS') {
      this.searchCustomers();
    }
    this.loadTablesAndAreas();
  }

  setTab(tab: 'MENU' | 'TABLES' | 'CUSTOMERS' | 'REPORTS' | 'STAFF'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    if (tab === 'MENU' && this.dishes.length === 0) {
      this.loadDishes();
    } else if (tab === 'TABLES') {
      this.loadTablesAndAreas();
    } else if (tab === 'STAFF') {
      this.loadStaffUsers();
    } else if (tab === 'CUSTOMERS') {
      this.searchCustomers();
    }
  }

  loadDishes(): void {
    this.isLoadingDishes = true;
    this.menuService.getDishes().subscribe({
      next: (d) => {
        this.dishes = d || [];
        this.isLoadingDishes = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoadingDishes = false;
        this.cdr.markForCheck();
        console.warn('Lỗi khi tải danh sách món:', err);
      }
    });
  }

  loadCategories(): void {
    this.menuService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats || [];
        if (this.categories.length > 0 && !this.dishForm.categoryId) {
          this.dishForm.categoryId = this.categories[0].id;
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.warn('Lỗi khi tải danh mục món:', err)
    });
  }

  openAddDishModal(): void {
    this.isEditingDish = false;
    this.editingDishId = null;
    const defaultCatId = this.categories.length > 0 ? this.categories[0].id : 1;
    this.dishForm = {
      name: '',
      categoryId: defaultCatId,
      price: 0,
      station: 'KITCHEN_HOT',
      preparationTime: 15,
      unit: 'Đĩa',
      imageUrl: '',
      description: ''
    };
    this.showDishModal = true;
  }

  openEditDishModal(dish: Dish): void {
    this.isEditingDish = true;
    this.editingDishId = dish.id;
    this.dishForm = {
      name: dish.name,
      categoryId: dish.categoryId || (this.categories.length > 0 ? this.categories[0].id : 1),
      price: dish.price,
      station: dish.station === 'GRILL' ? 'KITCHEN_HOT' : ((dish.station as any) || 'KITCHEN_HOT'),
      preparationTime: dish.preparationTime || dish.estimatedPrepTime || 15,
      unit: dish.unit || 'Đĩa',
      imageUrl: dish.imageUrl || '',
      description: dish.description || ''
    };
    this.showDishModal = true;
  }

  closeDishModal(): void {
    this.showDishModal = false;
    this.isEditingDish = false;
    this.editingDishId = null;
  }

  saveDish(): void {
    if (!this.dishForm.name.trim()) {
      alert('Vui lòng nhập tên món ăn!');
      return;
    }
    if (this.dishForm.price < 0) {
      alert('Đơn giá không được âm!');
      return;
    }

    this.isSavingDish = true;
    const payload: Partial<Dish> = {
      name: this.dishForm.name.trim(),
      categoryId: Number(this.dishForm.categoryId),
      price: Number(this.dishForm.price),
      station: this.dishForm.station,
      preparationTime: Number(this.dishForm.preparationTime) || 15,
      unit: this.dishForm.unit?.trim() || 'Đĩa',
      imageUrl: this.dishForm.imageUrl?.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      description: this.dishForm.description?.trim() || ''
    };

    const req$ = this.isEditingDish && this.editingDishId
      ? this.menuService.updateDish(this.editingDishId, payload)
      : this.menuService.createDish(payload);

    req$.subscribe({
      next: () => {
        this.isSavingDish = false;
        this.closeDishModal();
        this.loadDishes();
        this.cdr.markForCheck();
        alert(this.isEditingDish ? 'Đã cập nhật món ăn thành công!' : 'Đã thêm món mới vào thực đơn thành công!');
      },
      error: (err) => {
        this.isSavingDish = false;
        this.cdr.markForCheck();
        console.error('Lỗi khi lưu món ăn:', err);
        alert(err.error?.message || 'Có lỗi xảy ra khi lưu thông tin món ăn!');
      }
    });
  }

  confirmDeleteDish(dish: Dish): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa món "${dish.name}" khỏi thực đơn không?`)) {
      return;
    }
    this.menuService.deleteDish(dish.id).subscribe({
      next: () => {
        this.loadDishes();
        this.cdr.markForCheck();
        alert(`Đã xóa món "${dish.name}" thành công!`);
      },
      error: (err) => {
        console.error('Lỗi khi xóa món:', err);
        alert(err.error?.message || 'Có lỗi xảy ra khi xóa món ăn!');
      }
    });
  }

  loadTablesAndAreas(): void {
    this.isLoadingTables = true;
    forkJoin([
      this.tableService.getAllTables(1),
      this.tableService.getAreasWithTables(1, true)
    ]).subscribe({
      next: ([tables, areas]) => {
        this.tables = tables || [];
        this.areas = areas || [];
        this.isLoadingTables = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoadingTables = false;
        this.cdr.markForCheck();
        console.warn('Lỗi khi tải danh sách bàn và khu vực:', err);
      }
    });
  }

  get filteredDishes(): Dish[] {
    if (!this.dishes) return [];
    if (!this.menuSearch || !this.menuSearch.trim()) return this.dishes;

    const term = this.menuSearch.trim().toLowerCase();
    return this.dishes.filter(d => {
      const name = (d.name || '').toLowerCase();
      const code = (d.code || ('#M0' + d.id)).toLowerCase();
      const cat = (d.categoryName || '').toLowerCase();
      return name.includes(term) || code.includes(term) || cat.includes(term);
    });
  }

  getDishStatus(dish: Dish): DishStatus {
    if (dish.status) return dish.status;
    return dish.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK';
  }

  getDishStatusClass(dish: Dish): string {
    const status = this.getDishStatus(dish);
    switch (status) {
      case 'AVAILABLE': return 'status-available';
      case 'SUSPENDED': return 'status-suspended';
      case 'OUT_OF_STOCK': return 'status-out-of-stock';
      default: return 'status-available';
    }
  }

  onDishStatusChange(dish: Dish, newStatus: DishStatus): void {
    dish.status = newStatus;
    dish.isAvailable = newStatus === 'AVAILABLE';
    this.menuService.updateDishStatus(dish.id, newStatus).subscribe({
      next: (updated) => {
        dish.status = updated.status || newStatus;
        dish.isAvailable = updated.isAvailable;
        this.cdr.markForCheck();
      },
      error: () => {
        if (newStatus === 'OUT_OF_STOCK' || newStatus === 'AVAILABLE') {
          this.menuService.toggleDishAvailability(dish.id).subscribe();
        }
        this.cdr.markForCheck();
      }
    });
  }

  toggleDish(dish: Dish): void {
    const nextStatus: DishStatus = dish.isAvailable ? 'OUT_OF_STOCK' : 'AVAILABLE';
    this.onDishStatusChange(dish, nextStatus);
  }

  resetTable(table: DiningTable): void {
    const tableName = table.tableNumber || ('Bàn ' + table.id);
    if (confirm(`Bạn có chắc chắn muốn đặt lại ${tableName} về trạng thái TRỐNG?`)) {
      this.tableService.updateTableStatus(table.id, 'EMPTY').subscribe({
        next: (t) => {
          table.status = t.status;
        },
        error: () => alert('Lỗi khi đặt lại trạng thái bàn!')
      });
    }
  }

  openAddTableModal(): void {
    this.isEditingTable = false;
    this.editingTableId = null;
    this.editingTableStatus = null;
    this.tableForm = {
      tableNumber: '',
      areaId: this.areas.length > 0 ? this.areas[0].id : 1,
      capacity: 4
    };
    this.showTableModal = true;
  }

  openEditTableModal(table: DiningTable): void {
    this.isEditingTable = true;
    this.editingTableId = table.id;
    this.editingTableStatus = table.status;
    this.tableForm = {
      tableNumber: table.tableNumber || '',
      areaId: table.areaId || (this.areas.length > 0 ? this.areas[0].id : 1),
      capacity: table.capacity || 4
    };
    this.showTableModal = true;
  }

  deleteCurrentEditingTable(): void {
    if (!this.editingTableId) return;
    const table = this.tables.find(t => t.id === this.editingTableId);
    if (!table) return;
    this.showTableModal = false;
    this.confirmDeleteTable(table);
  }

  onAreaFilterChange(val: string | number): void {
    if (val === 'ALL' || val === '' || val === null) {
      this.selectedAreaFilter = 'ALL';
    } else {
      this.selectedAreaFilter = Number(val);
    }
  }

  saveTable(): void {
    if (!this.tableForm.tableNumber.trim()) {
      alert('Vui lòng nhập tên hoặc số hiệu bàn (ví dụ: Bàn 05, VIP 01)!');
      return;
    }
    if (!this.tableForm.capacity || this.tableForm.capacity < 1) {
      alert('Sức chứa của bàn phải tối thiểu 1 người!');
      return;
    }

    this.isSavingTable = true;
    const payload = {
      tableNumber: this.tableForm.tableNumber.trim(),
      areaId: Number(this.tableForm.areaId),
      capacity: Number(this.tableForm.capacity)
    };

    const req = this.isEditingTable && this.editingTableId
      ? this.tableService.updateTable(this.editingTableId, payload)
      : this.tableService.createTable(payload);

    req.subscribe({
      next: () => {
        this.isSavingTable = false;
        this.showTableModal = false;
        this.loadTablesAndAreas();
      },
      error: (err) => {
        this.isSavingTable = false;
        alert(err.error?.message || 'Lỗi khi lưu thông tin bàn ăn!');
      }
    });
  }

  confirmDeleteTable(table: DiningTable): void {
    const name = table.tableNumber || ('Bàn #' + table.id);
    if (table.status !== 'EMPTY') {
      alert(`Không thể xóa ${name} vì bàn hiện không ở trạng thái trống!`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${name} khỏi hệ thống không?`)) {
      this.tableService.deleteTable(table.id).subscribe({
        next: () => {
          this.loadTablesAndAreas();
        },
        error: (err) => alert(err.error?.message || 'Lỗi khi xóa bàn!')
      });
    }
  }

  openAddAreaModal(): void {
    this.newAreaName = '';
    this.showAreaModal = true;
  }

  saveArea(): void {
    if (!this.newAreaName.trim()) {
      alert('Vui lòng nhập tên khu vực / tầng (ví dụ: Tầng 3 - Sân Thượng)!');
      return;
    }

    this.isSavingArea = true;
    this.tableService.createArea(this.newAreaName.trim(), 1).subscribe({
      next: () => {
        this.isSavingArea = false;
        this.showAreaModal = false;
        this.loadTablesAndAreas();
      },
      error: (err) => {
        this.isSavingArea = false;
        alert(err.error?.message || 'Lỗi khi tạo khu vực mới!');
      }
    });
  }

  openViewTableOrderModal(table: DiningTable): void {
    this.viewingTable = table;
    this.tableActiveOrder = null;
    this.isLoadingTableOrder = true;
    this.showTableOrderModal = true;

    this.orderService.getActiveOrderByTable(table.id).subscribe({
      next: (order) => {
        this.tableActiveOrder = order;
        this.isLoadingTableOrder = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.tableActiveOrder = null;
        this.isLoadingTableOrder = false;
        this.cdr.markForCheck();
      }
    });
  }

  closeTableOrderModal(): void {
    this.showTableOrderModal = false;
    this.viewingTable = null;
    this.tableActiveOrder = null;
  }

  searchCustomers(): void {
    const kw = (this.customerKeyword || '').trim();
    this.customerService.searchCustomers(kw).subscribe({
      next: (res) => {
        this.customers = res || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.customers = [];
        this.cdr.markForCheck();
      }
    });
  }

  openAddCustomerModal(): void {
    this.isEditingCustomer = false;
    this.editingCustomerId = null;
    this.customerForm = {
      fullName: '',
      phone: '',
      email: ''
    };
    this.showCustomerModal = true;
  }

  openEditCustomerModal(c: Customer): void {
    this.isEditingCustomer = true;
    this.editingCustomerId = c.id;
    this.customerForm = {
      fullName: c.fullName,
      phone: c.phone || c.phoneNumber || '',
      email: c.email || ''
    };
    this.showCustomerModal = true;
  }

  closeCustomerModal(): void {
    this.showCustomerModal = false;
    this.isEditingCustomer = false;
    this.editingCustomerId = null;
  }

  isValidCustomerPhone(phone?: string): boolean {
    if (!phone) return false;
    const clean = phone.trim();
    return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(clean);
  }

  saveCustomer(): void {
    if (!this.customerForm.fullName.trim()) {
      alert('Vui lòng nhập họ và tên khách hàng!');
      return;
    }
    if (!this.isValidCustomerPhone(this.customerForm.phone)) {
      alert('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).');
      return;
    }

    this.isSavingCustomer = true;
    const payload = {
      fullName: this.customerForm.fullName.trim(),
      phone: this.customerForm.phone.trim(),
      email: this.customerForm.email?.trim() || undefined
    };

    this.customerService.createOrUpdateCustomer(payload).subscribe({
      next: () => {
        this.isSavingCustomer = false;
        this.closeCustomerModal();
        this.searchCustomers();
        this.cdr.markForCheck();
        alert(this.isEditingCustomer ? 'Đã cập nhật thông tin khách hàng thành công!' : 'Đã tạo mới khách hàng thân thiết thành công!');
      },
      error: (err) => {
        this.isSavingCustomer = false;
        this.cdr.markForCheck();
        console.error('Lỗi khi lưu khách hàng:', err);
        alert(err.error?.message || 'Có lỗi xảy ra khi lưu thông tin khách hàng!');
      }
    });
  }

  getStationLabel(station: string): string {
    switch (station) {
      case 'KITCHEN_HOT':
      case 'GRILL':
        return 'Bếp Nóng';
      case 'KITCHEN_COLD': return 'Bếp Lạnh';
      case 'BAR': return 'Quầy Bar';
      default: return 'Bếp Nóng';
    }
  }

  countTableByStatus(status: TableStatus): number {
    return this.tables.filter(t => t.status === status).length;
  }

  getTableCardClass(table: DiningTable): string {
    const status = (table.status || 'EMPTY').toLowerCase();
    return 'card-' + status;
  }

  onAdminTableClick(table: DiningTable): void {
    if (this.isEditMapMode) {
      this.openEditTableModal(table);
      return;
    }
    if (table.status === 'OCCUPIED') {
      this.openViewTableOrderModal(table);
    } else if (table.status === 'CLEANING') {
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
        this.loadTablesAndAreas();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
        alert(err.error?.message || 'Lỗi khi cập nhật trạng thái bàn!');
      }
    });
  }

  openAddTableModalForArea(area: AreaWithTables): void {
    this.isEditingTable = false;
    this.editingTableId = null;
    this.editingTableStatus = null;
    this.tableForm = {
      tableNumber: '',
      areaId: area.id,
      capacity: 4
    };
    this.showTableModal = true;
  }

  getStatusLabel(status: TableStatus): string {
    switch (status) {
      case 'EMPTY': return 'Trống';
      case 'OCCUPIED': return 'Có khách';
      case 'CLEANING': return 'Đang dọn';
      case 'RESERVED': return 'Đã giữ';
      case 'OUT_OF_SERVICE': return 'Bảo trì';
      default: return status || 'Trống';
    }
  }

  // ==========================================
  // STAFF METHODS
  // ==========================================

  loadStaffUsers(): void {
    this.isLoadingStaff = true;
    const safetyTimer = setTimeout(() => {
      if (this.isLoadingStaff) {
        this.isLoadingStaff = false;
        this.cdr.markForCheck();
      }
    }, 3000);

    this.userService.getUsers().subscribe({
      next: (list) => {
        clearTimeout(safetyTimer);
        this.staffUsers = list || [];
        this.isLoadingStaff = false;
        this.cdr.markForCheck();
      },
      error: () => {
        clearTimeout(safetyTimer);
        this.staffUsers = [];
        this.isLoadingStaff = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredStaffUsers(): UserResponse[] {
    return this.staffUsers.filter(u => {
      if (this.staffRoleFilter && u.role !== this.staffRoleFilter) {
        return false;
      }
      if (this.staffStatusFilter !== '') {
        const activeBool = this.staffStatusFilter === 'true';
        if (u.isActive !== activeBool) return false;
      }
      if (this.staffSearch.trim()) {
        const term = this.staffSearch.trim().toLowerCase();
        const matchName = (u.fullName || '').toLowerCase().includes(term);
        const matchUser = (u.username || '').toLowerCase().includes(term);
        const matchPhone = (u.phone || '').toLowerCase().includes(term);
        return matchName || matchUser || matchPhone;
      }
      return true;
    });
  }

  openAddUserModal(): void {
    this.isEditingUser = false;
    this.selectedUserId = null;
    this.userForm = {
      username: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'ROLE_STAFF',
      branchId: 1
    };
    this.showUserModal = true;
  }

  openEditUserModal(user: UserResponse): void {
    this.isEditingUser = true;
    this.selectedUserId = user.id;
    this.userForm = {
      username: user.username,
      password: '',
      fullName: user.fullName,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branchId || 1
    };
    this.showUserModal = true;
  }

  saveUser(): void {
    if (!this.userForm.fullName.trim()) return;

    this.isSavingUser = true;
    if (this.isEditingUser && this.selectedUserId) {
      this.userService.updateUser(this.selectedUserId, {
        fullName: this.userForm.fullName.trim(),
        phone: this.userForm.phone.trim() || undefined,
        role: this.userForm.role,
        branchId: this.userForm.branchId
      }).subscribe({
        next: () => {
          this.isSavingUser = false;
          this.showUserModal = false;
          this.loadStaffUsers();
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi cập nhật nhân viên!');
          this.isSavingUser = false;
        }
      });
    } else {
      if (!this.userForm.username.trim() || !this.userForm.password) return;
      this.userService.createUser({
        username: this.userForm.username.trim(),
        password: this.userForm.password,
        fullName: this.userForm.fullName.trim(),
        phone: this.userForm.phone.trim() || undefined,
        role: this.userForm.role,
        branchId: this.userForm.branchId
      }).subscribe({
        next: () => {
          this.isSavingUser = false;
          this.showUserModal = false;
          this.loadStaffUsers();
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi tạo tài khoản nhân viên!');
          this.isSavingUser = false;
        }
      });
    }
  }

  toggleStaffStatus(user: UserResponse): void {
    const newStatus = !user.isActive;
    const actionName = newStatus ? 'KÍCH HOẠT lại' : 'KHOÁ';
    if (confirm(`Bạn có chắc muốn ${actionName} tài khoản của ${user.fullName} (${user.username})?`)) {
      this.userService.toggleUserStatus(user.id, newStatus).subscribe({
        next: () => {
          user.isActive = newStatus;
        },
        error: (err) => {
          alert(err.error?.message || 'Lỗi khi thay đổi trạng thái tài khoản!');
        }
      });
    }
  }

  openResetPasswordModal(user: UserResponse): void {
    this.resetPassUserId = user.id;
    this.resetPassUserName = `${user.fullName} (${user.username})`;
    this.resetPassNewValue = '';
    this.showResetPassModal = true;
  }

  confirmResetPassword(): void {
    if (!this.resetPassUserId || this.resetPassNewValue.length < 6) return;

    this.isResettingPass = true;
    this.userService.resetPassword(this.resetPassUserId, { newPassword: this.resetPassNewValue }).subscribe({
      next: () => {
        alert('Đặt lại mật khẩu thành công!');
        this.isResettingPass = false;
        this.showResetPassModal = false;
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi đặt lại mật khẩu!');
        this.isResettingPass = false;
      }
    });
  }

  cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  getRoleLabel(role: Role): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'Quản Trị';
      case 'ROLE_MANAGER': return 'Quản Lý';
      case 'ROLE_STAFF': return 'Phục Vụ';
      case 'ROLE_CHEF': return 'Đầu Bếp';
      default: return role;
    }
  }

  getRoleClass(role: Role): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'role-admin';
      case 'ROLE_MANAGER': return 'role-manager';
      case 'ROLE_STAFF': return 'role-staff';
      case 'ROLE_CHEF': return 'role-chef';
      default: return '';
    }
  }
}
