-- Schema for TechTimeoff / Leave request frontend
-- Runs on MySQL / MySQL Workbench. No sample data is inserted here.
-- Database name: techtimeoff

CREATE DATABASE IF NOT EXISTS `techtimeoff` 
  CHARACTER SET = 'utf8mb4'
  COLLATE = 'utf8mb4_unicode_ci';
USE `techtimeoff`;

-- Employees / users table. Store auth/hash in production.
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Types of leave (populated by admin or migration)
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Main leave requests table. Matches fields on the form.
-- front-end fields mapping (example):
--  from_date -> start_date (DATE)
--  to_date -> end_date (DATE)
--  days -> days (DECIMAL) (frontend can compute, server may recalc)
--  leave_type -> leave_type_id (INT referencing leave_types)
--  note -> note (TEXT)
--  notify -> list of user ids (store in leave_request_notify)

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `requester_id` INT NOT NULL,
  `leave_type_id` INT DEFAULT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days` DECIMAL(5,2) NOT NULL,
  `note` TEXT DEFAULT NULL,
  `status` ENUM('Pending','Approved','Rejected','Cancelled') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approver_id` INT DEFAULT NULL,
  `approval_date` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_lr_requester` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lr_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_lr_approver` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Many-to-many table for notifications (who to notify about the request)
CREATE TABLE IF NOT EXISTS `leave_request_notify` (
  `leave_request_id` INT NOT NULL,
  `notified_user_id` INT NOT NULL,
  `notified_at` TIMESTAMP NULL,
  PRIMARY KEY (`leave_request_id`,`notified_user_id`),
  CONSTRAINT `fk_notify_request` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notify_user` FOREIGN KEY (`notified_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Simple history for approval/status changes
CREATE TABLE IF NOT EXISTS `leave_request_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `leave_request_id` INT NOT NULL,
  `changed_by` INT DEFAULT NULL,
  `old_status` VARCHAR(50) DEFAULT NULL,
  `new_status` VARCHAR(50) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hist_request` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_user` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Useful indexes
CREATE INDEX IF NOT EXISTS `idx_lr_requester` ON `leave_requests`(`requester_id`);
CREATE INDEX IF NOT EXISTS `idx_lr_status` ON `leave_requests`(`status`);
CREATE INDEX IF NOT EXISTS `idx_users_email` ON `users`(`email`);

-- End of schema. No sample data included.
