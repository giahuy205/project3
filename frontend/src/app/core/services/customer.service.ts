import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, Customer } from '../models/restaurant.models';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);

  getCustomerByPhone(phone: string): Observable<Customer | null> {
    return this.http.get<ApiResponse<Customer>>(`/api/customers/by-phone?phone=${phone}`).pipe(
      map(res => res.data || null)
    );
  }

  searchCustomers(keyword: string): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`/api/customers/search?keyword=${encodeURIComponent(keyword)}`).pipe(
      map(res => res.data || [])
    );
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`/api/customers/${id}`).pipe(
      map(res => res.data)
    );
  }

  createOrUpdateCustomer(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>('/api/customers', customer).pipe(
      map(res => res.data)
    );
  }
}

