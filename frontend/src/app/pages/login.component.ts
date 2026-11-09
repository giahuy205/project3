import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <!-- Brand Header -->
        <div class="card-header">
          <div class="brand-logo">
            <span class="material-symbols-outlined">restaurant</span>
          </div>
          <h2 class="title">Nom Nom Hub</h2>
          <p class="subtitle">Hệ Thống Quản Lý & Vận Hành Nhà Hàng Nom Nom</p>
        </div>

        <!-- Error Alert -->
        <div *ngIf="errorMessage" class="error-alert">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="username">Tên đăng nhập</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">person</span>
              <input
                id="username"
                type="text"
                [(ngModel)]="username"
                name="username"
                placeholder="Nhập tên đăng nhập..."
                required
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Mật khẩu</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">lock</span>
              <input
                id="password"
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="Nhập mật khẩu..."
                required
                autocomplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="loading || !username || !password"
          >
            <span *ngIf="loading" class="material-symbols-outlined spin">progress_activity</span>
            <span>{{ loading ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống' }}</span>
          </button>
        </form>

        <!-- Quick Demo Accounts -->
        <div class="quick-demo-section">
          <div class="divider">
            <span>Tài khoản trải nghiệm nhanh</span>
          </div>

          <div class="demo-buttons-grid">
            <button
              type="button"
              class="btn-demo demo-admin"
              (click)="fillCredentials('admin', '123456')"
            >
              <span class="demo-role">👑 Quản Trị Viên</span>
              <span class="demo-user">admin</span>
            </button>

            <button
              type="button"
              class="btn-demo demo-manager"
              (click)="fillCredentials('manager', '123456')"
            >
              <span class="demo-role">💼 Quản Lý</span>
              <span class="demo-user">manager</span>
            </button>

            <button
              type="button"
              class="btn-demo demo-waiter"
              (click)="fillCredentials('waiter1', '123456')"
            >
              <span class="demo-role">🍽️ Phục Vụ</span>
              <span class="demo-user">waiter1</span>
            </button>

            <button
              type="button"
              class="btn-demo demo-chef"
              (click)="fillCredentials('chef1', '123456')"
            >
              <span class="demo-role">👨‍🍳 Bếp Trưởng</span>
              <span class="demo-user">chef1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 10%, #e0f2fe 0%, #f8fafc 60%);
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      padding: 36px 32px;
      box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
      border: 1px solid var(--border-light);
    }

    .card-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .brand-logo {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary), #0f766e);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 16px var(--primary-glow);
    }

    .brand-logo .material-symbols-outlined {
      font-size: 30px;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      margin-bottom: 20px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--navy);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      font-size: 20px;
    }

    .input-wrapper input {
      width: 100%;
      height: 44px;
      padding: 0 14px 0 40px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      background: var(--bg-app);
      font-size: 0.875rem;
      color: var(--text-primary);
      transition: all 0.15s;
    }

    .input-wrapper input:focus {
      outline: none;
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .btn-submit {
      margin-top: 8px;
      height: 46px;
      border-radius: var(--radius-md);
      background: var(--primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.9375rem;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
      box-shadow: 0 4px 12px var(--primary-glow);
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .quick-demo-section {
      margin-top: 28px;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin-bottom: 16px;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-light);
    }

    .divider span {
      padding: 0 10px;
    }

    .demo-buttons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .btn-demo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      background: var(--bg-app);
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }

    .btn-demo:hover {
      background: #ffffff;
      border-color: var(--primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .demo-role {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--navy);
    }

    .demo-user {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  fillCredentials(u: string, p: string) {
    this.username = u;
    this.password = p;
    this.errorMessage = '';
  }

  onSubmit() {
    if (!this.username || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        const target = this.authService.getDefaultWorkspace();
        this.router.navigate([target]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!';
      }
    });
  }
}

