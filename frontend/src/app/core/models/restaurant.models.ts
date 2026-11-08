export type Role = 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_STAFF' | 'ROLE_CHEF';

export type TableStatus = 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';

export type DishStatus = 'AVAILABLE' | 'SUSPENDED' | 'OUT_OF_STOCK';

export type OrderStatus = 'PENDING' | 'SERVING' | 'PAID' | 'COMPLETED' | 'CANCELLED';

export type KitchenStatus = 'PENDING' | 'COOKING' | 'CANCEL_REQUESTED' | 'READY' | 'SERVED' | 'CANCELLED';

export type Station = 'KITCHEN_HOT' | 'KITCHEN_COLD' | 'GRILL' | 'BAR';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  branchId?: number;
  avatar?: string;
}

export interface Area {
  id: number;
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface DiningTable {
  id: number;
  tableNumber: string;
  name?: string;
  code?: string;
  capacity: number;
  status: TableStatus;
  areaId: number;
  areaName?: string;
  currentOrderId?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface Dish {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  code?: string;
  price: number;
  unit?: string;
  imageUrl?: string;
  description?: string;
  station: Station;
  preparationTime?: number;
  estimatedPrepTime?: number; // minutes
  isAvailable: boolean;
  status?: DishStatus;
}

export interface OrderItem {
  id: number;
  orderId: number;
  dishId: number;
  dishName: string;
  dishCode?: string;
  dishImageUrl?: string;
  quantity: number;
  priceAtOrder: number;
  totalAmount?: number;
  totalPrice?: number;
  note?: string;
  notes?: string;
  kitchenStatus: KitchenStatus;
  station: Station;
  estimatedPrepTime?: number;
  orderedAt?: string;
}

export interface Order {
  id: number;
  orderCode: string;
  tableId: number;
  tableName: string;
  tableNumber?: string;
  areaName?: string;
  userId?: number;
  staffName?: string;
  guestCount: number;
  note?: string;
  notes?: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount?: number;
  vatAmount: number;
  totalAmount: number;
  items: OrderItem[];
  openedAt?: string;
  createdAt?: string;
}

export interface KitchenQueueItem {
  id?: number;
  itemId?: number;
  orderItemId?: number;
  orderId: number;
  orderCode: string;
  tableId?: number;
  tableName?: string;
  tableNumber?: string;
  areaName?: string;
  dishId: number;
  dishName: string;
  dishImageUrl?: string;
  quantity: number;
  note?: string;
  notes?: string;
  kitchenStatus: KitchenStatus;
  station: Station;
  estimatedPrepTime?: number;
  preparationTime?: number;
  waitMinutes?: number;
  waitTimeMinutes?: number;
  priorityScore: number;
  batchKey?: string;
  batchCount?: number;
  cancelReason?: string;
  orderedAt?: string;
  createdAt?: string;
}

export interface Customer {
  id: number;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  points?: number;
  loyaltyPoints?: number;
  tier?: string;
  totalSpent?: number;
}

export interface UserResponse {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  branchId?: number;
  branchName?: string;
  createdAt?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  role: Role;
  phone?: string;
  branchId: number;
}

export interface UpdateUserRequest {
  fullName: string;
  phone?: string;
  role: Role;
  branchId: number;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

