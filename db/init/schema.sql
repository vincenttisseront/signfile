-- Create database
CREATE DATABASE IF NOT EXISTS signfile CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE signfile;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255), -- for local auth fallback
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles
CREATE TABLE user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('admin', 'viewer', 'agent') NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Agents (Linux servers)
CREATE TABLE agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  os VARCHAR(255),
  last_seen TIMESTAMP,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lynis scan results metadata
CREATE TABLE lynis_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  scan_date DATETIME NOT NULL,
  scan_id VARCHAR(64) UNIQUE,
  hardening_index INT,
  warnings INT,
  suggestions INT,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Lynis individual check results
CREATE TABLE lynis_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lynis_result_id INT NOT NULL,
  category VARCHAR(100),
  test_id VARCHAR(100),
  description TEXT,
  result ENUM('OK', 'WARN', 'SUGGEST', 'INFO', 'UNKNOWN') NOT NULL,
  FOREIGN KEY (lynis_result_id) REFERENCES lynis_results(id) ON DELETE CASCADE
);

-- NPM packages
CREATE TABLE npm_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100),
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Application configuration (key-value)
CREATE TABLE configurations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section ENUM('okta', 'local_auth', 'agent', 'system') NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
