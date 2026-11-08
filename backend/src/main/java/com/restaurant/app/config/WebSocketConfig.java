package com.restaurant.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Endpoint kết nối WebSocket từ Frontend (Angular / Postman / Client)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // Các kênh pub/sub gửi dữ liệu thời gian thực tới Client
        // /topic/kitchen : Kênh màn hình Bếp (nhận món mới cần nấu)
        // /topic/waiter  : Kênh nhân viên phục vụ (nhận thông báo ra món, hết món)
        // /topic/tables  : Kênh cập nhật sơ đồ bàn ăn realtime
        registry.enableSimpleBroker("/topic");

        // Tiền tố cho các message gửi từ Client lên Server (nếu có)
        registry.setApplicationDestinationPrefixes("/app");
    }
}

