import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of, catchError } from 'rxjs';
import { ApiResponse, KitchenQueueItem, KitchenStatus, Station } from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {
  private http = inject(HttpClient);

  getKitchenQueue(station?: Station): Observable<KitchenQueueItem[]> {
    let url = '/api/kitchen/queue';
    if (station) {
      url += `?station=${station}`;
    }
    return this.http.get<ApiResponse<KitchenQueueItem[]>>(url).pipe(
      map(res => res.data || [])
    );
  }

  updateItemStatus(orderItemId: number, status: KitchenStatus): Observable<KitchenQueueItem> {
    return this.http.patch<ApiResponse<KitchenQueueItem>>(`/api/kitchen/items/${orderItemId}/status`, { status }).pipe(
      map(res => res.data)
    );
  }

  updateBatchStatus(orderItemIds: number[], status: KitchenStatus): Observable<KitchenQueueItem[]> {
    if (!orderItemIds || orderItemIds.length === 0) {
      return of([]);
    }
    return this.http.patch<ApiResponse<KitchenQueueItem[]>>('/api/kitchen/items/batch-status', { orderItemIds, status }).pipe(
      map(res => res.data || []),
      catchError(() => {
        // Fallback: nếu endpoint batch-status chưa được cập nhật, cập nhật song song từng món
        return forkJoin(orderItemIds.map(id => this.updateItemStatus(id, status)));
      })
    );
  }

  resolveCancelRequest(orderItemId: number, accepted: boolean): Observable<KitchenQueueItem> {
    return this.http.post<ApiResponse<KitchenQueueItem>>(`/api/kitchen/items/${orderItemId}/resolve-cancel?accepted=${accepted}`, {}).pipe(
      map(res => res.data)
    );
  }
}

