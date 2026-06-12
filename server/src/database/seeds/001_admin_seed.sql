-- First Admin Bootstrap Seed
-- Password: Admin@1234  (bcrypt hash below)
-- User MUST change password on first login (force_password_change = true)

USE prm_tool;

INSERT INTO users (username, email, password_hash, role, is_active, force_password_change)
VALUES (
  'admin',
  'admin@prm-tool.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'ADMIN',
  TRUE,
  TRUE
)
ON DUPLICATE KEY UPDATE username = username;
