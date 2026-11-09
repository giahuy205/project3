import { Component, OnInit, OnDestroy, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { Role } from '../core/models/restaurant.models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="topbar">
      <!-- Left: Context Title & Live Branch Indicator -->
      <div class="topbar-left">
        <!-- If Chef (no sidebar), show brand icon -->
        <div class="chef-brand" *ngIf="isChef">
          <div class="brand-icon">
            <span class="material-symbols-outlined">soup_kitchen</span>
          </div>
          <span class="system-brand">Nom Nom Hub</span>
          <span class="breadcrumb-slash">/</span>
          <span class="breadcrumb-page">KDS Điều Phối Bếp</span>
          <span class="branch-divider">•</span>
          <span class="branch-text">Nhà hàng Nom Nom</span>
          <span class="live-dot-pill">
            <span class="dot"></span>
            Trực tuyến
          </span>
        </div>

        <div class="page-context" *ngIf="!isChef">
          <div class="context-main">
            <span class="system-brand">Nom Nom Hub</span>
            <span class="breadcrumb-slash">/</span>
            <span class="breadcrumb-page">{{ currentBreadcrumb }}</span>
            <span class="branch-divider">•</span>
            <span class="branch-text">Nhà hàng Nom Nom</span>
            <span class="live-dot-pill">
              <span class="dot"></span>
              Trực tuyến
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Realtime Clock, User Pill, Logout -->
      <div class="topbar-right">
        <!-- Live Realtime Clock -->
        <div class="live-clock">
          <span class="material-symbols-outlined clock-icon">schedule</span>
          <span>{{ currentTime }}</span>
        </div>

        <!-- User Information Pill with Dropdown Menu -->
        <div class="user-dropdown-wrap" *ngIf="user">
          <button
            type="button"
            class="user-pill-btn"
            (click)="toggleUserDropdown($event)"
            [class.active]="showDropdown"
            title="Tuỳ chọn tài khoản"
          >
            <div class="user-avatar" [ngClass]="getRoleClass(user.role)">
              {{ user.fullName.charAt(0) }}
            </div>
            <div class="user-meta">
              <span class="user-name">{{ cleanName(user.fullName) }}</span>
              <span class="user-role-badge" [ngClass]="getRoleClass(user.role)">
                {{ getRoleLabel(user.role) }}
              </span>
            </div>
            <span class="material-symbols-outlined chevron-icon" [class.rotated]="showDropdown">
              expand_more
            </span>
          </button>

          <!-- Dropdown Popover -->
          <div class="dropdown-popover" *ngIf="showDropdown" (click)="$event.stopPropagation()">
            <div class="dropdown-hero">
              <div class="dropdown-avatar" [ngClass]="getRoleClass(user.role)">
                {{ user.fullName.charAt(0) }}
              </div>
              <div class="dropdown-user-info">
                <span class="dropdown-name">{{ cleanName(user.fullName) }}</span>
                <span class="dropdown-role-text">{{ getRoleLabel(user.role) }}</span>
                <span class="dropdown-username">&#64;{{ user.username }}</span>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <a routerLink="/profile" (click)="showDropdown = false" class="dropdown-menu-item">
              <span class="material-symbols-outlined dropdown-icon">manage_accounts</span>
              <span>Trang Cá Nhân</span>
            </a>

            <div class="dropdown-divider"></div>

            <button type="button" (click)="logout()" class="dropdown-menu-item logout-item">
              <span class="material-symbols-outlined dropdown-icon">logout</span>
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      min-height: 52px;
      padding: 0 16px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      z-index: 40;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .chef-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary), #0f766e);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--navy);
      white-space: nowrap;
    }

    .page-context {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .context-main {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }

    .system-brand {
      font-size: 0.9375rem;
      font-weight: 800;
      color: var(--primary);
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .breadcrumb-slash {
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      margin: 0 1px;
      user-select: none;
    }

    .breadcrumb-page {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--navy);
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .branch-divider {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .branch-text {
      font-size: 0.775rem;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .live-dot-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 1px 7px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .live-clock {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.8125rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: var(--text-secondary);
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      white-space: nowrap;
    }

    .clock-icon {
      font-size: 15px;
      color: var(--primary);
    }

    .user-dropdown-wrap {
      position: relative;
    }

    .user-pill-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 10px 3px 3px;
      background: #f8fafc;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-light);
      cursor: pointer;
      transition: all 0.15s;
    }

    .user-pill-btn:hover,
    .user-pill-btn.active {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .chevron-icon {
      font-size: 18px;
      color: var(--text-muted);
      transition: transform 0.2s;
    }

    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--navy);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar.role-admin { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .user-avatar.role-manager { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .user-avatar.role-staff { background: linear-gradient(135deg, #10b981, #047857); }
    .user-avatar.role-chef { background: linear-gradient(135deg, #0284c7, #0369a1); }

    .user-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--navy);
      white-space: nowrap;
    }

    .user-role-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .role-admin { background: #fee2e2; color: #dc2626; }
    .role-manager { background: #fef3c7; color: #d97706; }
    .role-staff { background: #dcfce7; color: #059669; }
    .role-chef { background: #dbeafe; color: #2563eb; }

    /* Dropdown Popover */
    .dropdown-popover {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 250px;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 8px 0;
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
      padding: 10px 16px;
    }

    .dropdown-avatar {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      background: var(--navy);
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
      color: var(--navy);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .dropdown-role-text {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
    }

    .dropdown-username {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-light);
      margin: 6px 0;
    }

    .dropdown-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 16px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      text-decoration: none;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
      transition: background 0.15s;
    }

    .dropdown-menu-item:hover {
      background: var(--bg-muted);
    }

    .dropdown-icon {
      font-size: 18px;
      color: var(--text-secondary);
    }

    .logout-item {
      color: #dc2626;
    }

    .logout-item .dropdown-icon {
      color: #dc2626;
    }

    .logout-item:hover {
      background: #fef2f2;
    }
  `]
})
export class TopbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentTime = '';
  currentBreadcrumb = 'Sơ Đồ Bàn Ăn';
  private timerId: any = null;
  showDropdown = false;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showDropdown = false;
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  ngOnInit(): void {
    this.updateClock();
    this.timerId = setInterval(() => {
      this.updateClock();
      this.cdr.detectChanges();
    }, 10000);

    this.updateBreadcrumbByUrl(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.updateBreadcrumbByUrl(e.urlAfterRedirects);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  get user() {
    return this.authService.getUser();
  }

  get isChef(): boolean {
    return this.authService.getRole() === 'ROLE_CHEF';
  }

  cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  private updateClock(): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    this.currentTime = `${timeStr} • ${dayStr}/${monthStr}`;
  }

  private updateBreadcrumbByUrl(url: string): void {
    const role = this.authService.getRole();

    if (url.includes('/profile')) {
      this.currentBreadcrumb = 'Hồ Sơ Cá Nhân';
    } else if (url.includes('/waiter')) {
      this.currentBreadcrumb = role === 'ROLE_ADMIN' ? 'Sơ Đồ Bàn Ăn' : 'Sơ Đồ Bàn & POS';
    } else if (url.includes('/checkout')) {
      this.currentBreadcrumb = 'Quầy Thu Ngân & Bill';
    } else if (url.includes('/reservations') || url.includes('/booking')) {
      this.currentBreadcrumb = 'Sổ Đặt Bàn Trước';
    } else if (url.includes('/ready-items')) {
      this.currentBreadcrumb = 'Món Bếp Nấu Xong';
    } else if (url.includes('/kitchen')) {
      this.currentBreadcrumb = 'Màn Hình Bếp (KDS)';
    } else if (url.includes('/admin')) {
      if (url.includes('tab=CUSTOMERS')) {
        this.currentBreadcrumb = 'Khách Hàng & Điểm';
      } else if (url.includes('tab=STAFF')) {
        this.currentBreadcrumb = role === 'ROLE_ADMIN' ? 'Quản Lý Nhân Sự' : 'Nhân Viên Chi Nhánh';
      } else if (url.includes('tab=REPORTS')) {
        this.currentBreadcrumb = 'Báo Cáo Doanh Thu';
      } else if (url.includes('tab=TABLES')) {
        this.currentBreadcrumb = 'Quản Lý Bàn Ăn';
      } else {
        this.currentBreadcrumb = 'Quản Lý Thực Đơn';
      }
    } else {
      this.currentBreadcrumb = 'Trang Chủ';
    }
  }

  getRoleLabel(role: Role): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'QUẢN TRỊ VIÊN';
      case 'ROLE_MANAGER': return 'QUẢN LÝ';
      case 'ROLE_STAFF': return 'PHỤC VỤ';
      case 'ROLE_CHEF': return 'ĐẦU BẾP';
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
