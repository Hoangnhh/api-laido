CREATE TABLE `admin-laido`.`staff` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(45) NOT NULL DEFAULT 'DRIVER',
  `group_id` INT NOT NULL,
  `code` VARCHAR(45) NOT NULL,
  `phone` VARCHAR(45) NULL,
  `name` VARCHAR(200) NOT NULL,
  `username` VARCHAR(45) NOT NULL,
  `password` TEXT NOT NULL,
  `birtdate` DATE NULL,
  `address` TEXT NULL,
  `avatar_url` TEXT NULL,
  `card_id` VARCHAR(45) NULL,
  `card_date` DATE NULL ,
  `bank_name` VARCHAR(50) NULL,
  `bank_account` VARCHAR(45) NULL,
  `status` VARCHAR(45) NOT NULL DEFAULT 'ACTIVE',
  `vehical_size` INT NOT NULL DEFAULT 6,
  `vehical_type` INT(2) NOT NULL DEFAULT 1,
  `fcm_token` TEXT NULL,
  `default_gate_id` INT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP ,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

  PRIMARY KEY (`id`))
COMMENT = 'nhan vien';

CREATE TABLE `admin-laido`.`staff_group` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `status` VARCHAR(45) NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`))
COMMENT = 'Nhóm nhân viên';

CREATE TABLE `admin-laido`.`gate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NULL,
  `status` VARCHAR(45) NULL DEFAULT 'ACTIVVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`));

CREATE TABLE `admin-laido`.`gate_shift` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `queue_status` VARCHAR(45) NOT NULL DEFAULT 'WAITING' COMMENT 'WAITING: Chưa chạy\nRUNING: Đang chạy\nCOMPLETED: Đã chạy xong' ,
  `staff_group_id` INT NOT NULL,
  `gate_id` INT NOT NULL,
  `current_index` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(45) NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`));

CREATE TABLE `admin-laido`.`checked_ticket` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(45) NOT NULL,
  `name` VARCHAR(45) NULL,
  `status` VARCHAR(45) NULL DEFAULT 'CHECKIN',
  `date` DATE NOT NULL,
  `issue_date` DATETIME NULL,
  `expired_date` DATETIME NULL,
  `checkin_at` DATETIME NULL,
  `checkout_at` DATETIME NULL,
  `checkin_by` VARCHAR(45) NULL,
  `checkout_by` VARCHAR(45) NULL,
  `is_checkout_with_other` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Checkout bởi nhân viên chính\n1: Checkout bởi nhân viên khác',
  `is_checkin_with_other` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Checkin bởi nhân viên chính\n1: Checkin bởi nhân viên khác',
  `payment_id` INT NULL,
  `paid` TINYINT(1) NOT NULL DEFAULT 0,
  `price` VARCHAR(20) NOT NULL DEFAULT 0,
  `commission` INT NOT NULL DEFAULT 0,
  `gate_staff_shift_id` INT NULL ,
  `staff_id` INT NOT NULL,
  `extra_shift_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`))
COMMENT = 'Thông tin vé đã quét';

CREATE TABLE `extra_shift` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `staff_id` int DEFAULT '0',
  `recheckin_times` int NOT NULL DEFAULT '0',
  `recheckin_at` Text NULL,
  `status` varchar(45) NOT NULL DEFAULT 'ACTIVE',
  `create_by` varchar(45) NOT NULL,
  `update_by` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

CREATE TABLE `admin-laido`.`gate_staff_shift` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` DATE DEFAULT NULL,
  `gate_shift_id` int NOT NULL DEFAULT 0,
  `extra_shift_id` int DEFAULT 0,
  `index` int NOT NULL,
  `gate_id` varchar(45) NULL,
  `staff_id` varchar(45) NOT NULL,
  `status` varchar(45) NOT NULL DEFAULT 'WAITING',
  `checkin_at` datetime DEFAULT NULL,
  `checkout_at` datetime DEFAULT NULL,
  `checked_ticket_num` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Ca lam viec theo cong'

CREATE TABLE `admin-laido`.`system_configs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(45) NOT NULL,
  `value` TEXT NULL,
  `status` VARCHAR(45) NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`))
COMMENT = 'Lưu thông tin config của system';

CREATE TABLE `admin-laido`.`action_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `action` VARCHAR(45) NOT NULL,
  `table` VARCHAR(45) NULL,
  `before_data` TEXT NULL,
  `after_data` TEXT NULL,
  `create_by` VARCHAR(45) NOT NULL,
  `create_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`));

CREATE TABLE `admin-laido`.`payment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `staff_id` INT NOT NULL,
  `date` DATETIME NOT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(45) NOT NULL DEFAULT 'BANK_TRANSFER',
  `bank` VARCHAR(45) NULL,
  `received_account` VARCHAR(45) NULL,
  `status` VARCHAR(45) NOT NULL DEFAULT 'ACTIVE',
  `note` TEXT NULL,
  `delete_reason` TEXT NULL,
  `transaction_code` VARCHAR(45) NULL,
  `created_by` VARCHAR(45) NOT NULL,
  `updated_by` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`));

