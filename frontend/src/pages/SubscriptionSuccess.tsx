import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Result, Spin } from 'antd';
import { CheckCircleOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';

const { Title, Text, Paragraph } = Typography;

const SubscriptionSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Here you could verify the session with your backend
      // For now, we'll just show success
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Result
          icon={<CheckCircleOutlined className="text-green-500" />}
          status="success"
          title="Subscription Successful!"
          subTitle="Welcome to STTM! Your subscription has been activated."
          extra={[
            <Button 
              type="primary" 
              size="large" 
              icon={<HomeOutlined />}
              onClick={() => navigate('/dashboard')}
              key="dashboard"
            >
              Go to Dashboard
            </Button>,
            <Button 
              size="large" 
              onClick={() => navigate('/subscription-plans')}
              key="plans"
            >
              View Plans
            </Button>
          ]}
        >
          <Card className="mt-8">
            <Title level={4} className="mb-4">What's Next?</Title>
            <Paragraph>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your 7-day free trial has started</li>
                <li>You can now access all premium features</li>
                <li>Your subscription will automatically renew monthly</li>
                <li>You can cancel anytime from your account settings</li>
              </ul>
            </Paragraph>
          </Card>

          <Card className="mt-6">
            <Title level={4} className="mb-4">Need Help?</Title>
            <Paragraph>
              If you have any questions about your subscription or need assistance, 
              please don't hesitate to contact our support team.
            </Paragraph>
          </Card>
        </Result>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2025 UltraAI Agent. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SubscriptionSuccess;
