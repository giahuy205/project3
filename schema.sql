-- ====================================================================
-- HỆ THỐNG QUẢN LÝ NHÀ HÀNG (RESTAURANT MANAGEMENT SYSTEM)
-- DATABASE INITIALIZATION SCRIPT (POSTGRESQL)
-- ĐỒ ÁN 3 - HUST
-- ====================================================================

-- 1. XÓA CÁC BẢNG NẾU ĐÃ TỒN TẠI (THEO THỨ TỰ NGƯỢC LẠI ĐỂ TRÁNH RÀNG BUỘC FK)
DROP TABLE IF EXISTS shift_assignments CASCADE;
DROP TABLE IF EXISTS staff_unavailability CASCADE;
DROP TABLE IF EXISTS work_shifts CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS stock_issue_details CASCADE;
DROP TABLE IF EXISTS stock_issues CASCADE;
DROP TABLE IF EXISTS stock_receipt_details CASCADE;
DROP TABLE IF EXISTS stock_receipts CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS dining_tables CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS dishes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS restaurant_configs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- ====================================================================
-- 2. TẠO CÁC BẢNG DỮ LIỆU CỐT LÕI (23 BẢNG)
-- ====================================================================

-- 2.1. Chi nhánh
CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.2. Tài khoản nhân viên
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF', 'ROLE_CHEF')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.3. Cấu hình hệ thống động
CREATE TABLE restaurant_configs (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_config_key UNIQUE(branch_id, config_key)
);

-- 2.4. Khu vực / Tầng
CREATE TABLE areas (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.5. Bàn ăn
CREATE TABLE dining_tables (
    id BIGSERIAL PRIMARY KEY,
    area_id BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
    status VARCHAR(20) DEFAULT 'EMPTY' CHECK (status IN ('EMPTY', 'OCCUPIED', 'RESERVED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.6. Khách hàng
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    points INT DEFAULT 0 CHECK (points >= 0),
    total_spent DECIMAL(12,2) DEFAULT 0.00 CHECK (total_spent >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.7. Mã giảm giá / Vouchers
CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED_AMOUNT')),
    discount_value DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
    max_discount DECIMAL(12,2),
    min_order_amount DECIMAL(12,2) DEFAULT 0.00,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    usage_limit INT DEFAULT 0,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.8. Đặt bàn trước
CREATE TABLE reservations (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    table_id BIGINT REFERENCES dining_tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    guest_count INT NOT NULL CHECK (guest_count > 0),
    reservation_time TIMESTAMPTZ NOT NULL,
    deposit_amount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.9. Danh mục món
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2.10. Món ăn / Đồ uống
CREATE TABLE dishes (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    original_price DECIMAL(12,2),
    scheduled_price DECIMAL(12,2),
    price_effective_date DATE,
    preparation_time INT NOT NULL DEFAULT 15 CHECK (preparation_time > 0),
    station VARCHAR(30) DEFAULT 'KITCHEN_HOT' CHECK (station IN ('KITCHEN_HOT', 'KITCHEN_COLD', 'BAR', 'GRILL')),
    image_url VARCHAR(500),
    description TEXT,
    unit VARCHAR(20) DEFAULT 'Đĩa',
    is_available BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.11. Đơn gọi món (Orders)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(30) NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    table_id BIGINT REFERENCES dining_tables(id) ON DELETE SET NULL,
    staff_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    order_type VARCHAR(20) DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN', 'TAKE_AWAY')),
    status VARCHAR(20) DEFAULT 'SERVING' CHECK (status IN ('PENDING', 'SERVING', 'COMPLETED', 'CANCELLED')),
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.12. Chi tiết món trong đơn (Order Items & Bếp KDS)
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id BIGINT NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_order DECIMAL(12,2) NOT NULL,
    notes VARCHAR(255),
    kitchen_status VARCHAR(20) DEFAULT 'PENDING' CHECK (kitchen_status IN ('PENDING', 'COOKING', 'READY', 'SERVED', 'CANCELLED')),
    cancel_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.13. Hóa đơn thanh toán (Bills)
CREATE TABLE bills (
    id BIGSERIAL PRIMARY KEY,
    bill_code VARCHAR(30) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    cashier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    points_used INT DEFAULT 0,
    points_discount DECIMAL(12,2) DEFAULT 0.00,
    vat_rate DECIMAL(5,2) DEFAULT 10.00,
    vat_amount DECIMAL(12,2) DEFAULT 0.00,
    final_amount DECIMAL(12,2) NOT NULL CHECK (final_amount >= 0),
    received_amount DECIMAL(12,2) DEFAULT 0.00,
    change_amount DECIMAL(12,2) DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'TRANSFER', 'POS')),
    transaction_ref VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'REFUNDED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.14. Lịch sử tích / tiêu điểm
CREATE TABLE point_transactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    points_change INT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'EXPIRED', 'ADJUST')),
    description VARCHAR(255),
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.15. Danh mục nguyên vật liệu kho
CREATE TABLE inventory_items (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0.000 CHECK (current_stock >= 0),
    min_threshold DECIMAL(10,3) DEFAULT 5.000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.16. Phiếu nhập kho
CREATE TABLE stock_receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_code VARCHAR(30) NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(150),
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.17. Chi tiết phiếu nhập kho
CREATE TABLE stock_receipt_details (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0)
);

-- 2.18. Phiếu xuất kho
CREATE TABLE stock_issues (
    id BIGSERIAL PRIMARY KEY,
    issue_code VARCHAR(30) NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.19. Chi tiết phiếu xuất kho
CREATE TABLE stock_issue_details (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES stock_issues(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0)
);

-- 2.20. Công thức định lượng (BOM - Recipes)
CREATE TABLE recipes (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity_needed DECIMAL(10,3) NOT NULL CHECK (quantity_needed > 0),
    wastage_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (wastage_percentage >= 0),
    notes VARCHAR(255),
    CONSTRAINT uq_dish_inventory_item UNIQUE (dish_id, inventory_item_id)
);

-- 2.21. Định nghĩa ca làm việc
CREATE TABLE work_shifts (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    min_staff INT DEFAULT 3 CHECK (min_staff > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2.22. Nhân viên đăng ký lịch bận / nghỉ
CREATE TABLE staff_unavailability (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_id BIGINT REFERENCES work_shifts(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_date_shift UNIQUE (user_id, unavailable_date, shift_id)
);

-- 2.23. Lịch phân công ca làm việc chính thức
CREATE TABLE shift_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_id BIGINT NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL,
    role_in_shift VARCHAR(20),
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ATTENDED', 'ABSENT', 'CANCELLED')),
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_work_shift_date UNIQUE (user_id, work_date, shift_id)
);

-- ====================================================================
-- 3. TẠO INDEXES TỐI ƯU TRUY VẤN
-- ====================================================================
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_kitchen_status ON order_items(kitchen_status);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_dishes_category_id ON dishes(category_id);
CREATE INDEX idx_dining_tables_status ON dining_tables(status);
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_restaurant_configs_key ON restaurant_configs(config_key);
CREATE INDEX idx_reservations_time ON reservations(reservation_time);
CREATE INDEX idx_shift_assignments_work_date ON shift_assignments(work_date);
CREATE INDEX idx_staff_unavail_date ON staff_unavailability(unavailable_date);

-- ====================================================================
-- 4. DỮ LIỆU MẪU BAN ĐẦU (SEED DATA ĐỂ TEST VÀ DEMO)
-- ====================================================================

-- 4.1. Chi nhánh mặc định
INSERT INTO branches (id, name, address, phone, is_active)
VALUES (1, 'Nhà hàng Nom Nom', 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', '02438682222', TRUE);

-- 4.2. Cấu hình vận hành mặc định
INSERT INTO restaurant_configs (branch_id, config_key, config_value, description) VALUES
(1, 'OPENING_TIME', '08:00', 'Giờ mở cửa phục vụ hàng ngày'),
(1, 'CLOSING_TIME', '22:30', 'Giờ đóng cửa nhà hàng'),
(1, 'DEFAULT_VAT_RATE', '10.00', 'Thuế suất VAT (%) mặc định trên hóa đơn'),
(1, 'EARN_POINT_RATE', '100000', 'Chi tiêu 100.000 VNĐ được tích 1 điểm'),
(1, 'REDEEM_POINT_RATE', '1000', '1 điểm quy đổi thành 1.000 VNĐ khi thanh toán'),
(1, 'POINT_VALIDITY_DAYS', '365', 'Thời hạn sử dụng điểm tích lũy (ngày)');

-- 4.3. Tài khoản mẫu 4 roles (Mật khẩu mặc định: 123456 - hash BCrypt $2a$10$7EqJtq98hPqEX7fNZaFWoO.8/K0dF1E7t60n/Z.X4E17sQy/O2tOa)
INSERT INTO users (branch_id, username, password_hash, full_name, role, phone) VALUES
(1, 'admin', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/K0dF1E7t60n/Z.X4E17sQy/O2tOa', 'Nguyễn Chủ Quán (Admin)', 'ROLE_ADMIN', '0912000001'),
(1, 'manager', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/K0dF1E7t60n/Z.X4E17sQy/O2tOa', 'Trần Quản Lý (Manager)', 'ROLE_MANAGER', '0912000002'),
(1, 'waiter1', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/K0dF1E7t60n/Z.X4E17sQy/O2tOa', 'Lê Phục Vụ (Staff/Cashier)', 'ROLE_STAFF', '0912000003'),
(1, 'chef1', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/K0dF1E7t60n/Z.X4E17sQy/O2tOa', 'Phạm Bếp Trưởng (Chef)', 'ROLE_CHEF', '0912000004');

-- 4.4. Khu vực & Bàn ăn
INSERT INTO areas (id, branch_id, name) VALUES
(1, 1, 'Tầng 1 - Sảnh chính'),
(2, 1, 'Tầng 2 - Phòng VIP'),
(3, 1, 'Sân vườn ngoài trời');

INSERT INTO dining_tables (area_id, table_number, capacity, status) VALUES
(1, 'Bàn 01', 4, 'EMPTY'),
(1, 'Bàn 02', 4, 'EMPTY'),
(1, 'Bàn 03', 6, 'EMPTY'),
(1, 'Bàn 04', 2, 'EMPTY'),
(2, 'VIP 01', 8, 'EMPTY'),
(2, 'VIP 02', 12, 'EMPTY'),
(3, 'Vườn 01', 4, 'EMPTY'),
(3, 'Vườn 02', 6, 'EMPTY');

-- 4.5. Danh mục món ăn
INSERT INTO categories (id, name, description, display_order) VALUES
(1, 'Khai vị', 'Các món nhẹ mở đầu bữa tiệc', 1),
(2, 'Món chính', 'Món ăn đậm đà, đặc sắc nhất của nhà hàng', 2),
(3, 'Lẩu & Nướng', 'Các món lẩu và nướng thích hợp ăn nhóm', 3),
(4, 'Đồ uống', 'Trà, nước ép, bia và rượu vang', 4),
(5, 'Tráng miệng', 'Chè, kem và hoa quả tươi', 5);

-- 4.6. Món ăn mẫu (Kèm thời gian chế biến & Trạm bếp)
INSERT INTO dishes (category_id, name, price, original_price, preparation_time, station, unit, image_url, description, is_available) VALUES
(1, 'Khoai tây chiên lắc phô mai', 45000, 50000, 7, 'KITCHEN_HOT', 'Đĩa', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500', 'Khoai tây giòn rụm phủ bột phô mai béo ngậy', TRUE),
(1, 'Salad lườn ngỗng hun khói', 75000, NULL, 5, 'KITCHEN_COLD', 'Đĩa', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500', 'Salad rau củ tươi cùng lườn ngỗng sốt giấm đen balsamic', TRUE),
(2, 'Bò bít tết sốt tiêu đen', 185000, 210000, 18, 'KITCHEN_HOT', 'Phần', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500', 'Bò Mỹ nướng mềm ngọt ăn kèm khoai nghiền và sốt tiêu đen', TRUE),
(2, 'Cơm rang dưa bò giòn', 65000, NULL, 10, 'KITCHEN_HOT', 'Dĩa', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500', 'Cơm rang hạt tơi giòn cùng thịt bò xào dưa cải muối chua', TRUE),
(3, 'Lẩu Thái hải sản chua cay', 350000, 390000, 15, 'KITCHEN_HOT', 'Nồi', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500', 'Nước dùng chua cay đậm vị Tomyum kèm tôm, mực, bò và rau nấm', TRUE),
(4, 'Trà đào cam sả', 35000, NULL, 3, 'BAR', 'Ly', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500', 'Thơm nồng hương sả, mát lạnh vị cam vàng và đào ngâm', TRUE),
(4, 'Bia Heineken lon', 25000, NULL, 1, 'BAR', 'Lon', 'https://images.unsplash.com/photo-1608270197972-749e49eb7297?w=500', 'Bia ướp lạnh sảng khoái', TRUE),
(5, 'Kem dừa Côn Đảo', 40000, NULL, 2, 'BAR', 'Ly', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=500', 'Kem dừa béo thơm rắc dừa nạo và đậu phộng rang', TRUE);

-- 4.7. Khách hàng thân thiết mẫu
INSERT INTO customers (phone, full_name, email, points, total_spent) VALUES
('0988111222', 'Hoàng Văn Khách', 'khach.hoang@gmail.com', 25, 2500000.00),
('0977333444', 'Vũ Thị Thành Viên', 'thanhvien.vu@gmail.com', 50, 5000000.00);

-- 4.8. Mã voucher mẫu
INSERT INTO vouchers (code, name, discount_type, discount_value, max_discount, min_order_amount, valid_from, valid_to, usage_limit, is_active) VALUES
('CHAOBANMOI', 'Giảm 10% chào mừng khách mới', 'PERCENT', 10.00, 50000.00, 200000.00, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 100, TRUE),
('GIAM50K', 'Giảm trực tiếp 50.000 VNĐ cho đơn từ 500k', 'FIXED_AMOUNT', 50000.00, NULL, 500000.00, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 50, TRUE);

-- 4.9. Nguyên liệu kho mẫu
INSERT INTO inventory_items (branch_id, name, unit, current_stock, min_threshold) VALUES
(1, 'Thịt bò Mỹ', 'kg', 25.500, 5.000),
(1, 'Tôm sú tươi', 'kg', 12.000, 3.000),
(1, 'Gạo tám xoan', 'kg', 80.000, 20.000),
(1, 'Bia Heineken', 'lon', 120.000, 24.000),
(1, 'Trà đào (túi lọc)', 'gói', 45.000, 10.000);

-- 4.10. Định lượng mẫu (BOM)
INSERT INTO recipes (dish_id, inventory_item_id, quantity_needed, wastage_percentage, notes) VALUES
(3, 1, 0.200, 10.00, '200g thịt bò nạc, hao hụt 10% khi rã đông và lọc mỡ'),
(4, 3, 0.150, 0.00, '150g gạo cho 1 dĩa cơm chiên'),
(5, 1, 0.150, 5.00, '150g bò nhúng lẩu'),
(5, 2, 0.200, 15.00, '200g tôm sú, hao hụt bóc vỏ đầu tôm 15%'),
(7, 4, 1.000, 0.00, '1 lon bia xuất kho');

-- 4.11. Ca làm việc mẫu
INSERT INTO work_shifts (branch_id, name, start_time, end_time, min_staff) VALUES
(1, 'Ca Sáng', '08:00:00', '13:00:00', 3),
(1, 'Ca Chiều', '13:00:00', '18:00:00', 3),
(1, 'Ca Tối (Cao điểm)', '18:00:00', '23:00:00', 5);

-- ====================================================================
-- KẾT THÚC SCRIPT KHỞI TẠO CSDL
-- ====================================================================

