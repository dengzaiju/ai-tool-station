// backend/src/index.ts

// 1. 首先是所有的导入语句
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { setCookie, getCookie } from 'hono/cookie';

// 2. 类型定义
type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    OPENAI_API_KEY: string;
};

// 3. 辅助函数
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const hashedInput = await hashPassword(password);
    return hashedInput === hashedPassword;
}

// 4. 创建应用实例
const app = new Hono<{ Bindings: Bindings }>();

// 5. 中间件配置
app.use('/api/*', cors({
    origin: [
        'http://localhost:5173',  // 本地开发
        'https://ai-tool-station-frontend.pages.dev'  // 生产环境
    ],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// 6. 认证中间件
const authMiddleware = async (c, next) => {
    const token = getCookie(c, 'auth_token');
    if (!token) {
        return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
    }

    try {
        const decodedPayload = await verify(token, c.env.JWT_SECRET);
        c.set('userId', decodedPayload.userId);
        await next();
    } catch (error) {
        return c.json({ success: false, message: 'Unauthorized: Invalid token' }, 401);
    }
};

// 7. 路由定义
// 健康检查
app.get('/api/health', (c) => {
    return c.json({ok: true});
});

// 数据库测试
app.get('/api/db-test', async (c) => {
    try {
        const result = await c.env.DB.prepare('SELECT 1').first();
        return c.json({ success: true, result });
    } catch (e) {
        console.error('Database test error:', e);
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
});

// 用户注册
app.post('/api/register', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password || password.length < 6) {
            return c.json({ 
                success: false, 
                message: 'Invalid email or password (must be at least 6 characters).' 
            }, 400);
        }

        const hashedPassword = await hashPassword(password);
        console.log('Attempting to insert user:', { email, hashedPassword });

        const result = await c.env.DB.prepare(
            'INSERT INTO users (email, password_hash, api_calls_remaining) VALUES (?, ?, ?)'
        ).bind(email, hashedPassword, 10).run();

        console.log('Database insert result:', result);
        return c.json({ success: true, message: 'User registered successfully.' });
    } catch (e) {
        console.error('Registration error:', e);
        return c.json({ 
            success: false, 
            message: 'Registration failed. ' + (e instanceof Error ? e.message : 'Unknown error') 
        }, 500);
    }
});

// 用户登录
app.post('/api/login', async (c) => {
    const { email, password } = await c.req.json();

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first();
    
    if (!user) {
        return c.json({ success: false, message: 'Invalid email or password.' }, 401);
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash as string);
    if (!isPasswordValid) {
        return c.json({ success: false, message: 'Invalid email or password.' }, 401);
    }

    const payload = {
        userId: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
    };
    const token = await sign(payload, c.env.JWT_SECRET);
    
    setCookie(c, 'auth_token', token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
    });

    return c.json({ success: true, message: 'Logged in successfully.' });
});

// OpenAI API 调用
app.post('/api/openai', authMiddleware, async (c) => {
    const userId = c.get('userId');
    const { prompt } = await c.req.json();

    if (!prompt) {
        return c.json({ success: false, message: 'Prompt is required.' }, 400);
    }

    const user = await c.env.DB.prepare('SELECT api_calls_remaining FROM users WHERE id = ?')
        .bind(userId)
        .first();

    if (!user || (user.api_calls_remaining as number) <= 0) {
        return c.json({ success: false, message: 'You have no API calls remaining.' }, 403);
    }

    try {
        await c.env.DB.prepare(
            'UPDATE users SET api_calls_remaining = api_calls_remaining - 1 WHERE id = ?'
        ).bind(userId).run();

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            }),
        });
        
        if (!openaiResponse.ok) {
            console.error("OpenAI API error:", await openaiResponse.text());
            return c.json({ success: false, message: 'Failed to get response from AI service.' }, 502);
        }

        const data = await openaiResponse.json();
        return c.json({ success: true, reply: data.choices[0].message.content });
    } catch (error) {
        console.error("Error in OpenAI call:", error);
        return c.json({ success: false, message: 'An internal error occurred.' }, 500);
    }
});

// 8. 导出应用
export default app;
