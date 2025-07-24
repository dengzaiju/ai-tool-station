import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 用户相关的 API
export const userApi = {
  // 注册
  register: (email: string, password: string) => {
    return api.post('/api/register', { email, password });
  },
  
  // 登录
  login: (email: string, password: string) => {
    return api.post('/api/login', { email, password });
  },

  // AI 对话
  chat: (prompt: string) => {
    return api.post('/api/openai', { prompt });
  }
};

export default api;