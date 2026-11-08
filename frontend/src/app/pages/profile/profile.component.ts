import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UserResponse, Role } from '../../core/models/restaurant.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Đang tải thông tin hồ sơ cá nhân...</span>
      </div>

      <!-- Main Profile Grid -->
      <div *ngIf="!isLoading && profile" class="profile-grid">
        <!-- Card 1: Personal Info -->
        <div class="profile-card">
          <div class="card-header">
            <span class="material-symbols-outlined card-header-icon">person</span>
            <div>
              <h2>Thông Tin Cá Nhân</h2>
              <p class="card-sub">Cập nhật họ tên và số điện thoại liên lạc của bạn</p>
            </div>
          </div>

          <!-- User Hero Avatar & Badges -->
          <div class="user-hero">
            <div class="hero-avatar" [ngClass]="getRoleClass(profile.role)">
              {{ profile.fullName.charAt(0) || 'U' }}
            </div>
            <div class="hero-details">
              <span class="hero-name">{{ cleanName(profile.fullName) }}</span>
              <div class="hero-tags">
                <span class="badge-role" [ngClass]="getRoleClass(profile.role)">
                  {{ getRoleLabel(profile.role) }}
                </span>
                <span class="badge-branch">
                  <span class="material-symbols-outlined branch-icon">storefront</span>
                  {{ (profile.branchName && !profile.branchName.includes('Bách Khoa')) ? profile.branchName : 'Nhà hàng Nom Nom' }}
                </span>
                <span class="badge-status" [class.badge-active]="profile.isActive">
                  {{ profile.isActive ? 'Đang hoạt động' : 'Tạm khoá' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Alert Messages for Profile -->
          <div *ngIf="profileSuccessMsg" class="alert alert-success">
            <span class="material-symbols-outlined alert-icon">check_circle</span>
            <span>{{ profileSuccessMsg }}</span>
          </div>

          <div *ngIf="profileErrorMsg" class="alert alert-error">
            <span class="material-symbols-outlined alert-icon">error</span>
            <span>{{ profileErrorMsg }}</span>
          </div>

          <!-- Profile Form -->
          <form (ngSubmit)="saveProfile()" class="form-body">
            <div class="form-row">
              <div class="form-group">
                <label>Tên đăng nhập (Username)</label>
                <div class="input-readonly-wrap">
                  <span class="material-symbols-outlined input-icon">badge</span>
                  <input type="text" [value]="profile.username" disabled class="input-readonly" />
                </div>
                <span class="help-text">Tên đăng nhập là định danh cố định không thể thay đổi</span>
              </div>

              <div class="form-group">
                <label>Chi nhánh trực thuộc</label>
                <div class="input-readonly-wrap">
                  <span class="material-symbols-outlined input-icon">location_on</span>
                  <input type="text" [value]="(profile.branchName && !profile.branchName.includes('Bách Khoa')) ? profile.branchName : 'Nhà hàng Nom Nom'" disabled class="input-readonly" />
                </div>
                <span class="help-text">Chỉ Quản trị viên (Admin) mới có quyền đổi chi nhánh</span>
              </div>
            </div>

            <div class="form-group">
              <label for="editFullName">Họ và tên hiển thị <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">badge</span>
                <input
                  id="editFullName"
                  type="text"
                  [(ngModel)]="editFullName"
                  name="fullName"
                  placeholder="Nhập họ và tên đầy đủ..."
                  class="form-input"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="editPhone">Số điện thoại liên lạc</label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">call</span>
                <input
                  id="editPhone"
                  type="text"
                  [(ngModel)]="editPhone"
                  name="phone"
                  placeholder="Ví dụ: 0912345678"
                  class="form-input"
                />
              </div>
            </div>

            <div class="card-footer">
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="isSavingProfile || !editFullName.trim()"
              >
                <span class="material-symbols-outlined" [class.spin]="isSavingProfile">
                  {{ isSavingProfile ? 'progress_activity' : 'save' }}
                </span>
                <span>{{ isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Card 2: Security & Change Password -->
        <div class="profile-card">
          <div class="card-header">
            <span class="material-symbols-outlined card-header-icon security-icon">shield_lock</span>
            <div>
              <h2>Bảo Mật & Mật Khẩu</h2>
              <p class="card-sub">Đổi mật khẩu định kỳ để bảo vệ tài khoản ca làm</p>
            </div>
          </div>

          <!-- Alert Messages for Password -->
          <div *ngIf="passwordSuccessMsg" class="alert alert-success">
            <span class="material-symbols-outlined alert-icon">check_circle</span>
            <span>{{ passwordSuccessMsg }}</span>
          </div>

          <div *ngIf="passwordErrorMsg" class="alert alert-error">
            <span class="material-symbols-outlined alert-icon">error</span>
            <span>{{ passwordErrorMsg }}</span>
          </div>

          <!-- Password Form -->
          <form (ngSubmit)="changePassword()" class="form-body">
            <div class="form-group">
              <label for="oldPassword">Mật khẩu hiện tại <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">lock</span>
                <input
                  id="oldPassword"
                  [type]="showOldPass ? 'text' : 'password'"
                  [(ngModel)]="oldPassword"
                  name="oldPassword"
                  placeholder="Nhập mật khẩu đang sử dụng..."
                  class="form-input"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-eye"
                  (click)="showOldPass = !showOldPass"
                  tabindex="-1"
                >
                  <span class="material-symbols-outlined">
                    {{ showOldPass ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword">Mật khẩu mới <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">key</span>
                <input
                  id="newPassword"
                  [type]="showNewPass ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  placeholder="Tối thiểu 6 ký tự..."
                  class="form-input"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-eye"
                  (click)="showNewPass = !showNewPass"
                  tabindex="-1"
                >
                  <span class="material-symbols-outlined">
                    {{ showNewPass ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Nhập lại mật khẩu mới <span class="required">*</span></label>
              <div class="input-wrap">
                <span class="material-symbols-outlined input-icon">lock_reset</span>
                <input
                  id="confirmPassword"
                  [type]="showConfirmPass ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới..."
                  class="form-input"
                  required
                />
                <button
                  type="button"
                  class="btn-toggle-eye"
                  (click)="showConfirmPass = !showConfirmPass"
                  tabindex="-1"
                >
                  <span class="material-symbols-outlined">
                    {{ showConfirmPass ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div class="card-footer">
              <button
                type="submit"
                class="btn btn-warning"
                [disabled]="isChangingPassword || !oldPassword || !newPassword || !confirmPassword"
              >
                <span class="material-symbols-outlined" [class.spin]="isChangingPassword">
                  {{ isChangingPassword ? 'progress_activity' : 'lock_reset' }}
                </span>
                <span>{{ isChangingPassword ? 'Đang đổi mật khẩu...' : 'Cập Nhật Mật Khẩu' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 24px 32px;
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-light);
    }

    .header-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary), #0f766e);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--primary-glow);
    }

    .header-icon {
      font-size: 28px;
    }

    .header-text h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 4px;
      letter-spacing: -0.02em;
    }

    .header-text p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 14px;
      color: var(--text-secondary);
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--border-light);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spin {
      animation: spin 0.8s linear infinite;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    .profile-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-light);
    }

    .card-header-icon {
      font-size: 26px;
      color: var(--primary);
    }

    .security-icon {
      color: #f59e0b;
    }

    .card-header h2 {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 2px;
    }

    .card-sub {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* User Hero */
    .user-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--bg-muted);
      border-radius: var(--radius-md);
    }

    .hero-avatar {
      width: 56px;
      height: 56px;
      min-width: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      background: var(--navy);
    }

    .hero-avatar.role-admin { background: linear-gradient(135deg, #ef4444, #b91c1c); }
    .hero-avatar.role-manager { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .hero-avatar.role-staff { background: linear-gradient(135deg, #10b981, #047857); }
    .hero-avatar.role-chef { background: linear-gradient(135deg, #0284c7, #0369a1); }

    .hero-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .hero-name {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hero-tags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge-role {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-role.role-admin { background: #fee2e2; color: #b91c1c; }
    .badge-role.role-manager { background: #fef3c7; color: #b45309; }
    .badge-role.role-staff { background: #dcfce7; color: #15803d; }
    .badge-role.role-chef { background: #e0f2fe; color: #0369a1; }

    .badge-branch {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: #ffffff;
      border: 1px solid var(--border-light);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .branch-icon {
      font-size: 13px;
    }

    .badge-status {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
    }

    .badge-active {
      background: #ecfdf5;
      color: #059669;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .alert-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    /* Form */
    .form-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--navy);
    }

    .required {
      color: #ef4444;
    }

    .input-wrap,
    .input-readonly-wrap {
      display: flex;
      align-items: center;
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      height: 40px;
      padding: 0 40px 0 38px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #ffffff;
      color: var(--text-primary);
      font-size: 0.875rem;
      font-family: inherit;
      transition: all 0.15s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .input-readonly {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 38px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: #f8fafc;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: not-allowed;
    }

    .help-text {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .btn-toggle-eye {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }

    .card-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    .btn-warning {
      background: #f59e0b;
      color: #ffffff;
    }

    .btn-warning:hover:not(:disabled) {
      background: #d97706;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  profile: UserResponse | null = null;
  isLoading = true;

  // Profile Form
  editFullName = '';
  editPhone = '';
  isSavingProfile = false;
  profileSuccessMsg = '';
  profileErrorMsg = '';

  // Password Form
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showOldPass = false;
  showNewPass = false;
  showConfirmPass = false;
  isChangingPassword = false;
  passwordSuccessMsg = '';
  passwordErrorMsg = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  cleanName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.userService.getCurrentProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.editFullName = this.cleanName(data.fullName);
        this.editPhone = data.phone || '';
        this.isLoading = false;
      },
      error: (err) => {
        this.profileErrorMsg = err.error?.message || 'Không thể tải thông tin hồ sơ cá nhân!';
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    if (!this.editFullName.trim()) return;

    this.isSavingProfile = true;
    this.profileSuccessMsg = '';
    this.profileErrorMsg = '';

    this.userService.updateCurrentProfile({
      fullName: this.editFullName.trim(),
      phone: this.editPhone.trim() || undefined
    }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.profileSuccessMsg = 'Cập nhật thông tin cá nhân thành công!';
        this.isSavingProfile = false;

        // Synchronize with AuthService & localStorage so Topbar & Sidebar update immediately
        const currentUser = this.authService.getUser();
        if (currentUser) {
          currentUser.fullName = updated.fullName;
          localStorage.setItem('auth_user', JSON.stringify(currentUser));
          this.authService.currentUser.set(currentUser);
        }
      },
      error: (err) => {
        this.profileErrorMsg = err.error?.message || 'Lỗi khi cập nhật thông tin cá nhân!';
        this.isSavingProfile = false;
      }
    });
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) return;

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMsg = 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp!';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordErrorMsg = 'Mật khẩu mới phải có tối thiểu 6 ký tự!';
      return;
    }

    this.isChangingPassword = true;
    this.passwordSuccessMsg = '';
    this.passwordErrorMsg = '';

    this.userService.changePassword({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.passwordSuccessMsg = 'Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới cho các lần đăng nhập tiếp theo.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.isChangingPassword = false;
      },
      error: (err) => {
        this.passwordErrorMsg = err.error?.message || 'Lỗi khi đổi mật khẩu! Vui lòng kiểm tra lại mật khẩu cũ.';
        this.isChangingPassword = false;
      }
    });
  }

  getRoleLabel(role: Role): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'Quản Trị Viên';
      case 'ROLE_MANAGER': return 'Quản Lý Nhà Hàng';
      case 'ROLE_STAFF': return 'Phục Vụ / Thu Ngân';
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
