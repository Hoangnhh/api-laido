-- Index cho bảng checked_ticket
-- Index cho paid và staff_id
CREATE INDEX idx_checked_ticket_paid_staff 
ON checked_ticket(paid, staff_id);

-- Index cho payment_id
CREATE INDEX idx_checked_ticket_payment 
ON checked_ticket(payment_id);

-- Index cho commission
CREATE INDEX idx_checked_ticket_commission 
ON checked_ticket(commission);

-- Index cho bảng staff
-- Index cho các trường tìm kiếm
CREATE INDEX idx_staff_search 
ON staff(code, name, card_id, bank_account);

-- Index cho bảng payment
-- Index cho staff_id và status
CREATE INDEX idx_payment_staff_status 
ON payment(staff_id, status);

-- Phân tích lại thống kê
ANALYZE TABLE checked_ticket;
ANALYZE TABLE staff;
ANALYZE TABLE payment;

-- Câu lệnh xóa index nếu cần
/*
ALTER TABLE checked_ticket DROP INDEX idx_checked_ticket_paid_staff;
ALTER TABLE checked_ticket DROP INDEX idx_checked_ticket_payment;
ALTER TABLE checked_ticket DROP INDEX idx_checked_ticket_commission;
ALTER TABLE staff DROP INDEX idx_staff_search;
ALTER TABLE payment DROP INDEX idx_payment_staff_status;
*/

-- Câu lệnh kiểm tra index đã được tạo
/*
SHOW INDEX FROM checked_ticket;
SHOW INDEX FROM staff;
SHOW INDEX FROM payment;
*/

-- Câu lệnh kiểm tra kích thước của bảng và index
/*
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
    AND table_name IN ('checked_ticket', 'staff', 'payment');
*/ 