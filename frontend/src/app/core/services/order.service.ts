import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Order } from '../models/restaurant.models';

export interface OpenTableDto {
  tableId: number;
  guestCount: number;
  note?: string;
  customerId?: number;
}

export interface AddOrderItemDto {
  dishId: number;
  quantity: number;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);

  openTable(dto: OpenTableDto): Observable<Order> {
    return this.http.post<ApiResponse<Order>>('/api/orders/open-table', dto).pipe(
      map(res => res.data)
    );
  }

  getActiveOrderByTable(tableId: number): Observable<Order | null> {
    return this.http.get<ApiResponse<Order>>(`/api/orders/by-table/${tableId}`).pipe(
      map(res => res.data || null)
    );
  }

  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`/api/orders/${orderId}`).pipe(
      map(res => res.data)
    );
  }

  addItemsToOrder(orderId: number, items: AddOrderItemDto[]): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(`/api/orders/${orderId}/items`, { items }).pipe(
      map(res => res.data)
    );
  }

  changeTable(orderId: number, newTableId: number, reason?: string): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`/api/orders/${orderId}/change-table`, { newTableId, reason }).pipe(
      map(res => res.data)
    );
  }

  cancelItem(orderId: number, itemId: number, reason: string): Observable<Order> {
    return this.http.patch<ApiResponse<Order>>(`/api/orders/${orderId}/items/${itemId}/cancel`, { cancelReason: reason }).pipe(
      map(res => res.data)
    );
  }

  cancelOrder(orderId: number, reason: string = 'Nhân viên mở nhầm bàn'): Observable<void> {
    return this.http.post<ApiResponse<void>>(`/api/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`, {}).pipe(
      map(() => void 0)
    );
  }

  cancelOrderByTableId(tableId: number, reason: string = 'Nhân viên mở nhầm bàn'): Observable<void> {
    return this.http.post<ApiResponse<void>>(`/api/orders/by-table/${tableId}/cancel?reason=${encodeURIComponent(reason)}`, {}).pipe(
      map(() => void 0)
    );
  }

  getActiveOrders(branchId: number = 1): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(`/api/orders/active?branchId=${branchId}`).pipe(
      map(res => res.data || [])
    );
  }
}

