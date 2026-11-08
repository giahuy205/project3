package com.restaurant.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AreaResponse {
    private Long id;
    private String name;
    private List<DiningTableResponse> tables;
}

