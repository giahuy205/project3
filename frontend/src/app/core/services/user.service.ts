import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  Role
} from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  getUsers(filters?: { search?: string; role?: Role; isActive?: boolean; branchId?: number }): Observable<UserResponse[]> {
    let params = new HttpParams();
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.isActive !== undefined && filters?.isActive !== null) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters?.branchId) {
      params = params.set('branchId', filters.branchId.toString());
    }

    return this.http.get<ApiResponse<UserResponse[]>>('/api/users', { params }).pipe(
      map(res => res.data || [])
    );
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<ApiResponse<UserResponse>>(`/api/users/${id}`).pipe(
      map(res => res.data)
    );
  }

  createUser(req: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<ApiResponse<UserResponse>>('/api/users', req).pipe(
      map(res => res.data)
    );
  }

  updateUser(id: number, req: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<ApiResponse<UserResponse>>(`/api/users/${id}`, req).pipe(
      map(res => res.data)
    );
  }

  toggleUserStatus(id: number, isActive: boolean): Observable<void> {
    return this.http.put<ApiResponse<void>>(`/api/users/${id}/status`, { isActive }).pipe(
      map(() => void 0)
    );
  }

  resetPassword(id: number, req: ResetPasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<void>>(`/api/users/${id}/reset-password`, req).pipe(
      map(() => void 0)
    );
  }

  getCurrentProfile(): Observable<UserResponse> {
    return this.http.get<ApiResponse<UserResponse>>('/api/users/profile').pipe(
      map(res => res.data)
    );
  }

  updateCurrentProfile(req: UpdateProfileRequest): Observable<UserResponse> {
    return this.http.put<ApiResponse<UserResponse>>('/api/users/profile', req).pipe(
      map(res => res.data)
    );
  }

  changePassword(req: ChangePasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<void>>('/api/users/change-password', req).pipe(
      map(() => void 0)
    );
  }
}

