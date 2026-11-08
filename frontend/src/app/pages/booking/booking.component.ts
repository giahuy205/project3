import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReservationService, Reservation, CreateReservationDto } from '../../core/services/reservation.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="booking-page">
      <!-- Public Header Banner -->
      <header class="public-header">
        <div class="header-inner">
          <div class="brand">
            <div class="brand-logo">
              <span class="material-symbols-outlined">restaurant</span>
            </div>
            <div>
              <h1 class="brand-name">Nhà hàng Nom Nom</h1>
              <p class="brand-sub">Ẩm thực tinh hoa • Không gian sang trọng • Trải nghiệm đẳng cấp</p>
            </div>
          </div>
          <div class="header-contact">
            <div class="contact-pill">
              <span class="material-symbols-outlined">call</span>
              <span>Hotline đặt chỗ: <b>1900 6868</b></span>
            </div>
            <a routerLink="/login" class="btn-staff-login">
              <span class="material-symbols-outlined">lock</span>
              <span>Cổng Quản Trị (Nom Nom Hub)</span>
            </a>
          </div>
        </div>
      </header>

      <!-- Main Booking Container -->
      <main class="booking-main">
        <div class="booking-card">
          <!-- State 1: Form Booking -->
          <div *ngIf="!bookingSuccess" class="form-container">
            <div class="card-hero">
              <span class="badge-online">Đặt Bàn Trực Tuyến 24/7</span>
              <h2>Đặt Bàn Giữ Chỗ Trước</h2>
              <p>Quý khách vui lòng điền thông tin để Nhà hàng Nom Nom chuẩn bị chu đáo nhất.</p>
            </div>

            <form (ngSubmit)="submitBooking()" #bookingForm="ngForm" class="booking-form">
              <!-- Name & Phone -->
              <div class="form-row">
                <div class="form-group">
                  <label for="cname">
                    <span class="material-symbols-outlined label-icon">person</span>
                    Họ và tên quý khách <span class="req">*</span>
                  </label>
                  <input
                    id="cname"
                    type="text"
                    [(ngModel)]="formData.customerName"
                    name="customerName"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label for="cphone">
                    <span class="material-symbols-outlined label-icon">phone</span>
                    Số điện thoại liên hệ <span class="req">*</span>
                  </label>
                  <input
                    id="cphone"
                    type="tel"
                    [(ngModel)]="formData.phone"
                    name="phone"
                    required
                    placeholder="VD: 0912345678"
                    class="form-control"
                  />
                </div>
              </div>

              <!-- Guest Count & Date/Time -->
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <span class="material-symbols-outlined label-icon">groups</span>
                    Số lượng khách <span class="req">*</span>
                  </label>
                  <div class="guest-selector">
                    <button
                      type="button"
                      class="btn-counter"
                      (click)="changeGuests(-1)"
                      [disabled]="formData.guestCount <= 1"
                    >
                      <span class="material-symbols-outlined">remove</span>
                    </button>
                    <span class="guest-number">{{ formData.guestCount }} khách</span>
                    <button
                      type="button"
                      class="btn-counter"
                      (click)="changeGuests(1)"
                      [disabled]="formData.guestCount >= 50"
                    >
                      <span class="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label for="ctime">
                    <span class="material-symbols-outlined label-icon">schedule</span>
                    Thời gian đến nhà hàng <span class="req">*</span>
                  </label>
                  <input
                    id="ctime"
                    type="datetime-local"
                    [(ngModel)]="bookingDateTime"
                    name="bookingDateTime"
                    required
                    [min]="minDateTime"
                    class="form-control"
                  />
                </div>
              </div>

              <!-- Notes / Special Requests -->
              <div class="form-group">
                <label for="cnotes">
                  <span class="material-symbols-outlined label-icon">edit_note</span>
                  Yêu cầu đặc biệt (Tùy chọn)
                </label>
                <textarea
                  id="cnotes"
                  [(ngModel)]="formData.notes"
                  name="notes"
                  rows="3"
                  placeholder="VD: Bàn gần cửa sổ, tiệc sinh nhật cần trang trí nến, mang theo bánh kem..."
                  class="form-control"
                ></textarea>
              </div>

              <!-- Branch Notice -->
              <div class="info-alert">
                <span class="material-symbols-outlined">info</span>
                <span>Địa điểm phục vụ: <b>Nhà hàng Nom Nom (Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội)</b>. Quý khách vui lòng đến đúng giờ để được giữ bàn trọn vẹn.</span>
              </div>

              <!-- Error Alert -->
              <div *ngIf="errorMessage" class="error-alert">
                <span class="material-symbols-outlined">error</span>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Submit Button -->
              <div class="form-actions">
                <button
                  type="submit"
                  class="btn-submit"
                  [disabled]="isSubmitting || !formData.customerName || !formData.phone || !bookingDateTime"
                >
                  <span class="material-symbols-outlined" *ngIf="!isSubmitting">check_circle</span>
                  <span class="spinner" *ngIf="isSubmitting"></span>
                  <span>{{ isSubmitting ? 'Đang gửi yêu cầu đặt bàn...' : 'Xác Nhận Đặt Bàn Ngay' }}</span>
                </button>
              </div>
            </form>
          </div>

          <!-- State 2: Success Confirmation Card -->
          <div *ngIf="bookingSuccess && createdReservation" class="success-container">
            <div class="success-icon-wrap">
              <span class="material-symbols-outlined">task_alt</span>
            </div>
            <h2>Đặt Bàn Thành Công!</h2>
            <p class="success-desc">
              Cảm ơn quý khách <b>{{ createdReservation.customerName }}</b> đã tin chọn Nhà hàng Nom Nom!
            </p>

            <div class="ticket-card">
              <div class="ticket-row">
                <span class="t-label">Mã đặt bàn:</span>
                <span class="t-value highlight">#RES-{{ createdReservation.id }}</span>
              </div>
              <div class="ticket-row">
                <span class="t-label">Số điện thoại:</span>
                <span class="t-value">{{ createdReservation.phone }}</span>
              </div>
              <div class="ticket-row">
                <span class="t-label">Số lượng khách:</span>
                <span class="t-value">{{ createdReservation.guestCount }} người</span>
              </div>
              <div class="ticket-row">
                <span class="t-label">Thời gian hẹn:</span>
                <span class="t-value bold">{{ createdReservation.reservationTime | date:'HH:mm - dd/MM/yyyy' }}</span>
              </div>
              <div class="ticket-row" *ngIf="createdReservation.notes">
                <span class="t-label">Ghi chú:</span>
                <span class="t-value">{{ createdReservation.notes }}</span>
              </div>
              <div class="ticket-row">
                <span class="t-label">Trạng thái:</span>
                <span class="status-pill sp-pending">Chờ Nhà Hàng Xác Nhận</span>
              </div>
            </div>

            <div class="success-notice">
              <p>Nhân viên chăm sóc khách hàng của Nhà hàng Nom Nom sẽ liên hệ qua số <b>{{ createdReservation.phone }}</b> trong ít phút để xác nhận vị trí bàn ăn đẹp nhất cho quý khách.</p>
            </div>

            <div class="success-actions">
              <button class="btn-new-booking" (click)="resetForm()">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Đặt thêm bàn khác</span>
              </button>
              <a href="tel:19006868" class="btn-call-hotline">
                <span class="material-symbols-outlined">call</span>
                <span>Gọi Hotline Hỗ Trợ (1900 6868)</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <!-- Public Footer -->
      <footer class="public-footer">
        <p>© 2026 Nhà hàng Nom Nom • Vận hành bởi Hệ thống Quản lý Nom Nom Hub.</p>
      </footer>
    </div>
  `,
  styles: [`
    .booking-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d9488 100%);
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #334155;
    }

    .public-header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 24px;
      color: #ffffff;
    }

    .header-inner {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
    }

    .brand-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 2px 0 0;
    }

    .header-contact {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .contact-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .contact-pill b {
      color: #38bdf8;
    }

    .btn-staff-login {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: #0d9488;
      color: #ffffff;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 700;
      transition: all 0.2s;
    }

    .btn-staff-login:hover {
      background: #0f766e;
      transform: translateY(-1px);
    }

    /* MAIN CONTAINER */
    .booking-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }

    .booking-card {
      width: 100%;
      max-width: 680px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .form-container {
      padding: 36px 32px;
    }

    .card-hero {
      text-align: center;
      margin-bottom: 28px;
    }

    .badge-online {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0d9488;
      background: #ccfbf1;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 8px;
    }

    .card-hero h2 {
      font-size: 1.625rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }

    .card-hero p {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    .booking-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #1e293b;
    }

    .label-icon {
      font-size: 18px;
      color: #0d9488;
    }

    .req {
      color: #ef4444;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.9375rem;
      color: #0f172a;
      background: #f8fafc;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #0d9488;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
    }

    .guest-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      padding: 4px;
    }

    .btn-counter {
      width: 36px;
      height: 36px;
      border: none;
      background: #ffffff;
      border-radius: 8px;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: all 0.15s;
    }

    .btn-counter:hover:not(:disabled) {
      background: #0d9488;
      color: #ffffff;
    }

    .btn-counter:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .guest-number {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .info-alert {
      display: flex;
      gap: 10px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.8125rem;
      color: #115e59;
      line-height: 1.4;
    }

    .info-alert .material-symbols-outlined {
      font-size: 20px;
      color: #0d9488;
      flex-shrink: 0;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.875rem;
      color: #b91c1c;
    }

    .btn-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #0d9488, #0f766e);
      color: #ffffff;
      border: none;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 1.0625rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
      transition: all 0.2s;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(13, 148, 136, 0.45);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* SUCCESS STATE */
    .success-container {
      padding: 40px 32px;
      text-align: center;
    }

    .success-icon-wrap {
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      border-radius: 50%;
      background: #d1fae5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-icon-wrap .material-symbols-outlined {
      font-size: 44px;
    }

    .success-container h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }

    .success-desc {
      font-size: 0.9375rem;
      color: #475569;
      margin: 0 0 24px;
    }

    .ticket-card {
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
      text-align: left;
    }

    .ticket-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9375rem;
    }

    .t-label {
      color: #64748b;
    }

    .t-value {
      font-weight: 600;
      color: #0f172a;
    }

    .t-value.highlight {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.125rem;
      font-weight: 800;
      color: #0d9488;
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
    }

    .sp-pending {
      background: #fef3c7;
      color: #b45309;
    }

    .success-notice {
      background: #f1f5f9;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 0.8125rem;
      color: #475569;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .success-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-new-booking {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border: 1.5px solid #0d9488;
      background: #ffffff;
      color: #0d9488;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-new-booking:hover {
      background: #f0fdfa;
    }

    .btn-call-hotline {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 10px;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 700;
      transition: all 0.15s;
    }

    .btn-call-hotline:hover {
      background: #1e293b;
    }

    .public-footer {
      text-align: center;
      padding: 16px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BookingComponent implements OnInit {
  private resService = inject(ReservationService);

  formData: CreateReservationDto = {
    customerName: '',
    phone: '',
    guestCount: 2,
    reservationTime: '',
    notes: '',
    branchId: 1
  };

  bookingDateTime = '';
  minDateTime = '';
  isSubmitting = false;
  bookingSuccess = false;
  errorMessage = '';
  createdReservation: Reservation | null = null;

  ngOnInit(): void {
    // Set min datetime to current time
    const now = new Date();
    // Default booking time is today + 2 hours
    const defaultTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    this.minDateTime = this.formatDateTimeLocal(now);
    this.bookingDateTime = this.formatDateTimeLocal(defaultTime);
  }

  private formatDateTimeLocal(d: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  }

  changeGuests(delta: number): void {
    const next = this.formData.guestCount + delta;
    if (next >= 1 && next <= 50) {
      this.formData.guestCount = next;
    }
  }

  submitBooking(): void {
    if (!this.formData.customerName.trim()) {
      this.errorMessage = 'Vui lòng nhập họ và tên của quý khách.';
      return;
    }
    if (!this.formData.phone.trim()) {
      this.errorMessage = 'Vui lòng nhập số điện thoại để nhà hàng liên hệ xác nhận.';
      return;
    }
    if (!this.bookingDateTime) {
      this.errorMessage = 'Vui lòng chọn ngày và giờ dùng bữa.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Convert local datetime to ISO string
    const isoTime = new Date(this.bookingDateTime).toISOString();
    const payload: CreateReservationDto = {
      ...this.formData,
      reservationTime: isoTime
    };

    this.resService.publicBooking(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.createdReservation = res;
        this.bookingSuccess = true;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Có lỗi xảy ra khi gửi yêu cầu đặt bàn. Quý khách vui lòng thử lại hoặc gọi Hotline 1900 6868!';
      }
    });
  }

  resetForm(): void {
    this.formData = {
      customerName: '',
      phone: '',
      guestCount: 2,
      reservationTime: '',
      notes: '',
      branchId: 1
    };
    const now = new Date();
    const defaultTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    this.bookingDateTime = this.formatDateTimeLocal(defaultTime);
    this.bookingSuccess = false;
    this.createdReservation = null;
    this.errorMessage = '';
  }
}

