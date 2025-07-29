import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { setCookie, getCookie } from 'hono/cookie';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 配置
app.use('*', cors({
    origin: ['http://localhost:8788', 'https://admin-system.zaijudeng.workers.dev'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// MD5 加密函数
async function md5Hash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 管理员认证中间件
const adminAuthMiddleware = async (c: any, next: any) => {
    const token = getCookie(c, 'admin_token');
    if (!token) {
        return c.redirect('/admin/login');
    }

    try {
        const decoded = await verify(token, c.env.JWT_SECRET);
        c.set('adminId', decoded.adminId);
        await next();
    } catch (error) {
        return c.redirect('/admin/login');
    }
};

// 静态文件服务
app.get('/admin/*', serveStatic({ root: './public' }));

// 管理员登录页面
app.get('/admin/login', (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>管理员登录</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                .login-container { max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .form-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
                button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background: #0056b3; }
                .error { color: red; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h2>管理员登录</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label>用户名:</label>
                        <input type="text" name="username" required>
                    </div>
                    <div class="form-group">
                        <label>密码:</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit">登录</button>
                </form>
                <div id="error" class="error"></div>
            </div>
            <script>
                document.getElementById('loginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    try {
                        const response = await fetch('/api/admin/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username: formData.get('username'),
                                password: formData.get('password')
                            })
                        });
                        if (response.ok) {
                            window.location.href = '/admin/dashboard';
                        } else {
                            document.getElementById('error').textContent = '登录失败';
                        }
                    } catch (error) {
                        document.getElementById('error').textContent = '网络错误';
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// 管理员登录 API
app.post('/api/admin/login', async (c) => {
    const { username, password } = await c.req.json();
    
    // 检查管理员凭据
    const admin = await c.env.DB.prepare(
        'SELECT * FROM admins WHERE username = ? AND password = ?'
    ).bind(username, await md5Hash(password)).first();

    if (!admin) {
        return c.json({ success: false, message: '用户名或密码错误' }, 401);
    }

    // 生成 JWT token
    const token = await sign({ adminId: admin.id, username: admin.username }, c.env.JWT_SECRET);
    setCookie(c, 'admin_token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });

    return c.json({ success: true });
});

// 管理员仪表板
app.get('/admin/dashboard', adminAuthMiddleware, (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>管理后台</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                .header { background: #333; color: white; padding: 15px; display: flex; justify-content: space-between; }
                .container { display: flex; }
                .sidebar { width: 250px; background: #f8f9fa; padding: 20px; min-height: calc(100vh - 60px); }
                .main { flex: 1; padding: 20px; }
                .nav-item { padding: 10px; margin: 5px 0; cursor: pointer; border-radius: 4px; }
                .nav-item:hover { background: #e9ecef; }
                .nav-item.active { background: #007bff; color: white; }
                .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f8f9fa; }
                .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
                .btn-danger { background: #dc3545; color: white; }
                .btn-warning { background: #ffc107; color: black; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>AI 工具站管理后台</h2>
                <button onclick="logout()">退出登录</button>
            </div>
            <div class="container">
                <div class="sidebar">
                    <div class="nav-item active" onclick="showSection('users')">用户管理</div>
                    <div class="nav-item" onclick="showSection('stats')">数据统计</div>
                    <div class="nav-item" onclick="showSection('settings')">系统设置</div>
                </div>
                <div class="main">
                    <div id="users" class="content">
                        <h3>用户管理</h3>
                        <div id="userList"></div>
                    </div>
                    <div id="stats" class="content" style="display:none;">
                        <h3>数据统计</h3>
                        <div id="statsContent"></div>
                    </div>
                    <div id="settings" class="content" style="display:none;">
                        <h3>系统设置</h3>
                        <div id="settingsContent"></div>
                    </div>
                </div>
            </div>
            <script>
                // 加载用户列表
                async function loadUsers() {
                    try {
                        const response = await fetch('/api/admin/users');
                        const data = await response.json();
                        if (data.success) {
                            const userList = document.getElementById('userList');
                            userList.innerHTML = \`
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>邮箱</th>
                                            <th>注册时间</th>
                                            <th>剩余调用次数</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        \${data.users.map(user => \`
                                            <tr>
                                                <td>\${user.id}</td>
                                                <td>\${user.email}</td>
                                                <td>\${new Date(user.created_at).toLocaleString()}</td>
                                                <td>\${user.api_calls_remaining}</td>
                                                <td>
                                                    <button class="btn btn-warning" onclick="resetUserCalls(\${user.id})">重置次数</button>
                                                    <button class="btn btn-danger" onclick="deleteUser(\${user.id})">删除</button>
                                                </td>
                                            </tr>
                                        \`).join('')}
                                    </tbody>
                                </table>
                            \`;
                        }
                    } catch (error) {
                        console.error('加载用户列表失败:', error);
                    }
                }

                // 显示不同部分
                function showSection(section) {
                    document.querySelectorAll('.content').forEach(el => el.style.display = 'none');
                    document.getElementById(section).style.display = 'block';
                    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                    event.target.classList.add('active');
                    
                    if (section === 'users') {
                        loadUsers();
                    }
                }

                // 重置用户调用次数
                async function resetUserCalls(userId) {
                    if (confirm('确定要重置该用户的调用次数吗？')) {
                        try {
                            const response = await fetch(\`/api/admin/users/\${userId}/reset-calls\`, {
                                method: 'POST'
                            });
                            if (response.ok) {
                                loadUsers();
                                alert('重置成功');
                            }
                        } catch (error) {
                            alert('操作失败');
                        }
                    }
                }

                // 删除用户
                async function deleteUser(userId) {
                    if (confirm('确定要删除该用户吗？此操作不可恢复！')) {
                        try {
                            const response = await fetch(\`/api/admin/users/\${userId}\`, {
                                method: 'DELETE'
                            });
                            if (response.ok) {
                                loadUsers();
                                alert('删除成功');
                            }
                        } catch (error) {
                            alert('删除失败');
                        }
                    }
                }

                // 退出登录
                function logout() {
                    fetch('/api/admin/logout', { method: 'POST' });
                    window.location.href = '/admin/login';
                }

                // 页面加载时显示用户管理
                showSection('users');
            </script>
        </body>
        </html>
    `);
});

// 获取用户列表 API
app.get('/api/admin/users', adminAuthMiddleware, async (c) => {
    try {
        const users = await c.env.DB.prepare(
            'SELECT id, email, created_at, api_calls_remaining FROM users ORDER BY created_at DESC'
        ).all();
        
        return c.json({ success: true, users: users.results });
    } catch (error) {
        return c.json({ success: false, message: '获取用户列表失败' }, 500);
    }
});

// 重置用户调用次数 API
app.post('/api/admin/users/:id/reset-calls', adminAuthMiddleware, async (c) => {
    const userId = c.req.param('id');
    
    try {
        await c.env.DB.prepare(
            'UPDATE users SET api_calls_remaining = 10 WHERE id = ?'
        ).bind(userId).run();
        
        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, message: '重置失败' }, 500);
    }
});

// 删除用户 API
app.delete('/api/admin/users/:id', adminAuthMiddleware, async (c) => {
    const userId = c.req.param('id');
    
    try {
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, message: '删除失败' }, 500);
    }
});

// 退出登录 API
app.post('/api/admin/logout', (c) => {
    setCookie(c, 'admin_token', '', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 0
    });
    return c.json({ success: true });
});

export default app; 