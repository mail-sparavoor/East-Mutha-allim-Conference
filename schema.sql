-- ========================================================
-- Muthaallim Conference Registration & Ticketing System
-- MySQL Database Schema & Initial Data
-- Character Set: utf8mb4 (Full Unicode & Emoji support)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `muthaallim_conference`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `muthaallim_conference`;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Table structure for `settings`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table structure for `admins`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table structure for `divisions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `divisions`;
CREATE TABLE `divisions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL UNIQUE,
  `code` VARCHAR(50) NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table structure for `colleges`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `colleges`;
CREATE TABLE `colleges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table structure for `attendees`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendees`;
CREATE TABLE `attendees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `registration_id` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `division_id` INT NOT NULL,
  `division_name` VARCHAR(150) NOT NULL,
  `sector_id` INT DEFAULT 0,
  `sector_name` VARCHAR(150) DEFAULT '',
  `unit_id` INT DEFAULT 0,
  `unit_name` VARCHAR(150) DEFAULT '',
  `college` VARCHAR(255) NOT NULL,
  `verification_token` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('Registered', 'Admitted', 'Cancelled') DEFAULT 'Registered',
  `check_in_time` VARCHAR(100) NULL DEFAULT NULL,
  `check_in_by` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT NULL,
  INDEX `idx_attendees_mobile` (`mobile`),
  INDEX `idx_attendees_reg_id` (`registration_id`),
  INDEX `idx_attendees_division` (`division_id`),
  INDEX `idx_attendees_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table structure for `audit_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(150) NOT NULL,
  `details` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Default Conference Settings
INSERT INTO `settings` (`key`, `value`) VALUES
('event_title', 'Muthaallim Conference 2026'),
('event_subtitle', 'Knowledge, Leadership & Unity'),
('event_date', 'November 15, 2026'),
('event_venue', 'Grand Auditorium, Paravoor East'),
('registration_open', 'true'),
('contact_phone', '+91 98460 12345'),
('contact_email', 'muthaallim.east@gmail.com')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- Default Superadmin User (username: admin / password: admin123)
INSERT INTO `admins` (`username`, `password_hash`, `role`) VALUES
('admin', '$2a$10$ooypNcRqUJGL1v8/HECveOKtKcBt1uQb49Ibl2CU.gkmgzx8o4QK6', 'superadmin')
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`);

-- Default Divisions (Only Division is required in the hierarchy)
INSERT INTO `divisions` (`name`, `code`) VALUES
('Pulikkal', 'PLK'),
('Kondotty', 'KON'),
('Malappuram', 'MLP'),
('Paravoor East', 'PVE'),
('Paravoor West', 'PVW'),
('Aluva East', 'ALE'),
('Angamaly', 'ANG'),
('Kalamassery', 'KLM')
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- Default Dars / Dawa Colleges
INSERT INTO `colleges` (`name`) VALUES
('Markazu Ssaqafathi Ssunniyya, Karanthur'),
('Jamia Madeenathunnoor, Kozhikode'),
('Darul Huda Islamic University, Chemmad'),
('Jamia Nooriya Arabic College, Pattikkad'),
('Ma\'din Academy, Malappuram'),
('Al Jamiathul Ashrafiyya, Azamgarh / Regional'),
('Busthanabad Arabic College'),
('Al Jamia Al Islamiyya, Santhapuram'),
('Sirajul Huda, Kuttiady'),
('Sa-adiya Arabic College, Kasaragod'),
('Al Maqarr Islamic Academy, Kannur'),
('Hadiyya Dawa College, Ernakulam'),
('Kottuvally Mahallu Dars, Paravoor East'),
('Local Mahallu Dars (Independent)'),
('Other / Independent Studies')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Sample Registered Attendee (Format: MEMC1001)
INSERT INTO `attendees` (
  `registration_id`, `full_name`, `mobile`,
  `division_id`, `division_name`,
  `college`, `verification_token`,
  `status`, `created_at`
) VALUES (
  'MEMC1001',
  'Sirajul Hasan',
  '9495852505',
  2,
  'Kondotty',
  'Markazu Ssaqafathi Ssunniyya, Karanthur',
  'vtok_8f9a2b1c4d5e1001',
  'Registered',
  NOW()
)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);
