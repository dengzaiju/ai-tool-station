import { useState } from 'react';
import { Layout, Input, Button, Card, List, Typography, message, Badge } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Dashboard = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null);

  // 发送消息到 OpenAI
  const handleSend = async () => {
    if (!inputValue.trim()) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // 添加用户消息到对话列表
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/openai`, 
        { prompt: userMessage },
        { withCredentials: true }
      );

      if (response.data.success) {
        // 添加 AI 的回复到对话列表
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.reply 
        }]);
        
        // 更新剩余调用次数
        if (response.data.remainingCalls !== undefined) {
          setRemainingCalls(response.data.remainingCalls);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '发送失败，请重试';
      message.error(errorMessage);
      
      if (error.response?.status === 401) {
        // 如果是未授权错误，可能需要重新登录
        message.error('登录已过期，请重新登录');
        // 可以在这里添加重定向到登录页面的逻辑
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100%', background: '#fff' }}>
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>AI 对话</Title>
          <Badge count={remainingCalls ?? '?'} overflowCount={999}>
            <Card size="small">
              <Text>剩余对话次数</Text>
            </Card>
          </Badge>
        </div>

        {/* 对话历史 */}
        <Card 
          style={{ 
            marginBottom: '24px', 
            height: '400px', 
            overflowY: 'auto' 
          }}
        >
          <List
            itemLayout="horizontal"
            dataSource={messages}
            renderItem={(message) => (
              <List.Item style={{
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: message.role === 'user' ? '#1890ff' : '#f0f2f5',
                  color: message.role === 'user' ? 'white' : 'inherit'
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    {message.role === 'user' ? (
                      <UserOutlined style={{ marginRight: '8px' }} />
                    ) : (
                      <RobotOutlined style={{ marginRight: '8px' }} />
                    )}
                    {message.role === 'user' ? '你' : 'AI'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>

        {/* 输入区域 */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入你的问题..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{ flex: 1 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSend}
            loading={loading}
            style={{ height: 'auto' }}
          >
            发送
          </Button>
        </div>
      </Content>
    </Layout>
  );
};

export default Dashboard; 