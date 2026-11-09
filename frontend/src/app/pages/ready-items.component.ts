import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenService } from '../core/services/kitchen.service';
import { KitchenQueueItem } from '../core/models/restaurant.models';

@Component({
  selector: 'app-ready-items',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ready-items-page">
      <div class="header-bar">
        <div>
          <h2>Món Đã Nấu Xong — Chờ Phục Vụ Ra Bàn</h2>
          <p class="sub">Danh sách món ăn Bếp vừa chế biến xong (READY), nhân viên cần mang tới bàn cho khách ngay để giữ độ nóng ngon</p>
        </div>
        <button class="btn btn-primary" (click)="loadReadyItems()">
          <span class="material-symbols-outlined">refresh</span>
          <span>Làm mới</span>
        </button>
      </div>

      <div class="ready-grid">
        <div *ngFor="let item of readyItems" class="ready-card">
          <div class="card-header">
            <span class="table-name">{{ item.tableName }}</span>
            <span class="order-code">{{ item.orderCode }}</span>
          </div>

          <div class="dish-detail">
            <span class="dish-qty">{{ item.quantity }}x</span>
            <span class="dish-name">{{ item.dishName }}</span>
          </div>

          <div *ngIf="item.note" class="dish-note">
            ⚠️ Ghi chú: {{ item.note }}
          </div>

          <div class="card-footer">
            <span class="station-tag">{{ item.station }}</span>
            <button class="btn btn-primary btn-served" (click)="markAsServed(item)">
              <span class="material-symbols-outlined">check</span>
              <span>Đã Bưng Ra Bàn</span>
            </button>
          </div>
        </div>

        <div *ngIf="readyItems.length === 0" class="empty-state">
          <span class="material-symbols-outlined empty-icon">sentiment_satisfied</span>
          <h3>Không có món nào đang chờ phục vụ</h3>
          <p>Tất cả các món nấu xong đã được mang ra bàn cho thực khách!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ready-items-page {
      padding: 24px 32px;
      height: calc(100vh - 64px);
      overflow-y: auto;
      background: var(--bg-app);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 20px 24px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
    }

    .header-bar h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--navy);
      margin-bottom: 4px;
    }

    .sub {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .ready-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .ready-card {
      background: #ffffff;
      border: 2px solid #a7f3d0;
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.1);
      background: linear-gradient(180deg, #ffffff 60%, #ecfdf5 100%);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: #065f46;
    }

    .order-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .dish-detail {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .dish-qty {
      font-size: 1.35rem;
      font-weight: 900;
      color: var(--primary);
    }

    .dish-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--navy);
    }

    .dish-note {
      font-size: 0.8125rem;
      color: #b45309;
      background: #fef3c7;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      border-top: 1px dashed #a7f3d0;
      padding-top: 10px;
    }

    .station-tag {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .btn-served {
      background: #10b981;
      border-color: #10b981;
      font-weight: 700;
    }

    .btn-served:hover {
      background: #059669;
    }

    .empty-state {
      grid-column: 1 / -1;
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 64px;
      color: #10b981;
      margin-bottom: 12px;
    }
  `]
})
export class ReadyItemsComponent implements OnInit, OnDestroy {
  private kitchenService = inject(KitchenService);

  readyItems: KitchenQueueItem[] = [];
  private intervalId: any = null;

  ngOnInit(): void {
    this.loadReadyItems();
    this.intervalId = setInterval(() => this.loadReadyItems(), 4000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadReadyItems(): void {
    this.kitchenService.getKitchenQueue().subscribe(items => {
      this.readyItems = items.filter(i => i.kitchenStatus === 'READY');
    });
  }

  markAsServed(item: KitchenQueueItem): void {
    const targetId = item.itemId || item.orderItemId || item.id;
    if (!targetId) return;
    this.kitchenService.updateItemStatus(targetId, 'SERVED').subscribe({
      next: () => {
        this.loadReadyItems();
      },
      error: () => alert('Lỗi khi cập nhật trạng thái món!')
    });
  }
}

