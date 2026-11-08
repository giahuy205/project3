package com.restaurant.app.service;

import com.restaurant.app.dto.request.CustomerRequest;
import com.restaurant.app.dto.response.CustomerResponse;
import com.restaurant.app.entity.Customer;
import com.restaurant.app.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerByPhone(String phone) {
        Customer customer = customerRepository.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng với số điện thoại: " + phone));
        return mapToCustomerResponse(customer);
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng với ID: " + id));
        return mapToCustomerResponse(customer);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> searchCustomers(String keyword) {
        return customerRepository.findByFullNameContainingIgnoreCaseOrPhoneContaining(keyword, keyword)
                .stream()
                .map(this::mapToCustomerResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CustomerResponse createOrUpdateCustomer(CustomerRequest request) {
        Optional<Customer> existing = customerRepository.findByPhone(request.getPhone());

        Customer customer;
        if (existing.isPresent()) {
            customer = existing.get();
            customer.setFullName(request.getFullName());
            if (request.getEmail() != null) {
                customer.setEmail(request.getEmail());
            }
        } else {
            customer = Customer.builder()
                    .phone(request.getPhone())
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .points(0)
                    .totalSpent(BigDecimal.ZERO)
                    .build();
        }

        Customer saved = customerRepository.save(customer);
        return mapToCustomerResponse(saved);
    }

    private CustomerResponse mapToCustomerResponse(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .phone(customer.getPhone())
                .fullName(customer.getFullName())
                .email(customer.getEmail())
                .points(customer.getPoints())
                .totalSpent(customer.getTotalSpent())
                .createdAt(customer.getCreatedAt())
                .build();
    }
}

