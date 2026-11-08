import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Order } from '../models/restaurant.models';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Reservation {
  id: number;
  branchId: number;
  branchName?: string;
  tableId?: number;
  tableNumber?: string;
  areaName?: string;
  customerName: string;
  phone: string;
  guestCount: number;
  reservationTime: string;
  depositAmount: number;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
}

export interface CreateReservationDto {
  branchId?: number;
  customerName: string;
  phone: string;
  guestCount: number;
  reservationTime: string; // ISO 8601 string
  tableId?: number;
  depositAmount?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private http = inject(HttpClient);

  getReservations(status?: ReservationStatus, branchId: number = 1): Observable<Reservation[]> {
    let url = `/api/reservations?branchId=${branchId}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.http.get<ApiResponse<Reservation[]>>(url).pipe(
      map(res => res.data || [])
    );
  }

  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<ApiResponse<Reservation>>(`/api/reservations/${id}`).pipe(
      map(res => res.data)
    );
  }

  createReservation(dto: CreateReservationDto): Observable<Reservation> {
    return this.http.post<ApiResponse<Reservation>>('/api/reservations', dto).pipe(
      map(res => res.data)
    );
  }

  publicBooking(dto: CreateReservationDto): Observable<Reservation> {
    return this.http.post<ApiResponse<Reservation>>('/api/reservations/public', dto).pipe(
      map(res => res.data)
    );
  }

  confirmReservation(id: number, tableId?: number): Observable<Reservation> {
    let url = `/api/reservations/${id}/confirm`;
    if (tableId) {
      url += `?tableId=${tableId}`;
    }
    return this.http.patch<ApiResponse<Reservation>>(url, {}).pipe(
      map(res => res.data)
    );
  }

  cancelReservation(id: number, reason?: string): Observable<Reservation> {
    let url = `/api/reservations/${id}/cancel`;
    if (reason) {
      url += `?reason=${encodeURIComponent(reason)}`;
    }
    return this.http.patch<ApiResponse<Reservation>>(url, {}).pipe(
      map(res => res.data)
    );
  }

  checkInReservation(id: number): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(`/api/reservations/${id}/check-in`, {}).pipe(
      map(res => res.data)
    );
  }
}

