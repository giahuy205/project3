package com.restaurant.app.config;

import com.restaurant.app.entity.User;
import com.restaurant.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        fixDatabaseSchemaAndConstraints();

        List<User> users = userRepository.findAll();
        for (User user : users) {
            boolean modified = false;

            // Tự động chuẩn hóa họ tên, xóa hậu tố vai trò trong ngoặc đơn như (Admin), (Manager), (Chef)...
            if (user.getFullName() != null && user.getFullName().contains("(")) {
                String cleanName = user.getFullName().replaceAll("\\s*\\([^)]*\\)", "").trim();
                user.setFullName(cleanName);
                modified = true;
                log.info(">>> Đã chuẩn hóa họ tên cho user '{}': '{}'", user.getUsername(), cleanName);
            }

            // Tự động đồng bộ mật khẩu 123456 chuẩn mã hóa BCrypt của hệ thống
            if (!passwordEncoder.matches("123456", user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode("123456"));
                modified = true;
                log.info(">>> Đã đồng bộ mật khẩu chuẩn BCrypt cho user '{}' (Mật khẩu: 123456)", user.getUsername());
            }

            if (modified) {
                userRepository.save(user);
            }
        }
    }

    private void fixDatabaseSchemaAndConstraints() {
        try {
            // Cập nhật check constraint cho kitchen_status của order_items bao gồm CANCEL_REQUESTED
            jdbcTemplate.execute("ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_kitchen_status_check");
            jdbcTemplate.execute("ALTER TABLE order_items ADD CONSTRAINT order_items_kitchen_status_check " +
                    "CHECK (kitchen_status IN ('PENDING', 'COOKING', 'CANCEL_REQUESTED', 'READY', 'SERVED', 'CANCELLED'))");

            // Đảm bảo cột cancel_reason tồn tại
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255)");

            // Đảm bảo check constraint cho status của dishes bao gồm SUSPENDED
            jdbcTemplate.execute("ALTER TABLE dishes DROP CONSTRAINT IF EXISTS dishes_status_check");
            jdbcTemplate.execute("ALTER TABLE dishes ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'AVAILABLE'");
            jdbcTemplate.execute("ALTER TABLE dishes ADD CONSTRAINT dishes_status_check " +
                    "CHECK (status IN ('AVAILABLE', 'OUT_OF_STOCK', 'SUSPENDED'))");

            // Đồng bộ tên chi nhánh thành Nhà hàng Nom Nom
            jdbcTemplate.execute("UPDATE branches SET name = 'Nhà hàng Nom Nom' WHERE id = 1 OR name LIKE '%Bách Khoa%'");

            // Đồng bộ trạm chế biến cho Bò bít tết sang KITCHEN_HOT (Bếp Nóng)
            jdbcTemplate.execute("UPDATE dishes SET station = 'KITCHEN_HOT' WHERE name ILIKE '%Bò bít tết%' OR station = 'GRILL'");

            log.info(">>> Đã đồng bộ kiểm tra và cập nhật Check Constraints, Tên chi nhánh & Trạm bếp thành công!");
        } catch (Exception e) {
            log.warn(">>> Lưu ý khi cập nhật database constraints: {}", e.getMessage());
        }
    }
}


