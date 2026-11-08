import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { ApiResponse, Area, DiningTable, TableStatus } from '../models/restaurant.models';

export interface AreaWithTables extends Area {
  tables: DiningTable[];
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);

  private cachedAreas: AreaWithTables[] | null = null;

  getAreasWithTables(branchId: number = 1, forceRefresh = false): Observable<AreaWithTables[]> {
    if (!forceRefresh && this.cachedAreas) {
      return of(this.cachedAreas);
    }
    return this.http.get<ApiResponse<AreaWithTables[]>>(`/api/tables/areas?branchId=${branchId}`).pipe(
      map(res => res.data || []),
      tap(areas => this.cachedAreas = areas)
    );
  }

  clearCache(): void {
    this.cachedAreas = null;
  }

  getAllTables(branchId: number = 1): Observable<DiningTable[]> {
    return this.http.get<ApiResponse<DiningTable[]>>(`/api/tables?branchId=${branchId}`).pipe(
      map(res => res.data || [])
    );
  }

  getTableById(id: number): Observable<DiningTable> {
    return this.http.get<ApiResponse<DiningTable>>(`/api/tables/${id}`).pipe(
      map(res => res.data)
    );
  }

  updateTableStatus(id: number, status: TableStatus): Observable<DiningTable> {
    return this.http.patch<ApiResponse<DiningTable>>(`/api/tables/${id}/status?status=${status}`, {}).pipe(
      map(res => res.data),
      tap(tbl => {
        if (this.cachedAreas && tbl) {
          for (const a of this.cachedAreas) {
            const idx = a.tables.findIndex(t => t.id === tbl.id);
            if (idx >= 0) {
              a.tables[idx].status = tbl.status;
            }
          }
        }
      })
    );
  }

  createTable(table: Partial<DiningTable>): Observable<DiningTable> {
    return this.http.post<ApiResponse<DiningTable>>('/api/tables', table).pipe(
      map(res => res.data),
      tap(() => this.clearCache())
    );
  }

  updateTable(id: number, table: Partial<DiningTable>): Observable<DiningTable> {
    return this.http.put<ApiResponse<DiningTable>>(`/api/tables/${id}`, table).pipe(
      map(res => res.data),
      tap(() => this.clearCache())
    );
  }

  deleteTable(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`/api/tables/${id}`).pipe(
      map(() => void 0),
      tap(() => this.clearCache())
    );
  }

  createArea(name: string, branchId: number = 1): Observable<Area> {
    return this.http.post<ApiResponse<Area>>('/api/tables/areas', { branchId, name }).pipe(
      map(res => res.data),
      tap(() => this.clearCache())
    );
  }
}

