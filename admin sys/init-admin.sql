-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认管理员账户 (用户名: admin, 密码: admin123)
-- 密码会通过 MD5 加密存储
INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', '0192023a7bbd73250516f069df18b500'); 