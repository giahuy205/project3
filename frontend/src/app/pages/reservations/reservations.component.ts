import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reservations-page">
      <div class="coming-soon-container">
        <!-- Badge -->
        <div class="status-badge">
          <span class="dot"></span>
          <span>Tính năng sẽ được hoàn thiện sau</span>
        </div>

        <!-- Main Visual Icon -->
        <div class="icon-bubble">
          <span class="material-symbols-outlined icon-main">event_available</span>
        </div>

        <h1 class="page-title">Sổ Quản Lý Đặt Bàn Trước (Reservations)</h1>
        <p class="page-desc">
          Phân hệ tiếp nhận yêu cầu đặt chỗ trực tuyến từ website, gán bàn theo khung giờ và gửi thông báo xác nhận tự động đang trong lộ trình phát triển theo kế hoạch đồ án.
        </p>

        <!-- Feature Roadmap Preview -->
        <div class="roadmap-grid">
          <div class="roadmap-card">
            <div class="card-icon">
              <span class="material-symbols-outlined">public</span>
            </div>
            <h4>Tiếp Nhận Booking Online</h4>
            <p>Khách hàng đặt chỗ từ cổng Website, chọn chi nhánh, ngày giờ và số lượng khách.</p>
          </div>

          <div class="roadmap-card">
            <div class="card-icon">
              <span class="material-symbols-outlined">auto_schedule</span>
            </div>
            <h4>Xếp Bàn Thông Minh</h4>
            <p>Thuật toán kiểm tra khung giờ và tự động gợi ý bàn trống phù hợp với quy mô đoàn khách.</p>
          </div>

          <div class="roadmap-card">
            <div class="card-icon">
              <span class="material-symbols-outlined">how_to_reg</span>
            </div>
            <h4>Check-in Nhanh Chóng</h4>
            <p>Chuyển đổi một chạm từ lịch hẹn sang trạng thái bàn Có Khách ngay khi khách đến quán.</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions-row">
          <button class="btn-back" (click)="goToMap()">
            <span class="material-symbols-outlined">table_restaurant</span>
            <span>Quay Về Sơ Đồ Bàn Ăn</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reservations-page {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      background: var(--bg-app);
      min-height: calc(100vh - 60px);
    }

    .coming-soon-container {
      max-width: 820px;
      width: 100%;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      padding: 48px 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #b45309;
      font-size: 0.8125rem;
      font-weight: 700;
      margin-bottom: 24px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.15); }
    }

    .icon-bubble {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .icon-main {
      font-size: 42px;
      color: #2563eb;
    }

    .page-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--navy);
      margin: 0 0 10px;
    }

    .page-desc {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      max-width: 600px;
      line-height: 1.5;
      margin: 0 0 36px;
    }

    .roadmap-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      width: 100%;
      margin-bottom: 36px;
      text-align: left;
    }

    @media (max-width: 768px) {
      .roadmap-grid {
        grid-template-columns: 1fr;
      }
    }

    .roadmap-card {
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 20px;
      transition: all 0.2s;
    }

    .roadmap-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
      border-color: #cbd5e1;
    }

    .card-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: #ffffff;
      border: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      margin-bottom: 12px;
    }

    .roadmap-card h4 {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--navy);
      margin: 0 0 6px;
    }

    .roadmap-card p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0;
    }

    .actions-row {
      display: flex;
      gap: 12px;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: var(--radius-md);
      background: var(--primary);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-back:hover {
      background: #0f766e;
      transform: translateY(-1px);
    }
  `]
})
export class ReservationsComponent {
  private router = inject(Router);

  goToMap(): void {
    this.router.navigate(['/waiter']);
  }
}
