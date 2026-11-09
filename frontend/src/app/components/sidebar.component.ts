import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Role } from '../core/models/restaurant.models';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  badge?: string;
}

const ADMIN_MENU_ITEMS: MenuItem[] = [
  { label: 'Phòng Bàn', icon: 'table_restaurant', route: '/admin', queryParams: { tab: 'TABLES' } },
  { label: 'Thực Đơn', icon: 'restaurant_menu', route: '/admin', queryParams: { tab: 'MENU' } },
  { label: 'Khách Hàng', icon: 'loyalty', route: '/admin', queryParams: { tab: 'CUSTOMERS' } },
  { label: 'Nhân Sự', icon: 'badge', route: '/admin', queryParams: { tab: 'STAFF' } },
  { label: 'Báo Cáo', icon: 'monitoring', route: '/admin', queryParams: { tab: 'REPORTS' } },
  { label: 'Đặt Trước', icon: 'event_available', route: '/reservations' }
];

const MANAGER_MENU_ITEMS: MenuItem[] = [
  { label: 'Sơ Đồ Bàn', icon: 'table_restaurant', route: '/waiter' },
  { label: 'Thu Ngân', icon: 'point_of_sale', route: '/checkout' },
  { label: 'Thực Đơn', icon: 'restaurant_menu', route: '/admin', queryParams: { tab: 'MENU' } },
  { label: 'Khách Hàng', icon: 'loyalty', route: '/admin', queryParams: { tab: 'CUSTOMERS' } },
  { label: 'Nhân Sự', icon: 'badge', route: '/admin', queryParams: { tab: 'STAFF' } },
  { label: 'Báo Cáo', icon: 'monitoring', route: '/admin', queryParams: { tab: 'REPORTS' } },
  { label: 'Đặt Trước', icon: 'event_available', route: '/reservations' }
];

const CHEF_MENU_ITEMS: MenuItem[] = [
  { label: 'Màn Hình Bếp', icon: 'soup_kitchen', route: '/kitchen' }
];

const STAFF_MENU_ITEMS: MenuItem[] = [
  { label: 'Sơ Đồ Bàn', icon: 'table_restaurant', route: '/waiter' },
  { label: 'Thu Ngân', icon: 'point_of_sale', route: '/checkout' },
  { label: 'Món Bếp Xong', icon: 'room_service', route: '/ready-items' },
  { label: 'Đặt Trước', icon: 'event_available', route: '/reservations' }
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="brand" *ngIf="!isCollapsed">
          <div class="brand-icon">
            <span class="material-symbols-outlined">restaurant</span>
          </div>
          <div class="brand-text">
            <span class="brand-name">Nom Nom Hub</span>
            <span class="brand-branch">Nhà hàng Nom Nom</span>
          </div>
        </div>

        <div class="brand-icon collapsed-logo" *ngIf="isCollapsed" title="Nom Nom Hub">
          <span class="material-symbols-outlined">restaurant</span>
        </div>

        <!-- Collapse / Expand Toggle Button -->
        <button
          type="button"
          class="btn-toggle"
          (click)="toggleCollapse()"
          [title]="isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'"
        >
          <span class="material-symbols-outlined">
            {{ isCollapsed ? 'chevron_right' : 'chevron_left' }}
          </span>
        </button>
      </div>

      <!-- Navigation Section -->
      <nav class="sidebar-nav">
        <div class="nav-section-title" *ngIf="!isCollapsed">
          <span>{{ getNavSectionTitle() }}</span>
        </div>

        <ul class="nav-list">
          <li *ngFor="let item of menuItems; trackBy: trackByRoute">
            <a
              [routerLink]="item.route"
              [queryParams]="item.queryParams"
              routerLinkActive="active"
              class="nav-link"
              [title]="isCollapsed ? item.label : ''"
            >
              <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
              <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
              <span class="nav-badge" *ngIf="!isCollapsed && item.badge">{{ item.badge }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- Sidebar Footer / User Profile -->
      <div class="sidebar-footer">
        <div
          class="user-card"
          *ngIf="user && !isCollapsed"
          [class.active-profile]="isProfileActive"
          routerLink="/profile"
          title="Bấm để xem & chỉnh sửa hồ sơ cá nhân"
        >
          <div class="user-avatar" [ngClass]="getRoleClass(user.role)">
            {{ user.fullName.charAt(0) }}
          </div>
          <div class="user-info">
            <span class="user-fullname">{{ cleanName(user.fullName) }}</span>
            <span class="user-badge" [ngClass]="getRoleClass(user.role)">
              {{ getRoleShortLabel(user.role) }}
            </span>
          </div>
          <button (click)="$event.stopPropagation(); logout()" class="btn-logout" title="Đăng xuất khỏi ca làm">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>

        <!-- Collapsed User Avatar -->
        <div
          class="collapsed-user"
          *ngIf="user && isCollapsed"
          [class.active-profile]="isProfileActive"
          routerLink="/profile"
          title="Bấm để xem hồ sơ cá nhân"
        >
          <div class="user-avatar" [ngClass]="getRoleClass(user.role)" [title]="cleanName(user.fullName) + ' (' + user.role + ')'">
            {{ user.fullName.charAt(0) }}
          </div>
          <button (click)="$event.stopPropagation(); logout()" class="btn-logout" title="Đăng xuất">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 195px;
      height: 100vh;
      background: #ffffff;
      border-right: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      transition: width 0.25s ease-in-out;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 2px 0 8px rgba(15, 23, 42, 0.03);
      flex-shrink: 0;
    }

    .sidebar.collapsed {
      width: 76px;
    }

    .sidebar-header {
      height: 56px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      position: relative;
      border-bottom: 1px solid var(--border-light);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      white-space: nowrap;
      padding-right: 4px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--primary), #0f766e);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px var(--primary-glow);
    }

    .brand-icon .material-symbols-outlined {
      font-size: 20px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
      overflow: hidden;
    }

    .brand-name {
      font-size: 0.875rem;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand-branch {
      font-size: 0.6875rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .collapsed-logo {
      margin: 0 auto;
    }

    .btn-toggle {
      position: absolute;
      right: -13px;
      top: 50%;
      transform: translateY(-50%);
      width: 26px;
      height: 26px;
      min-width: 26px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-light);
      background: #ffffff;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
      z-index: 20;
      padding: 0;
    }

    .btn-toggle .material-symbols-outlined {
      font-size: 18px;
    }

    .btn-toggle:hover {
      background: #ffffff;
      color: var(--primary);
      border-color: var(--primary);
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.14);
      transform: translateY(-50%) scale(1.05);
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .nav-section-title {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
      padding: 6px 10px;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 600;
      transition: all 0.15s ease-in-out;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar.collapsed .nav-link {
      justify-content: center;
      padding: 10px;
      gap: 0;
    }

    .nav-link:hover {
      background: var(--bg-muted);
      color: var(--navy);
    }

    .nav-link.active {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 700;
    }

    .nav-icon {
      font-size: 22px;
      flex-shrink: 0;
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge {
      font-size: 0.625rem;
      font-weight: 700;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 1px 5px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: 10px 8px;
      border-top: 1px solid var(--border-light);
      background: #f8fafc;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
      cursor: pointer;
    }

    .user-card:hover {
      background: var(--bg-muted);
    }

    .user-card.active-profile,
    .collapsed-user.active-profile {
      background: #e0f2fe;
      border: 1px solid #7dd3fc;
      box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    }

    .user-avatar.role-admin { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .user-avatar.role-manager { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .user-avatar.role-staff { background: linear-gradient(135deg, #10b981, #047857); }
    .user-avatar.role-chef { background: linear-gradient(135deg, #0284c7, #0369a1); }

    .user-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: 50%;
      background: var(--navy);
      color: #ffffff;
      font-weight: 800;
      font-size: 0.78125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      line-height: 1.15;
      min-width: 0;
    }

    .user-fullname {
      font-size: 0.78125rem;
      font-weight: 700;
      color: var(--navy);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .user-badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .role-admin { color: #dc2626; }
    .role-manager { color: #d97706; }
    .role-staff { color: #059669; }
    .role-chef { color: #2563eb; }

    .btn-logout {
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .btn-logout .material-symbols-outlined {
      font-size: 18px;
    }

    .btn-logout:hover {
      background: var(--status-occupied-bg);
      color: var(--status-occupied);
    }

    .collapsed-user {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  isCollapsed = false;

  constructor() {
    // Giữ trạng thái mở bình thường, không tự động đóng khi vào /checkout
  }

  cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  get user() {
    return this.authService.getUser();
  }

  get isProfileActive(): boolean {
    return this.router.url.includes('/profile');
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getNavSectionTitle(): string {
    const role = this.user?.role;
    if (role === 'ROLE_ADMIN') {
      return 'Quản trị hệ thống';
    }
    if (role === 'ROLE_MANAGER') {
      return 'Quản lý & Vận hành';
    }
    if (role === 'ROLE_CHEF') {
      return 'Khu vực bếp nấu';
    }
    return 'Nghiệp vụ chi nhánh';
  }

  trackByRoute(_index: number, item: MenuItem): string {
    return item.route + (item.queryParams ? ('?' + (item.queryParams['tab'] || '')) : '');
  }

  get menuItems(): MenuItem[] {
    const role = this.user?.role;
    if (role === 'ROLE_ADMIN') {
      return ADMIN_MENU_ITEMS;
    }
    if (role === 'ROLE_MANAGER') {
      return MANAGER_MENU_ITEMS;
    }
    if (role === 'ROLE_CHEF') {
      return CHEF_MENU_ITEMS;
    }
    return STAFF_MENU_ITEMS;
  }

  getRoleShortLabel(role: Role): string {
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

  logout(): void {
    this.authService.logout();
  }
}

