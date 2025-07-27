import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致！');
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/register`, {
        email: values.email,
        password: values.password
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        message.success('注册成功！');
        navigate('/login');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '注册失败，请稍后重试';
      message.error(errorMessage);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>注册账号</h2>
      
      <Form
        name="register"
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
          hasFeedback
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>

        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码！' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致！'));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password placeholder="请再次输入密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            注册
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          已有账号？
          <Button type="link" onClick={() => navigate('/login')}>
            立即登录
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default Register;