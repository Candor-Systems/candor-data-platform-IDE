import React from 'react';
import { Card, Typography, Button, Row, Col, Tag, Progress, Alert, Space } from 'antd';
import { 
  UserOutlined, 
  CrownOutlined, 
  CalendarOutlined, 
  RocketOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const { 
    user, 
    hasActiveSubscription, 
    isTrialActive, 
    daysRemaining, 
    trialDaysRemaining,
    logout 
  } = useAuth();
  const navigate = useNavigate();

  const getStatusColor = () => {
    if (isTrialActive) return 'blue';
    if (hasActiveSubscription) return 'green';
    return 'red';
  };

  const getStatusText = () => {
    if (isTrialActive) return 'Trial Active';
    if (hasActiveSubscription) return 'Subscription Active';
    return 'Subscription Expired';
  };

  const getDaysRemaining = () => {
    if (isTrialActive) return trialDaysRemaining;
    if (hasActiveSubscription) return daysRemaining;
    return 0;
  };

  const getProgressPercent = () => {
    if (isTrialActive) {
      return ((7 - trialDaysRemaining) / 7) * 100;
    }
    if (hasActiveSubscription) {
      return ((30 - daysRemaining) / 30) * 100;
    }
    return 100;
  };

  const canUseFeatures = isTrialActive || hasActiveSubscription;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <Title level={1} className="text-gray-800 mb-0">
              Welcome back, {user?.first_name || user?.username}!
            </Title>
            <Button onClick={logout} danger>
              Logout
            </Button>
          </div>
          
          {!canUseFeatures && (
            <Alert
              message="Subscription Required"
              description="Your subscription has expired. Please upgrade to continue using the AI mapping features."
              type="warning"
              showIcon
              action={
                <Button size="small" type="primary" onClick={() => navigate('/plans')}>
                  Upgrade Now
                </Button>
              }
              className="mb-6"
            />
          )}
        </div>

        {/* Subscription Status */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} lg={16}>
            <Card className="h-full">
              <div className="flex items-center justify-between mb-4">
                <Title level={3} className="mb-0">
                  Subscription Status
                </Title>
                <Tag color={getStatusColor()} size="large">
                  {getStatusText()}
                </Tag>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <Text className="text-gray-600">
                    {isTrialActive ? 'Trial Days Remaining' : 'Subscription Days Remaining'}
                  </Text>
                  <Text strong className="text-lg">
                    {getDaysRemaining()} days
                  </Text>
                </div>
                <Progress 
                  percent={getProgressPercent()} 
                  status={canUseFeatures ? 'active' : 'exception'}
                  strokeColor={getStatusColor()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <CalendarOutlined className="text-2xl text-blue-500 mb-2" />
                  <div>
                    <Text className="text-gray-600 block">Plan Type</Text>
                    <Text strong className="text-lg">
                      {user?.subscription_status.plan_type || 'Trial'}
                    </Text>
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <CrownOutlined className="text-2xl text-purple-500 mb-2" />
                  <div>
                    <Text className="text-gray-600 block">Status</Text>
                    <Text strong className="text-lg">
                      {user?.subscription_status.status || 'Active'}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card className="h-full">
              <Title level={4} className="mb-4">Quick Actions</Title>
              <Space direction="vertical" className="w-full">
                <Button 
                  type="primary" 
                  block 
                  size="large"
                  onClick={() => navigate('/plans')}
                  icon={<CrownOutlined />}
                >
                  Manage Subscription
                </Button>
                
                {canUseFeatures ? (
                  <>
                    <Button 
                      block 
                      size="large"
                      onClick={() => navigate('/campaigns')}
                      icon={<RocketOutlined />}
                    >
                      Start AI Mapping
                    </Button>
                    <Button 
                      block 
                      size="large"
                      onClick={() => navigate('/campaign-management')}
                      icon={<RocketOutlined />}
                    >
                      Manage Campaigns
                    </Button>
                    <Button 
                      block 
                      size="large"
                      onClick={() => navigate('/campaign-history')}
                      icon={<RocketOutlined />}
                    >
                      View History
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="primary" 
                    block 
                    size="large"
                    onClick={() => navigate('/plans')}
                    icon={<ExclamationCircleOutlined />}
                  >
                    Upgrade to Continue
                  </Button>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Feature Access */}
        <Row gutter={[24, 24]}>
          <Col xs={24}>
            <Card>
              <Title level={3} className="mb-6">Feature Access</Title>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className={`p-6 rounded-lg border-2 ${
                  canUseFeatures 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="text-center">
                    <RocketOutlined className={`text-3xl mb-3 ${
                      canUseFeatures ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <Title level={4} className="mb-2">AI Mapping</Title>
                    <Text className={`block mb-3 ${
                      canUseFeatures ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {canUseFeatures 
                        ? 'Access granted - Start mapping your databases' 
                        : 'Access restricted - Upgrade required'
                      }
                    </Text>
                    {canUseFeatures ? (
                      <Button type="primary" onClick={() => navigate('/campaigns')}>
                        Start Mapping
                      </Button>
                    ) : (
                      <Button type="primary" danger onClick={() => navigate('/plans')}>
                        Upgrade Now
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`p-6 rounded-lg border-2 ${
                  canUseFeatures 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="text-center">
                    <RocketOutlined className={`text-3xl mb-3 ${
                      canUseFeatures ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <Title level={4} className="mb-2">Campaign Management</Title>
                    <Text className={`block mb-3 ${
                      canUseFeatures ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {canUseFeatures 
                        ? 'Manage, monitor, and reuse your campaigns' 
                        : 'Premium features require upgrade'
                      }
                    </Text>
                    {canUseFeatures ? (
                      <Button type="primary" onClick={() => navigate('/campaign-management')}>
                        Manage Campaigns
                      </Button>
                    ) : (
                      <Button type="primary" danger onClick={() => navigate('/plans')}>
                        Upgrade Now
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`p-6 rounded-lg border-2 ${
                  canUseFeatures 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="text-center">
                    <CrownOutlined className={`text-3xl mb-3 ${
                      canUseFeatures ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <Title level={4} className="mb-2">Advanced Features</Title>
                    <Text className={`block mb-3 ${
                      canUseFeatures ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {canUseFeatures 
                        ? 'Unlock advanced AI capabilities' 
                        : 'Premium features require upgrade'
                      }
                    </Text>
                    {!canUseFeatures && (
                      <Button type="primary" danger onClick={() => navigate('/plans')}>
                        Upgrade Now
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`p-6 rounded-lg border-2 ${
                  canUseFeatures 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="text-center">
                    <UserOutlined className={`text-3xl mb-3 ${
                      canUseFeatures ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <Title level={4} className="mb-2">User Management</Title>
                    <Text className={`block mb-3 ${
                      canUseFeatures ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {canUseFeatures 
                        ? 'Manage your account and settings' 
                        : 'Account access restricted'
                      }
                    </Text>
                    <Button type="default">
                      Account Settings
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
