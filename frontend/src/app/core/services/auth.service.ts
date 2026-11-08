import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiResponse, Role, User } from '../models/restaurant.models';

interface LoginResponseData {
  token: string;
  type: string;
  id: number;
  username: string;
  fullName: string;
  role: Role;
  branchId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(this.loadUserFromStorage());

  cleanFullName(name: string | null | undefined): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  login(credentials: { username: string; password: string }): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>('/api/auth/login', credentials).pipe(
      tap(res => {
        if (res && res.success && res.data) {
          const data = res.data;
          localStorage.setItem('auth_token', data.token);
          const user: User = {
            id: data.id,
            username: data.username,
            fullName: this.cleanFullName(data.fullName),
            role: data.role,
            branchId: data.branchId
          };
          localStorage.setItem('auth_user', JSON.stringify(user));
          this.currentUser.set(user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUser(): User | null {
    return this.currentUser();
  }

  getRole(): Role | null {
    return this.currentUser()?.role || null;
  }

  hasRole(allowedRoles: Role[]): boolean {
    const role = this.getRole();
    return !!role && allowedRoles.includes(role);
  }

  getDefaultWorkspace(): string {
    const role = this.getRole();
    switch (role) {
      case 'ROLE_CHEF':
        return '/kitchen';
      case 'ROLE_STAFF':
        return '/waiter';
      case 'ROLE_ADMIN':
      case 'ROLE_MANAGER':
        return '/waiter'; // Admin/Manager can switch between all workspaces
      default:
        return '/login';
    }
  }

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem('auth_user');
      if (!raw) return null;
      const u = JSON.parse(raw);
      if (u && u.fullName) {
        u.fullName = this.cleanFullName(u.fullName);
      }
      return u;
    } catch {
      return null;
    }
  }
}

