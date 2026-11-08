import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { ApiResponse, Category, Dish, DishStatus } from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);

  private cachedCategories: Category[] | null = null;
  private cachedDishes: Dish[] | null = null;

  getCategories(forceRefresh = false): Observable<Category[]> {
    if (!forceRefresh && this.cachedCategories) {
      return of(this.cachedCategories);
    }
    return this.http.get<ApiResponse<Category[]>>('/api/menu/categories').pipe(
      map(res => res.data || []),
      tap(cats => this.cachedCategories = cats)
    );
  }

  getDishes(categoryId?: number, availableOnly?: boolean, forceRefresh = false): Observable<Dish[]> {
    if (!forceRefresh && !categoryId && availableOnly === undefined && this.cachedDishes) {
      return of(this.cachedDishes);
    }
    let url = '/api/menu/dishes';
    const params: string[] = [];
    if (categoryId) params.push(`categoryId=${categoryId}`);
    if (availableOnly !== undefined) params.push(`availableOnly=${availableOnly}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.get<ApiResponse<Dish[]>>(url).pipe(
      map(res => res.data || []),
      tap(dishes => {
        if (!categoryId && availableOnly === undefined) {
          this.cachedDishes = dishes;
        }
      })
    );
  }

  clearCache(): void {
    this.cachedCategories = null;
    this.cachedDishes = null;
  }

  toggleDishAvailability(dishId: number): Observable<Dish> {
    return this.http.patch<ApiResponse<Dish>>(`/api/menu/dishes/${dishId}/toggle-availability`, {}).pipe(
      map(res => res.data),
      tap(dish => {
        if (this.cachedDishes && dish) {
          const idx = this.cachedDishes.findIndex(d => d.id === dish.id);
          if (idx >= 0) this.cachedDishes[idx] = dish;
        }
      })
    );
  }

  updateDishStatus(dishId: number, status: DishStatus): Observable<Dish> {
    return this.http.patch<ApiResponse<Dish>>(`/api/menu/dishes/${dishId}/status?status=${status}`, {}).pipe(
      map(res => res.data),
      tap(dish => {
        if (this.cachedDishes && dish) {
          const idx = this.cachedDishes.findIndex(d => d.id === dish.id);
          if (idx >= 0) this.cachedDishes[idx] = dish;
        }
      })
    );
  }

  createDish(dish: Partial<Dish>): Observable<Dish> {
    return this.http.post<ApiResponse<Dish>>('/api/menu/dishes', dish).pipe(
      map(res => res.data),
      tap(() => this.clearCache())
    );
  }

  updateDish(id: number, dish: Partial<Dish>): Observable<Dish> {
    return this.http.put<ApiResponse<Dish>>(`/api/menu/dishes/${id}`, dish).pipe(
      map(res => res.data),
      tap(() => this.clearCache())
    );
  }

  deleteDish(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`/api/menu/dishes/${id}`).pipe(
      map(() => undefined),
      tap(() => this.clearCache())
    );
  }
}

