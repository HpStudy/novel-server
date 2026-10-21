CREATE DATABASE IF NOT EXISTS `novel_platform`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `novel_platform`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NULL,
  `unionid` VARCHAR(64) NULL,
  `nickname` VARCHAR(50) NOT NULL DEFAULT '',
  `avatar_url` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(20) NULL,
  `gender` TINYINT NOT NULL DEFAULT 0,
  `vip_level` TINYINT NOT NULL DEFAULT 0,
  `vip_expire_at` DATETIME NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` TINYINT NOT NULL DEFAULT 1,
  `role` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_openid` (`openid`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `icon` VARCHAR(255) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `books` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `author` VARCHAR(50) NOT NULL DEFAULT '',
  `cover_url` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT NOT NULL,
  `tags` VARCHAR(255) NOT NULL DEFAULT '',
  `word_count` INT NOT NULL DEFAULT 0,
  `chapter_count` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `is_vip` TINYINT NOT NULL DEFAULT 0,
  `price_per_chapter` DECIMAL(5,2) NOT NULL DEFAULT 0.10,
  `free_chapters` INT NOT NULL DEFAULT 10,
  `read_count` BIGINT NOT NULL DEFAULT 0,
  `score` DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  `published_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_books_category_status` (`category_id`, `status`),
  KEY `idx_books_status_read_count` (`status`, `read_count`),
  KEY `idx_books_status_published` (`status`, `published_at`),
  CONSTRAINT `fk_books_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chapters` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `book_id` BIGINT NOT NULL,
  `chapter_num` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `word_count` INT NOT NULL DEFAULT 0,
  `is_free` TINYINT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` DATETIME NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chapters_book_num` (`book_id`, `chapter_num`),
  KEY `idx_chapters_book_status_num` (`book_id`, `status`, `chapter_num`),
  CONSTRAINT `fk_chapters_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorites` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `book_id` BIGINT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_book_favorite` (`user_id`, `book_id`),
  KEY `idx_favorites_book` (`book_id`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `read_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `book_id` BIGINT NOT NULL,
  `chapter_id` BIGINT NOT NULL DEFAULT 0,
  `progress` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_read_history_user_book` (`user_id`, `book_id`),
  KEY `idx_read_history_book` (`book_id`),
  CONSTRAINT `fk_read_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_read_history_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `book_id` BIGINT NOT NULL,
  `chapter_id` BIGINT NULL,
  `content` VARCHAR(500) NOT NULL,
  `like_count` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_book_status_created` (`book_id`, `status`, `created_at`),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `type` TINYINT NOT NULL,
  `target_id` BIGINT NULL,
  `book_id` BIGINT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `coins` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 0,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_order_no` (`order_no`),
  KEY `idx_orders_user_created` (`user_id`, `created_at`),
  KEY `idx_orders_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL DEFAULT '',
  `image_url` VARCHAR(255) NOT NULL DEFAULT '',
  `link_type` TINYINT NOT NULL DEFAULT 1,
  `link_target` VARCHAR(255) NOT NULL DEFAULT '',
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `start_at` DATETIME NULL,
  `end_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_status_sort` (`status`, `sort`),
  KEY `idx_banners_time_range` (`start_at`, `end_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_settings` (
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
