import { Component, OnInit, OnDestroy, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { KitchenService } from '../../core/services/kitchen.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { KitchenQueueItem, KitchenStatus, Station, Dish, DishStatus, Category, Role, User } from '../../core/models/restaurant.models';

export interface KdsBatchGroup {
  groupKey: string;
  isBatch: boolean;
  dishId: number;
  dishName: string;
  station: Station;
  preparationTime: number;
  kitchenStatus: KitchenStatus;
  totalQuantity: number;
  items: KitchenQueueItem[];
  maxWaitMinutes: number;
  hasCancelRequested: boolean;
  maxPriorityScore: number;
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="kds-workspace">
      <!-- Unified Single KDS Header -->
      <header class="kds-header">
        <!-- Left: Brand + Context + Pulse + Realtime Clock -->
        <div class="kds-brand-group">
          <div class="kds-brand-logo">
            <span class="material-symbols-outlined icon-kds">soup_kitchen</span>
          </div>
          <div class="kds-title-area">
            <div class="title-with-badge">
              <h1 class="kds-title">Điều Phối Bếp (KDS)</h1>
              <span class="live-pulse" [class.paused]="!autoRefresh">
                <span class="pulse-dot"></span>
                <span>{{ autoRefresh ? 'Tự động' : 'Tạm dừng' }}</span>
              </span>
            </div>
            <p class="kds-desc">Nom Nom Hub</p>
          </div>

          <div class="header-divider"></div>

          <!-- Live Digital Clock -->
          <div class="kds-clock-pill" title="Thời gian thực hệ thống">
            <span class="material-symbols-outlined clock-icon">schedule</span>
            <span class="clock-time">{{ currentTime }}</span>
          </div>
        </div>

        <!-- Right: Actions + Chef Profile Popover Dropdown -->
        <div class="kds-controls">
          <!-- Auto refresh toggle -->
          <button
            class="btn btn-outline-kds"
            [class.active]="autoRefresh"
            (click)="toggleAutoRefresh()"
            title="Bật/Tắt tự động làm mới 10 giây"
          >
            <span class="material-symbols-outlined">sync</span>
            <span>{{ autoRefresh ? 'Tự làm mới: BẬT' : 'Tự làm mới: TẮT' }}</span>
          </button>

          <!-- Refresh manual button -->
          <button class="btn btn-primary-kds" (click)="loadQueue()" title="Cập nhật danh sách món ngay">
            <span class="material-symbols-outlined">refresh</span>
            <span>Làm mới</span>
          </button>

          <div class="header-divider"></div>

          <!-- Chef User Pill with Dropdown (matching Manager/Admin UX) -->
          <div class="user-dropdown-wrap" *ngIf="currentUser">
            <button
              type="button"
              class="user-pill-btn"
              (click)="toggleUserDropdown($event)"
              [class.active]="showUserDropdown"
              title="Tuỳ chọn tài khoản đầu bếp"
            >
              <div class="user-avatar role-chef">
                {{ currentUser.fullName.charAt(0) || 'B' }}
              </div>
              <div class="user-meta">
                <span class="user-name">{{ cleanName(currentUser.fullName) }}</span>
                <span class="user-role-badge role-chef">
                  {{ getRoleShortLabel(currentUser.role) }}
                </span>
              </div>
              <span class="material-symbols-outlined chevron-icon" [class.rotated]="showUserDropdown">
                expand_more
              </span>
            </button>

            <!-- Dropdown Popover -->
            <div class="dropdown-popover" *ngIf="showUserDropdown" (click)="$event.stopPropagation()">
              <div class="dropdown-hero">
                <div class="dropdown-avatar role-chef">
                  {{ currentUser.fullName.charAt(0) || 'B' }}
                </div>
                <div class="dropdown-user-info">
                  <span class="dropdown-name">{{ cleanName(currentUser.fullName) }}</span>
                  <span class="dropdown-role-text">{{ getRoleShortLabel(currentUser.role) }}</span>
                  <span class="dropdown-username">&#64;{{ currentUser.username }}</span>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <a routerLink="/profile" (click)="showUserDropdown = false" class="dropdown-menu-item">
                <span class="material-symbols-outlined dropdown-icon">manage_accounts</span>
                <span>Trang Cá Nhân & Đổi Mật Khẩu</span>
              </a>

              <div class="dropdown-divider"></div>

              <button type="button" (click)="logout()" class="dropdown-menu-item logout-item">
                <span class="material-symbols-outlined dropdown-icon">logout</span>
                <span>Đăng Xuất Khỏi Ca Bếp</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Station Filter Tabs Bar with Fast Out of Stock Button -->
      <div class="station-tabs-bar">
        <div class="station-tabs-group">
          <button
            class="station-tab"
            [class.active]="selectedStation === null"
            (click)="filterByStation(null)"
          >
            <span class="material-symbols-outlined">all_inclusive</span>
            <span>Tất Cả Trạm ({{ queueItems.length }})</span>
          </button>

          <button
            class="station-tab hot-tab"
            [class.active]="selectedStation === 'KITCHEN_HOT'"
            (click)="filterByStation('KITCHEN_HOT')"
          >
            <span class="material-symbols-outlined">local_fire_department</span>
            <span>Bếp Nóng</span>
          </button>

          <button
            class="station-tab cold-tab"
            [class.active]="selectedStation === 'KITCHEN_COLD'"
            (click)="filterByStation('KITCHEN_COLD')"
          >
            <span class="material-symbols-outlined">ac_unit</span>
            <span>Bếp Lạnh</span>
          </button>

          <button
            class="station-tab bar-tab"
            [class.active]="selectedStation === 'BAR'"
            (click)="filterByStation('BAR')"
          >
            <span class="material-symbols-outlined">local_bar</span>
            <span>Quầy Bar</span>
          </button>
        </div>

        <!-- Fast Out of Stock Button on Station Row -->
        <button class="btn btn-warning-kds" (click)="openOutOfStockModal()" title="Báo nhanh món hết hàng">
          <span class="material-symbols-outlined">block</span>
          <span>Báo Hết Món</span>
        </button>
      </div>

      <!-- KDS Main Body: 2-Column Workflow Layout -->
      <div class="kds-body">
        <div class="kds-columns-wrap">
          <!-- ========================================== -->
          <!-- COLUMN 1: ĐANG CHẾ BIẾN (COOKING - 2/3 MÀN)-->
          <!-- ========================================== -->
          <div class="kds-column col-cooking">
            <div class="column-header ch-cooking">
              <div class="ch-title">
                <span class="material-symbols-outlined ch-icon">skillet</span>
                <h2>Đang Nấu</h2>
              </div>
              <span class="ch-counter">{{ cookingGroups.length }} mục • {{ cookingTotalDishes }} món</span>
            </div>

            <div class="column-cards-scroll grid-cooking">
              <div class="empty-col-state" *ngIf="cookingGroups.length === 0">
                <span class="material-symbols-outlined">restaurant</span>
                <p>Chưa có món nào đang nấu</p>
              </div>

              <div
                *ngFor="let group of cookingGroups; trackBy: trackByGroupKey"
                class="kds-card"
                [class.kds-batch-card]="group.isBatch"
                [ngClass]="getGroupUrgencyClass(group)"
              >
                <!-- CASE 1: BATCH CARD COOKING -->
                <ng-container *ngIf="group.isBatch">
                  <div class="batch-hero-bar">
                    <span class="batch-pill-badge badge-cooking">
                      <span class="material-symbols-outlined icon-nano">skillet</span>
                      Gom mẻ ({{ group.items.length }} bàn)
                    </span>
                    <div class="timer-pill" [ngClass]="getTimerClass(group.maxWaitMinutes)">
                      <span class="material-symbols-outlined timer-icon">timer</span>
                      <span>{{ group.maxWaitMinutes }}p</span>
                    </div>
                  </div>

                  <div class="card-dish">
                    <div class="dish-qty-name">
                      <span class="qty-badge-batch">{{ group.totalQuantity }}x</span>
                      <span class="batch-dish-title">{{ group.dishName }}</span>
                    </div>
                    <div class="station-meta">
                      <span class="station-badge">{{ getStationLabel(group.station) }}</span>
                      <span class="prep-est">~{{ group.preparationTime }}p nấu</span>
                    </div>
                  </div>

                  <!-- Breakdown Tables List with Finish per Table -->
                  <div class="batch-tables-list">
                    <div *ngFor="let it of group.items" class="batch-table-row">
                      <div class="bt-left">
                        <span class="bt-table">{{ getItemTableNumber(it) }}</span>
                        <span class="bt-qty">{{ it.quantity }}x</span>
                        <span class="bt-wait">({{ getItemWaitMinutes(it) }}p)</span>
                        <span *ngIf="it.note || it.notes" class="bt-note">📝 {{ it.note || it.notes }}</span>
                      </div>
                      <div class="bt-right">
                        <button
                          type="button"
                          class="btn-table-ready"
                          (click)="updateStatus(it, 'SERVED')"
                          title="Nấu xong và chuyển thẳng lên bàn này"
                        >
                          <span class="material-symbols-outlined icon-nano">check</span>
                          <span>Lên bàn</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Main Action: Finish Entire Batch -->
                  <div class="card-actions">
                    <button
                      type="button"
                      class="btn-kds btn-ready btn-batch-ready"
                      (click)="finishBatchCooking(group)"
                    >
                      <span class="material-symbols-outlined icon-nano">done_all</span>
                      <span>Xong Cả Mẻ ({{ group.totalQuantity }}p)</span>
                    </button>
                  </div>
                </ng-container>

                <!-- CASE 2: SINGLE ITEM CARD COOKING -->
                <ng-container *ngIf="!group.isBatch">
                  <ng-container *ngFor="let item of group.items">
                    <div class="card-top">
                      <div class="top-table">
                        <span class="table-badge">{{ getItemTableNumber(item) }}</span>
                      </div>
                      <div class="timer-pill" [ngClass]="getTimerClass(getItemWaitMinutes(item))">
                        <span class="material-symbols-outlined timer-icon">timer</span>
                        <span>{{ getItemWaitMinutes(item) }} phút</span>
                      </div>
                    </div>

                    <div class="card-dish">
                      <div class="dish-qty-name">
                        <span class="qty-badge">{{ item.quantity }}x</span>
                        <span class="dish-title">{{ item.dishName }}</span>
                      </div>
                      <div class="station-meta">
                        <span class="station-badge">{{ getStationLabel(item.station) }}</span>
                        <span class="prep-est">~{{ getItemPrepTime(item) }}p nấu</span>
                      </div>
                    </div>

                    <div *ngIf="item.note || item.notes" class="dish-note">
                      <span class="material-symbols-outlined note-icon">tips_and_updates</span>
                      <span class="note-text">{{ item.note || item.notes }}</span>
                    </div>

                    <div class="card-actions">
                      <button
                        type="button"
                        class="btn-kds btn-ready"
                        (click)="updateStatus(item, 'SERVED')"
                      >
                        <span class="material-symbols-outlined icon-nano">check</span>
                        <span>Nấu Xong & Lên Bàn</span>
                      </button>
                    </div>
                  </ng-container>
                </ng-container>
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- COLUMN 2: CHỜ CHẾ BIẾN (PENDING - 1/3 MÀN) -->
          <!-- ========================================== -->
          <div class="kds-column col-pending">
            <div class="column-header ch-pending">
              <div class="ch-title">
                <span class="material-symbols-outlined ch-icon">hourglass_top</span>
                <h2>Chờ Chế Biến</h2>
              </div>
              <span class="ch-counter">{{ pendingGroups.length }} mục • {{ pendingTotalDishes }} món</span>
            </div>

            <div class="column-cards-scroll grid-pending">
              <div class="empty-col-state" *ngIf="pendingGroups.length === 0">
                <span class="material-symbols-outlined">done_all</span>
                <p>Không có món nào đang chờ chế biến</p>
              </div>

              <div
                *ngFor="let group of pendingGroups; trackBy: trackByGroupKey"
                class="kds-card"
                [class.kds-batch-card]="group.isBatch"
                [ngClass]="getGroupUrgencyClass(group)"
              >
                <!-- CASE 1: BATCH CARD (GOM MẺ NHIỀU BÀN) -->
                <ng-container *ngIf="group.isBatch">
                  <div class="batch-hero-bar">
                    <span class="batch-pill-badge">
                      <span class="material-symbols-outlined icon-nano">all_inclusive</span>
                      Gom mẻ ({{ group.items.length }} bàn)
                    </span>
                    <div class="timer-pill" [ngClass]="getTimerClass(group.maxWaitMinutes)">
                      <span class="material-symbols-outlined timer-icon">timer</span>
                      <span>{{ group.maxWaitMinutes }}p</span>
                    </div>
                  </div>

                  <div class="card-dish">
                    <div class="dish-qty-name">
                      <span class="qty-badge-batch">{{ group.totalQuantity }}x</span>
                      <span class="batch-dish-title">{{ group.dishName }}</span>
                    </div>
                    <div class="station-meta">
                      <span class="station-badge">{{ getStationLabel(group.station) }}</span>
                      <span class="prep-est">~{{ group.preparationTime }}p nấu</span>
                    </div>
                  </div>

                  <!-- Breakdown Table Rows -->
                  <div class="batch-tables-list">
                    <div *ngFor="let it of group.items" class="batch-table-row" [class.has-cancel]="it.kitchenStatus === 'CANCEL_REQUESTED'">
                      <div class="bt-left">
                        <span class="bt-table">{{ getItemTableNumber(it) }}</span>
                        <span class="bt-qty">{{ it.quantity }}x</span>
                        <span class="bt-wait">({{ getItemWaitMinutes(it) }}p)</span>
                        <span *ngIf="it.note || it.notes" class="bt-note">📝 {{ it.note || it.notes }}</span>
                        <span *ngIf="it.kitchenStatus === 'CANCEL_REQUESTED'" class="bt-cancel-badge">⚠️ Xin hủy: "{{ it.cancelReason }}"</span>
                      </div>
                      <div class="bt-right" *ngIf="it.kitchenStatus === 'CANCEL_REQUESTED'">
                        <button type="button" class="btn-cancel-mini btn-accept-mini" (click)="resolveCancel(it, true)" title="Đồng ý hủy cho bàn này">✓ Hủy</button>
                        <button type="button" class="btn-cancel-mini btn-reject-mini" (click)="resolveCancel(it, false)" title="Từ chối hủy">✕ Nấu</button>
                      </div>
                    </div>
                  </div>

                  <!-- Start Batch Cooking Button -->
                  <div class="card-actions">
                    <button
                      type="button"
                      class="btn-kds btn-start-cook btn-batch-cook"
                      (click)="startBatchCooking(group)"
                    >
                      <span class="material-symbols-outlined icon-nano">skillet</span>
                      <span>Nấu Cả Mẻ ({{ group.totalQuantity }} phần)</span>
                    </button>
                  </div>
                </ng-container>

                <!-- CASE 2: SINGLE ITEM CARD -->
                <ng-container *ngIf="!group.isBatch">
                  <ng-container *ngFor="let item of group.items">
                    <!-- Cancel Requested Alert Banner -->
                    <div *ngIf="item.kitchenStatus === 'CANCEL_REQUESTED'" class="cancel-alert-banner">
                      <div class="alert-top">
                        <span class="material-symbols-outlined">warning</span>
                        <b>PHỤC VỤ XIN HỦY MÓN!</b>
                      </div>
                      <p class="alert-reason" *ngIf="item.cancelReason">Lý do: "{{ item.cancelReason }}"</p>
                      <div class="alert-actions">
                        <button class="btn-cancel-resolve btn-accept-cancel" (click)="resolveCancel(item, true)">
                          <span class="material-symbols-outlined">done</span> Hủy
                        </button>
                        <button class="btn-cancel-resolve btn-reject-cancel" (click)="resolveCancel(item, false)">
                          <span class="material-symbols-outlined">close</span> Nấu
                        </button>
                      </div>
                    </div>

                    <!-- Card Header -->
                    <div class="card-top">
                      <div class="top-table">
                        <span class="table-badge">{{ getItemTableNumber(item) }}</span>
                      </div>
                      <div class="timer-pill" [ngClass]="getTimerClass(getItemWaitMinutes(item))">
                        <span class="material-symbols-outlined timer-icon">timer</span>
                        <span>{{ getItemWaitMinutes(item) }} phút</span>
                      </div>
                    </div>

                    <!-- Dish Info -->
                    <div class="card-dish">
                      <div class="dish-qty-name">
                        <span class="qty-badge">{{ item.quantity }}x</span>
                        <span class="dish-title">{{ item.dishName }}</span>
                      </div>
                      <div class="station-meta">
                        <span class="station-badge">{{ getStationLabel(item.station) }}</span>
                        <span class="prep-est">~{{ getItemPrepTime(item) }}p nấu</span>
                      </div>
                    </div>

                    <div *ngIf="item.note || item.notes" class="dish-note">
                      <span class="material-symbols-outlined note-icon">tips_and_updates</span>
                      <span class="note-text">{{ item.note || item.notes }}</span>
                    </div>

                    <!-- Start Cook Button -->
                    <div class="card-actions" *ngIf="item.kitchenStatus !== 'CANCEL_REQUESTED'">
                      <button
                        type="button"
                        class="btn-kds btn-start-cook"
                        (click)="updateStatus(item, 'COOKING')"
                      >
                        <span class="material-symbols-outlined icon-nano">skillet</span>
                        <span>Bắt Đầu Nấu</span>
                      </button>
                    </div>
                  </ng-container>
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- MODAL: FAST OUT OF STOCK (BÁO HẾT MÓN)     -->
      <!-- ========================================== -->
      <div class="modal-backdrop" *ngIf="showOutOfStockModal">
        <div class="modal-card modal-stock-card">
          <div class="modal-top">
            <div class="modal-stock-icon-badge">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <div class="modal-stock-title-wrap">
              <h3>Báo Hết Món Ăn Nhanh (Trực Tiếp Từ Bếp)</h3>
              <p>Chạm vào nút để bật/tắt trạng thái món ngay khi bếp hết nguyên liệu</p>
            </div>
            <button class="btn-close-modal" (click)="showOutOfStockModal = false" title="Đóng">✕</button>
          </div>

          <!-- Multi-Filter Toolbar (Search + Station Dropdown + Category Dropdown) -->
          <div class="modal-filter-toolbar">
            <div class="search-input-wrap">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                [(ngModel)]="dishSearch"
                placeholder="Tìm tên món ăn..."
                class="form-control-kds search-control"
              />
            </div>

            <!-- Station Select Dropdown -->
            <div class="select-wrap">
              <span class="material-symbols-outlined select-icon">room_service</span>
              <select [(ngModel)]="modalStationFilter" class="form-control-kds select-control">
                <option value="ALL">-- Tất cả trạm --</option>
                <option value="KITCHEN_HOT">🔥 Bếp Nóng</option>
                <option value="KITCHEN_COLD">❄️ Bếp Lạnh</option>
                <option value="BAR">🍸 Quầy Bar</option>
              </select>
            </div>

            <!-- Category Select Dropdown -->
            <div class="select-wrap">
              <span class="material-symbols-outlined select-icon">category</span>
              <select [(ngModel)]="modalCategoryFilter" class="form-control-kds select-control">
                <option value="ALL">-- Tất cả phân loại --</option>
                <option *ngFor="let cat of categories" [ngValue]="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Quick Stats Filter Counter -->
          <div class="stock-stats-strip">
            <span>Hiển thị: <b>{{ filteredDishes.length }}</b> món</span>
            <span *ngIf="outOfStockCount > 0" class="badge-out-count">
              <span class="material-symbols-outlined icon-nano">warning</span>
              {{ outOfStockCount }} món đang hết hàng
            </span>
          </div>

          <!-- Dishes List -->
          <div class="dishes-list-modal">
            <div *ngIf="filteredDishes.length === 0" class="empty-dishes-note">
              <span class="material-symbols-outlined">search_off</span>
              <p>Không tìm thấy món ăn nào phù hợp với bộ lọc hiện tại.</p>
            </div>

            <div *ngFor="let dish of filteredDishes" class="dish-toggle-row">
              <div class="d-info">
                <div class="d-name-row">
                  <span class="d-name">{{ dish.name }}</span>
                  <span class="st-badge" [ngClass]="getStationBadge(dish.station).class">
                    <span class="material-symbols-outlined icon-nano">{{ getStationBadge(dish.station).icon }}</span>
                    {{ getStationBadge(dish.station).label }}
                  </span>
                </div>
                <span class="d-cat">
                  {{ dish.categoryName || 'Món ăn' }} • {{ dish.price | number:'1.0-0' }} đ
                </span>
              </div>

              <!-- Suspended by Manager -->
              <div *ngIf="dish.status === 'SUSPENDED'" class="btn-suspended-pill" title="Món này đang tạm ngưng phục vụ bởi Quản lý">
                <span class="material-symbols-outlined icon-nano">pause_circle</span>
                <span>Tạm ngưng (Quản lý khóa)</span>
              </div>

              <!-- Available / Out of stock toggle -->
              <button
                *ngIf="dish.status !== 'SUSPENDED'"
                class="btn-toggle-stock"
                [class.btn-out]="!dish.isAvailable"
                [class.btn-avail]="dish.isAvailable"
                (click)="toggleDishStock(dish)"
                title="Bấm để đổi trạng thái Còn món / Hết món"
              >
                <span class="material-symbols-outlined icon-nano">{{ dish.isAvailable ? 'check_circle' : 'cancel' }}</span>
                <span>{{ dish.isAvailable ? 'Còn món' : 'HẾT MÓN' }}</span>
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary-kds" (click)="showOutOfStockModal = false">
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kds-workspace {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .kds-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      padding: 8px 20px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
      box-sizing: border-box;
    }

    .kds-brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex-shrink: 1;
    }

    .kds-brand-logo {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }

    .icon-kds {
      font-size: 24px;
      color: #ffffff;
    }

    .kds-title-area {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kds-title {
      font-size: 1.125rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .header-divider {
      width: 1px;
      height: 28px;
      background: #334155;
      flex-shrink: 0;
    }

    .kds-clock-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #334155;
      border-radius: 8px;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .clock-icon {
      font-size: 18px;
      color: #38bdf8;
    }

    .clock-time {
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
      font-size: 0.875rem;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: 0.03em;
    }

    .live-pulse {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #34d399;
      background: rgba(52, 211, 153, 0.15);
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid rgba(52, 211, 153, 0.3);
      white-space: nowrap;
    }

    .live-pulse.paused {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.15);
      border-color: rgba(148, 163, 184, 0.3);
    }

    .live-pulse.paused .pulse-dot {
      background: #94a3b8;
      box-shadow: none;
      animation: none;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    .kds-desc {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 4px 0 0;
      white-space: nowrap;
    }

    .kds-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-left: auto;
    }

    /* CHEF USER PILL & DROPDOWN */
    .user-dropdown-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .user-pill-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 6px;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid #334155;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s;
      outline: none;
    }

    .user-pill-btn:hover,
    .user-pill-btn.active {
      background: rgba(51, 65, 85, 0.9);
      border-color: #475569;
    }

    .user-avatar.role-chef {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      text-align: left;
      line-height: 1.2;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #f1f5f9;
      white-space: nowrap;
    }

    .user-role-badge.role-chef {
      font-size: 0.625rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
    }

    .chevron-icon {
      font-size: 18px;
      color: #94a3b8;
      transition: transform 0.2s ease;
    }

    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    .dropdown-popover {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 250px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      padding: 6px 0;
      z-index: 100;
      animation: popIn 0.15s ease-out;
    }

    @keyframes popIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-hero {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
    }

    .dropdown-avatar.role-chef {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.9375rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dropdown-user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      overflow: hidden;
    }

    .dropdown-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .dropdown-role-text {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
    }

    .dropdown-username {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .dropdown-divider {
      height: 1px;
      background: #334155;
      margin: 6px 0;
    }

    .dropdown-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #cbd5e1;
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      box-sizing: border-box;
      text-align: left;
      transition: all 0.15s;
    }

    .dropdown-menu-item:hover {
      background: #334155;
      color: #ffffff;
    }

    .dropdown-icon {
      font-size: 18px;
      color: #94a3b8;
    }

    .logout-item {
      color: #f87171;
    }

    .logout-item .dropdown-icon {
      color: #f87171;
    }

    .logout-item:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .btn-suspended-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.75rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .btn-warning-kds {
      background: #f59e0b;
      color: #0f172a;
    }

    .btn-warning-kds:hover {
      background: #d97706;
    }

    .btn-outline-kds {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid #475569;
      color: #cbd5e1;
    }

    .btn-outline-kds.active {
      background: rgba(14, 165, 233, 0.2);
      border-color: #38bdf8;
      color: #38bdf8;
    }

    .btn-primary-kds {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-primary-kds:hover {
      background: #0369a1;
    }

    /* STATION TABS */
    .station-tabs-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 24px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .station-tabs-group {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
    }

    .station-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .station-tab.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
    }

    .hot-tab.active { background: #ea580c; border-color: #fb923c; }
    .cold-tab.active { background: #0891b2; border-color: #22d3ee; }
    .grill-tab.active { background: #dc2626; border-color: #f87171; }
    .bar-tab.active { background: #7c3aed; border-color: #a78bfa; }

    /* KDS BODY: 2-COLUMN WORKFLOW LAYOUT */
    .kds-body {
      flex: 1;
      overflow: hidden;
      padding: 0;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .kds-columns-wrap {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 12px;
      height: 100%;
      overflow: hidden;
      padding: 10px 14px;
      box-sizing: border-box;
    }

    @media (max-width: 900px) {
      .kds-columns-wrap {
        grid-template-columns: 1fr;
        overflow-y: auto;
      }
    }

    .kds-column {
      display: flex;
      flex-direction: column;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
      height: 100%;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid #1f2937;
      flex-shrink: 0;
    }

    .ch-pending {
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(17, 24, 39, 0) 100%);
      border-bottom-color: rgba(245, 158, 11, 0.35);
    }

    .ch-cooking {
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(17, 24, 39, 0) 100%);
      border-bottom-color: rgba(16, 185, 129, 0.35);
    }

    .ch-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ch-title h2 {
      font-size: 0.9rem;
      font-weight: 800;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ch-pending .ch-icon, .ch-pending h2 {
      color: #fbbf24;
    }

    .ch-cooking .ch-icon, .ch-cooking h2 {
      color: #34d399;
    }

    .ch-counter {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: #e5e7eb;
    }

    .column-cards-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      box-sizing: border-box;
    }

    .column-cards-scroll.grid-cooking {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      align-content: start;
    }

    .column-cards-scroll.grid-pending {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      align-content: start;
    }

    @media (max-width: 1400px) {
      .column-cards-scroll.grid-cooking {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .column-cards-scroll.grid-pending {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1100px) {
      .column-cards-scroll.grid-cooking {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .column-cards-scroll.grid-pending {
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }
    }

    .empty-col-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 16px;
      color: #6b7280;
      text-align: center;
    }

    .empty-col-state .material-symbols-outlined {
      font-size: 40px;
      margin-bottom: 8px;
      opacity: 0.6;
    }

    .empty-col-state p {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* GOM MẺ BATCH CARD STYLES */
    .kds-batch-card {
      border: 1.5px solid #3b82f6 !important;
      background: linear-gradient(180deg, #1e293b 0%, rgba(30, 58, 138, 0.15) 100%);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }

    .batch-hero-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .batch-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #1d4ed8;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.3px;
    }

    .batch-pill-badge.badge-cooking {
      background: #059669;
    }

    .qty-badge-batch {
      background: #2563eb;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.05rem;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .batch-dish-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      line-height: 1.25;
      word-break: break-word;
    }

    .batch-tables-list {
      background: #0f172a;
      border-radius: 6px;
      border: 1px solid #334155;
      padding: 4px 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 75px;
      overflow-y: auto;
    }

    .batch-table-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 3px 4px;
      border-radius: 4px;
      font-size: 0.725rem;
      gap: 6px;
    }

    .batch-table-row:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .batch-table-row.has-cancel {
      background: rgba(239, 68, 68, 0.15);
      border: 1px dashed #ef4444;
    }

    .bt-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .bt-table {
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.7rem;
    }

    .bt-qty {
      font-weight: 800;
      color: #facc15;
    }

    .bt-wait {
      font-size: 0.675rem;
      color: #94a3b8;
    }

    .bt-note {
      font-size: 0.675rem;
      color: #cbd5e1;
      font-style: italic;
    }

    .bt-cancel-badge {
      font-size: 0.675rem;
      font-weight: 700;
      color: #f87171;
    }

    .btn-table-ready {
      background: #065f46;
      color: #6ee7b7;
      border: 1px solid #059669;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 0.65rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-table-ready:hover {
      background: #047857;
      color: #ffffff;
    }

    .btn-cancel-mini {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }

    .btn-accept-mini {
      background: #dc2626;
      color: #ffffff;
      margin-right: 4px;
    }

    .btn-reject-mini {
      background: #475569;
      color: #ffffff;
    }

    .btn-batch-cook {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #0f172a;
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
    }

    .btn-batch-ready {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-weight: 800;
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
    }

    /* KDS CARDS - SQUARE PROPORTION (6 CARDS/ROW, FIT ~18 CARDS ACROSS 3 ROWS) */
    .kds-card {
      background: #1e293b;
      border: 1.5px solid #334155;
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
      min-height: 180px;
      max-height: 220px;
      box-sizing: border-box;
      transition: all 0.15s;
    }

    .card-urgent {
      border-color: #ef4444;
      background: linear-gradient(180deg, #1e293b 70%, rgba(239, 68, 68, 0.15) 100%);
    }

    .card-warning {
      border-color: #f59e0b;
      background: linear-gradient(180deg, #1e293b 70%, rgba(245, 158, 11, 0.12) 100%);
    }

    .card-cancel-requested {
      border-color: #f43f5e;
      background: rgba(244, 63, 94, 0.15);
      animation: alertPulse 1.2s infinite alternate;
    }

    @keyframes alertPulse {
      0% { box-shadow: 0 0 4px rgba(244, 63, 94, 0.3); }
      100% { box-shadow: 0 0 16px rgba(244, 63, 94, 0.8); }
    }

    .cancel-alert-banner {
      background: #881337;
      border: 1px solid #f43f5e;
      border-radius: 6px;
      padding: 8px;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .alert-top {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fecdd3;
      font-size: 0.75rem;
    }

    .alert-reason {
      font-size: 0.725rem;
      color: #ffe4e6;
      margin: 0;
      font-style: italic;
    }

    .alert-actions {
      display: flex;
      gap: 6px;
      margin-top: 2px;
    }

    .btn-cancel-resolve {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 5px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }

    .btn-accept-cancel {
      background: #10b981;
      color: #ffffff;
    }

    .btn-reject-cancel {
      background: #475569;
      color: #ffffff;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .top-table {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-badge {
      background: #0284c7;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.875rem;
      padding: 2px 7px;
      border-radius: 5px;
    }

    .order-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .timer-pill {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 999px;
      background: #334155;
      color: #cbd5e1;
    }

    .timer-long { background: #7f1d1d; color: #fca5a5; }
    .timer-medium { background: #78350f; color: #fcd34d; }

    .timer-icon { font-size: 13px; }

    .card-dish {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .dish-qty-name {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .qty-badge {
      font-size: 1.15rem;
      font-weight: 900;
      color: #f59e0b;
      line-height: 1.1;
    }

    .dish-title {
      font-size: 0.9375rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }

    .station-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.6875rem;
    }

    .station-badge {
      background: #334155;
      color: #94a3b8;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 600;
    }

    .prep-est {
      color: #64748b;
      font-size: 0.6875rem;
    }

    .dish-note {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 3px 6px;
      border-radius: 5px;
      font-size: 0.7rem;
      color: #fbbf24;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .note-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .note-icon { font-size: 14px; flex-shrink: 0; }

    .algo-badges {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #334155;
      padding-top: 5px;
      font-size: 0.7rem;
    }

    .priority-score {
      color: #38bdf8;
      font-weight: 700;
    }

    .batch-badge {
      background: #312e81;
      color: #a5b4fc;
      border: 1px solid #4338ca;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.675rem;
    }

    .card-actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
    }

    .btn-kds {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 6px;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 800;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-start-cook {
      background: #f97316;
      color: #ffffff;
    }

    .btn-start-cook:hover {
      background: #ea580c;
    }

    .btn-ready {
      background: #10b981;
      color: #ffffff;
    }

    .btn-ready:hover {
      background: #059669;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-stock-card {
      width: 100%;
      max-width: 680px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      color: #f8fafc;
      max-height: 85vh;
    }

    .modal-top {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }

    .modal-stock-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .modal-stock-title-wrap {
      flex: 1;
    }

    .modal-stock-title-wrap h3 {
      font-size: 1.125rem;
      font-weight: 800;
      margin: 0 0 3px;
      color: #ffffff;
    }

    .modal-stock-title-wrap p {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 0;
    }

    .btn-close-modal {
      position: absolute;
      right: 0;
      top: 0;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 4px;
      transition: color 0.15s;
    }

    .btn-close-modal:hover {
      color: #ffffff;
    }

    .modal-filter-toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-input-wrap {
      flex: 1.4;
      min-width: 180px;
      position: relative;
    }

    .select-wrap {
      flex: 1;
      min-width: 150px;
      position: relative;
    }

    .search-icon, .select-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #64748b;
      pointer-events: none;
    }

    .form-control-kds {
      width: 100%;
      padding: 9px 12px 9px 34px;
      border-radius: 8px;
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      font-size: 0.8125rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-control-kds:focus {
      border-color: #38bdf8;
    }

    select.form-control-kds {
      cursor: pointer;
    }

    select.form-control-kds option {
      background: #0f172a;
      color: #f8fafc;
    }

    .stock-stats-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.775rem;
      color: #94a3b8;
      padding: 0 4px;
    }

    .badge-out-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #fb7185;
      font-weight: 700;
      background: rgba(225, 29, 72, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
    }

    .dishes-list-modal {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 380px;
      padding-right: 4px;
    }

    .empty-dishes-note {
      text-align: center;
      padding: 32px 16px;
      color: #64748b;
    }

    .empty-dishes-note .material-symbols-outlined {
      font-size: 36px;
      margin-bottom: 6px;
    }

    .empty-dishes-note p {
      margin: 0;
      font-size: 0.8125rem;
    }

    .dish-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      gap: 12px;
    }

    .d-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 3px;
      flex-wrap: wrap;
    }

    .d-name {
      font-weight: 700;
      font-size: 0.9375rem;
      color: #ffffff;
    }

    .st-badge {
      font-size: 0.675rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .station-badge-hot {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .station-badge-cold {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .station-badge-bar {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .station-badge-default {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .d-cat {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .btn-toggle-stock {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 0.775rem;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .btn-avail {
      background: #065f46;
      color: #6ee7b7;
      border: 1px solid #059669;
    }

    .btn-avail:hover {
      background: #047857;
    }

    .btn-out {
      background: #881337;
      color: #fda4af;
      border: 1px solid #e11d48;
    }

    .btn-out:hover {
      background: #9f1239;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #334155;
      padding-top: 14px;
    }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  private kitchenService = inject(KitchenService);
  private menuService = inject(MenuService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  queueItems: KitchenQueueItem[] = [];
  selectedStation: Station | null = null;
  autoRefresh = true;
  private intervalId: any = null;

  // Realtime clock (Format: HH:mm • DD/MM/YYYY)
  currentTime = '';
  private clockTimer: any = null;

  // Chef User Dropdown Popover
  showUserDropdown = false;

  // Fast Out of Stock Modal
  showOutOfStockModal = false;
  dishes: Dish[] = [];
  categories: Category[] = [];
  dishSearch = '';
  modalStationFilter: Station | 'ALL' = 'ALL';
  modalCategoryFilter: number | 'ALL' = 'ALL';

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showUserDropdown = false;
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.showUserDropdown = !this.showUserDropdown;
  }

  ngOnInit(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
    this.loadQueue();
    // 10s auto-refresh polling
    this.intervalId = setInterval(() => {
      if (this.autoRefresh) {
        this.loadQueue();
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  updateClock(): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    this.currentTime = `${timeStr} • ${dayStr}/${monthStr}`;
    this.cdr.markForCheck();
  }

  get currentUser(): User | null {
    return this.authService.getUser();
  }

  getRoleShortLabel(role?: Role): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'Quản Trị';
      case 'ROLE_MANAGER': return 'Quản Lý';
      case 'ROLE_STAFF': return 'Phục Vụ';
      case 'ROLE_CHEF': return 'Đầu Bếp';
      default: return 'Bếp';
    }
  }

  logout(): void {
    this.authService.logout();
  }

  private playChime(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  loadQueue(): void {
    this.kitchenService.getKitchenQueue(this.selectedStation || undefined).subscribe({
      next: (items) => {
        const prevCount = this.queueItems.length;
        this.queueItems = items || [];
        if (items && items.length > prevCount && prevCount > 0) {
          this.playChime();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load kitchen queue', err);
        this.cdr.markForCheck();
      }
    });
  }

  filterByStation(station: Station | null): void {
    this.selectedStation = station;
    this.loadQueue();
  }

  get filteredQueue(): KitchenQueueItem[] {
    return this.queueItems;
  }

  // ==========================================
  // 2-COLUMN WORKFLOW & SMART BATCHING (GOM MẺ)
  // ==========================================
  get pendingGroups(): KdsBatchGroup[] {
    const pendingItems = this.filteredQueue.filter(
      item => item.kitchenStatus === 'PENDING' || item.kitchenStatus === 'CANCEL_REQUESTED'
    );
    return this.buildGroups(pendingItems, 'PENDING');
  }

  get cookingGroups(): KdsBatchGroup[] {
    const cookingItems = this.filteredQueue.filter(
      item => item.kitchenStatus === 'COOKING'
    );
    return this.buildGroups(cookingItems, 'COOKING');
  }

  get pendingTotalDishes(): number {
    return this.filteredQueue
      .filter(i => i.kitchenStatus === 'PENDING' || i.kitchenStatus === 'CANCEL_REQUESTED')
      .reduce((sum, i) => sum + (i.quantity || 1), 0);
  }

  get cookingTotalDishes(): number {
    return this.filteredQueue
      .filter(i => i.kitchenStatus === 'COOKING')
      .reduce((sum, i) => sum + (i.quantity || 1), 0);
  }

  private buildGroups(items: KitchenQueueItem[], defaultStatus: KitchenStatus): KdsBatchGroup[] {
    const map = new Map<number, KitchenQueueItem[]>();
    for (const item of items) {
      const dishId = item.dishId;
      if (!map.has(dishId)) {
        map.set(dishId, []);
      }
      map.get(dishId)!.push(item);
    }

    const groups: KdsBatchGroup[] = [];
    map.forEach((itemList, dishId) => {
      const first = itemList[0];
      const totalQty = itemList.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const maxWait = Math.max(...itemList.map(it => this.getItemWaitMinutes(it)));
      const hasCancel = itemList.some(it => it.kitchenStatus === 'CANCEL_REQUESTED');
      const maxScore = Math.max(...itemList.map(it => it.priorityScore || 0));

      groups.push({
        groupKey: `${dishId}_${defaultStatus}_${itemList.map(i => i.orderItemId || i.id).join('_')}`,
        isBatch: itemList.length > 1,
        dishId: dishId,
        dishName: first.dishName,
        station: first.station,
        preparationTime: this.getItemPrepTime(first),
        kitchenStatus: defaultStatus,
        totalQuantity: totalQty,
        items: itemList,
        maxWaitMinutes: maxWait,
        hasCancelRequested: hasCancel,
        maxPriorityScore: maxScore
      });
    });

    // Sắp xếp: Ưu tiên món có yêu cầu xin hủy lên đầu, sau đó theo điểm ưu tiên của thuật toán
    groups.sort((a, b) => {
      if (a.hasCancelRequested && !b.hasCancelRequested) return -1;
      if (!a.hasCancelRequested && b.hasCancelRequested) return 1;
      return b.maxPriorityScore - a.maxPriorityScore;
    });

    return groups;
  }

  trackByGroupKey(index: number, group: KdsBatchGroup): string {
    return group.groupKey;
  }

  getGroupUrgencyClass(group: KdsBatchGroup): string {
    if (group.hasCancelRequested) return 'card-cancel-requested';
    if (group.maxWaitMinutes >= 15) return 'card-urgent';
    if (group.maxWaitMinutes >= 10) return 'card-warning';
    return 'card-normal';
  }

  startBatchCooking(group: KdsBatchGroup): void {
    const ids = group.items
      .filter(it => it.kitchenStatus !== 'CANCEL_REQUESTED')
      .map(it => it.orderItemId || it.itemId || it.id)
      .filter((id): id is number => !!id);

    if (ids.length === 0) return;

    this.kitchenService.updateBatchStatus(ids, 'COOKING').subscribe({
      next: () => this.loadQueue(),
      error: (err) => alert(err.error?.message || 'Lỗi khi bắt đầu nấu mẻ!')
    });
  }

  finishBatchCooking(group: KdsBatchGroup): void {
    const ids = group.items
      .map(it => it.orderItemId || it.itemId || it.id)
      .filter((id): id is number => !!id);

    if (ids.length === 0) return;

    this.kitchenService.updateBatchStatus(ids, 'SERVED').subscribe({
      next: () => this.loadQueue(),
      error: (err) => alert(err.error?.message || 'Lỗi khi hoàn thành mẻ món!')
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
  }

  getItemTableNumber(item: KitchenQueueItem): string {
    return item.tableNumber || item.tableName || 'Mang về';
  }

  getItemWaitMinutes(item: KitchenQueueItem): number {
    return item.waitTimeMinutes !== undefined ? item.waitTimeMinutes : (item.waitMinutes || 0);
  }

  getItemPrepTime(item: KitchenQueueItem): number {
    return item.preparationTime || item.estimatedPrepTime || 15;
  }

  getStationLabel(station: Station): string {
    switch (station) {
      case 'KITCHEN_HOT':
      case 'GRILL':
        return 'Bếp Nóng';
      case 'KITCHEN_COLD':
        return 'Bếp Lạnh';
      case 'BAR':
        return 'Quầy Bar';
      default:
        return station;
    }
  }

  getCardUrgencyClass(item: KitchenQueueItem): string {
    if (item.kitchenStatus === 'CANCEL_REQUESTED') return 'card-cancel-requested';
    const wait = this.getItemWaitMinutes(item);
    if (wait >= 15) return 'card-urgent';
    if (wait >= 10) return 'card-warning';
    return 'card-normal';
  }

  getTimerClass(waitMins: number): string {
    if (waitMins >= 15) return 'timer-long';
    if (waitMins >= 10) return 'timer-medium';
    return 'timer-normal';
  }

  updateStatus(item: KitchenQueueItem, newStatus: KitchenStatus): void {
    const id = item.orderItemId || item.itemId || item.id;
    if (!id) return;

    this.kitchenService.updateItemStatus(id, newStatus).subscribe({
      next: () => {
        this.loadQueue();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi cập nhật trạng thái món!');
      }
    });
  }

  resolveCancel(item: KitchenQueueItem, accepted: boolean): void {
    const id = item.orderItemId || item.itemId || item.id;
    if (!id) return;

    this.kitchenService.resolveCancelRequest(id, accepted).subscribe({
      next: () => {
        this.loadQueue();
      },
      error: (err) => {
        alert(err.error?.message || 'Lỗi khi xử lý yêu cầu hủy!');
      }
    });
  }

  // Fast Out-of-Stock Modal logic
  openOutOfStockModal(): void {
    // Default to currently selected station if active
    this.modalStationFilter = this.selectedStation ? this.selectedStation : 'ALL';
    this.modalCategoryFilter = 'ALL';
    this.dishSearch = '';

    this.menuService.getDishes().subscribe({
      next: (d) => {
        this.dishes = d || [];
        this.showOutOfStockModal = true;
        this.cdr.markForCheck();
      }
    });

    if (this.categories.length === 0) {
      this.menuService.getCategories().subscribe({
        next: (cats) => {
          this.categories = cats || [];
          this.cdr.markForCheck();
        }
      });
    }
  }

  get filteredDishes(): Dish[] {
    let result = this.dishes;

    // Filter by station
    if (this.modalStationFilter !== 'ALL') {
      if (this.modalStationFilter === 'KITCHEN_HOT') {
        result = result.filter(d => d.station === 'KITCHEN_HOT' || d.station === 'GRILL');
      } else {
        result = result.filter(d => d.station === this.modalStationFilter);
      }
    }

    // Filter by category
    if (this.modalCategoryFilter !== 'ALL') {
      result = result.filter(d => d.categoryId === this.modalCategoryFilter);
    }

    // Filter by search keyword
    if (this.dishSearch.trim()) {
      const term = this.dishSearch.trim().toLowerCase();
      result = result.filter(d =>
        (d.name || '').toLowerCase().includes(term) ||
        (d.categoryName || '').toLowerCase().includes(term)
      );
    }

    return result;
  }

  get outOfStockCount(): number {
    return this.filteredDishes.filter(d => !d.isAvailable).length;
  }

  getStationBadge(station: Station | string): { label: string; icon: string; class: string } {
    switch (station) {
      case 'KITCHEN_HOT':
      case 'GRILL':
        return { label: 'Bếp Nóng', icon: 'local_fire_department', class: 'station-badge-hot' };
      case 'KITCHEN_COLD':
        return { label: 'Bếp Lạnh', icon: 'ac_unit', class: 'station-badge-cold' };
      case 'BAR':
        return { label: 'Quầy Bar', icon: 'local_bar', class: 'station-badge-bar' };
      default:
        return { label: 'Bếp Nóng', icon: 'local_fire_department', class: 'station-badge-hot' };
    }
  }

  toggleDishStock(dish: Dish): void {
    if (dish.status === 'SUSPENDED') {
      alert('Món này đang tạm ngưng phục vụ theo lệnh của Quản lý. Vui lòng liên hệ Quản lý nếu cần mở lại!');
      return;
    }

    this.menuService.toggleDishAvailability(dish.id).subscribe({
      next: (updated) => {
        dish.isAvailable = updated.isAvailable;
        dish.status = updated.status || (updated.isAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK');
        this.cdr.markForCheck();
      },
      error: () => alert('Lỗi khi cập nhật trạng thái món!')
    });
  }
}
