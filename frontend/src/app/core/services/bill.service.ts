import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/restaurant.models';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'MOMO' | 'VNPAY';

export interface BillPreview {
  orderId: number;
  orderCode: string;
  tableName: string;
  guestCount: number;
  subtotal: number;
  voucherDiscount: number;
  voucherCode?: string;
  pointsUsed: number;
  pointsDiscount: number;
  vatRate: number;
  vatAmount: number;
  finalAmount: number;
  pointsEarned: number;
  customerName?: string;
  customerCurrentPoints: number;
}

export interface CheckoutRequest {
  orderId: number;
  customerPhone?: string;
  voucherCode?: string;
  pointsToUse?: number;
  paymentMethod: PaymentMethod;
  receivedAmount?: number;
  note?: string;
}

export interface BillResponse {
  id: number;
  billCode: string;
  orderId: number;
  orderCode: string;
  tableName: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  voucherCode?: string;
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointsDiscount: number;
  vatRate: number;
  vatAmount: number;
  finalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillService {
  private http = inject(HttpClient);

  previewBill(orderId: number, voucherCode?: string, customerPhone?: string, pointsToUse?: number): Observable<BillPreview> {
    let url = `/api/bills/preview?orderId=${orderId}`;
    if (voucherCode) url += `&voucherCode=${encodeURIComponent(voucherCode)}`;
    if (customerPhone) url += `&customerPhone=${encodeURIComponent(customerPhone)}`;
    if (pointsToUse) url += `&pointsToUse=${pointsToUse}`;

    return this.http.get<ApiResponse<BillPreview>>(url).pipe(
      map(res => res.data)
    );
  }

  checkout(request: CheckoutRequest): Observable<BillResponse> {
    return this.http.post<ApiResponse<BillResponse>>('/api/bills/checkout', request).pipe(
      map(res => res.data)
    );
  }

  getAllBills(): Observable<BillResponse[]> {
    return this.http.get<ApiResponse<BillResponse[]>>('/api/bills').pipe(
      map(res => res.data || [])
    );
  }

  getBillById(id: number): Observable<BillResponse> {
    return this.http.get<ApiResponse<BillResponse>>(`/api/bills/${id}`).pipe(
      map(res => res.data)
    );
  }
}

