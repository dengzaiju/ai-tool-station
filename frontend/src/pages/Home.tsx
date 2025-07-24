import { Button, Typography, Space, Card, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { RobotOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      title: '智能对话',
      description: '基于 OpenAI 的强大对话能力，为您提供智能、准确的回答'
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      title: '快速响应',
      description: '毫秒级的响应速度，让您的每次对话都畅通无阻'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      title: '安全可靠',
      description: '严格的用户认证和数据保护机制，确保您的信息安全'
    }
  ];

  return (
    <div style={{ padding: '40px 20px' }}>
      {/* 头部区域 */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <Title level={1}>欢迎使用 AI Tool Station</Title>
        <Paragraph style={{ fontSize: '18px', color: '#666' }}>
          您的智能助手，为您提供强大的 AI 对话能力
        </Paragraph>
        <Space size="large" style={{ marginTop: '24px' }}>
          <Button type="primary" size="large" onClick={() => navigate('/register')}>
            立即注册
          </Button>
          <Button size="large" onClick={() => navigate('/login')}>
            登录使用
          </Button>
        </Space>
      </div>

      {/* 特性展示区域 */}
      <Row gutter={[24, 24]} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {features.map((feature, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card 
              hoverable 
              style={{ textAlign: 'center', height: '100%' }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
              <Title level={3}>{feature.title}</Title>
              <Paragraph>{feature.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 底部说明 */}
      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <Title level={3}>开始使用</Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          注册即可获得 10 次免费对话机会，立即体验 AI 的强大功能！
        </Paragraph>
        <Button type="primary" size="large" onClick={() => navigate('/register')}>
          免费注册
        </Button>
      </div>
    </div>
  );
};

export default Home; 