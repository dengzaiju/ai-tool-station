import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
        email: values.email,
        password: values.password
      }, {
        withCredentials: true // 重要：允许跨域请求携带 cookies
      });

      if (response.data.success) {
        message.success('登录成功！');
        // 登录成功后跳转到仪表板页面
        navigate('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '登录失败，请检查邮箱和密码。';
      message.error(errorMessage);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>登录</h2>
      
      <Form
        name="login"
        onFinish={onFinish}
        layout="vertical"
        scrollToFirstError
      >
        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱！' },
            { type: 'email', message: '请输入有效的邮箱地址！' }
          ]}
        >
          <Input placeholder="请输入您的邮箱" />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码！' },
            { min: 6, message: '密码长度至少为 6 个字符！' }
          ]}
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            登录
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          还没有账号？
          <Button type="link" onClick={() => navigate('/register')}>
            立即注册
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default Login;