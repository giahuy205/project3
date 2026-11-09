import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { WaiterComponent } from './pages/waiter.component';
import { KitchenComponent } from './pages/kitchen.component';
import { AdminComponent } from './pages/admin.component';
import { CheckoutComponent } from './pages/checkout.component';
import { ReadyItemsComponent } from './pages/ready-items.component';
import { ReservationsComponent } from './pages/reservations.component';
import { BookingComponent } from './pages/booking.component';
import { ProfileComponent } from './pages/profile.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'booking',
    component: BookingComponent
  },
  {
    path: 'reservations',
    component: ReservationsComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'waiter',
    component: WaiterComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'ready-items',
    component: ReadyItemsComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'kitchen',
    component: KitchenComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_CHEF'] }
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] }
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
