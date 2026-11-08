import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TopbarComponent } from './components/topbar/topbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <!-- Case 1: Public Routes (Login, Public Customer Booking) -->
    <div *ngIf="isPublicRoute; else authenticatedLayout">
      <router-outlet></router-outlet>
    </div>

    <!-- Case 2: Authenticated Workspaces -->
    <ng-template #authenticatedLayout>
      <!-- Sub-case A: Kitchen Chef (Dedicated Fullscreen KDS without double header) -->
      <div *ngIf="isKitchenLayout; else standardLayout" class="app-fullscreen-kds">
        <router-outlet></router-outlet>
      </div>

      <!-- Sub-case B: Admin, Manager, Staff (Modern Sidebar + Workspace) -->
      <ng-template #standardLayout>
        <div class="app-sidebar-layout">
          <app-sidebar></app-sidebar>
          <div class="app-main-area">
            <app-topbar></app-topbar>
            <main class="app-workspace-body">
              <router-outlet></router-outlet>
            </main>
          </div>
        </div>
      </ng-template>
    </ng-template>
  `,
  styles: [`
    .app-fullscreen-kds {
      width: 100vw;
      height: 100vh;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #0f172a;
      overflow: hidden;
    }

    .app-sidebar-layout {
      min-height: 100vh;
      display: flex;
      background-color: var(--bg-app);
    }

    .app-main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
      overflow: hidden;
    }

    .app-workspace-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      min-height: 0;
    }
  `]
})
export class AppComponent {
  isPublicRoute = false;
  currentUrl = '';
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    this.currentUrl = this.router.url;
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.urlAfterRedirects;
      this.isPublicRoute = this.currentUrl.includes('/login') || this.currentUrl.includes('/booking');
    });
  }

  get isChef(): boolean {
    return this.authService.getRole() === 'ROLE_CHEF';
  }

  get isKitchenLayout(): boolean {
    return this.isChef || this.currentUrl.includes('/kitchen');
  }
}
