import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, List, Tag, Modal, Spin, App } from 'antd';
import { CheckOutlined, CrownOutlined, StarOutlined, RocketOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { loadStripe } from '@stripe/stripe-js';

const { Title, Text, Paragraph } = Typography;

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  stripe_price_id: string;
}

const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [stripe, setStripe] = useState<any>(null);
  const { user, hasActiveSubscription, isTrialActive, daysRemaining, trialDaysRemaining } = useAuth();
  const { message } = App.useApp();

  useEffect(() => {
    // Load Stripe
    const loadStripeInstance = async () => {
      const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51Rpf9RRuFd85fFks1RzubVduP3cs8DBU7woF1nLKbD1gsTJvkxVec418zIGiJqbCYTUzRTCbSjDCmvkLsnXmK7cf001aLNXxw8');
      setStripe(stripeInstance);
    };
    loadStripeInstance();

    // Load plans
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response.data);
    } catch (error) {
      message.error('Failed to load subscription plans');
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!stripe) {
      message.error('Stripe is not loaded. Please refresh the page.');
      return;
    }

    setSelectedPlan(plan);
    setLoading(true);

    try {
      // Create checkout session
      const response = await api.post('/payments/create-checkout-session', {
        plan_type: plan.id
      });

      const { url } = response.data;

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        message.error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      message.error(error.response?.data?.detail || 'Failed to create checkout session');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic':
        return <StarOutlined className="text-2xl text-blue-500" />;
      case 'pro':
        return <CrownOutlined className="text-2xl text-purple-500" />;
      case 'enterprise':
        return <RocketOutlined className="text-2xl text-green-500" />;
      default:
        return <StarOutlined className="text-2xl text-blue-500" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'basic':
        return 'border-blue-200 bg-blue-50';
      case 'pro':
        return 'border-purple-200 bg-purple-50';
      case 'enterprise':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (plans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Title level={1} className="text-gray-800 mb-4">
            Choose Your Plan
          </Title>
          <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your AI-powered database mapping needs. 
            Start with a 7-day free trial, no credit card required.
          </Paragraph>
        </div>

        {/* Current Status */}
        {user && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <Title level={4} className="mb-2">
                  Current Status: {user.subscription_status.plan_type || 'Trial'}
                </Title>
                {isTrialActive ? (
                  <Text className="text-blue-600">
                    🎉 Trial active - {trialDaysRemaining} days remaining
                  </Text>
                ) : hasActiveSubscription ? (
                  <Text className="text-green-600">
                    ✅ Active subscription - {daysRemaining} days remaining
                  </Text>
                ) : (
                  <Text className="text-red-600">
                    ❌ Subscription expired - Please upgrade to continue
                  </Text>
                )}
              </div>
              {hasActiveSubscription && (
                <Button danger onClick={() => message.info('Contact support to cancel subscription')}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`h-full transition-all duration-300 hover:shadow-lg ${
                getPlanColor(plan.id)
              }`}
              bodyStyle={{ padding: '2rem' }}
            >
              <div className="text-center mb-6">
                <div className="mb-4">{getPlanIcon(plan.id)}</div>
                <Title level={3} className="text-gray-800 mb-2">
                  {plan.name}
                </Title>
                <div className="mb-4">
                  <Text className="text-4xl font-bold text-gray-800">${plan.price}</Text>
                  <Text className="text-gray-600 ml-2">/month</Text>
                </div>
              </div>

              <List
                dataSource={plan.features}
                renderItem={(feature) => (
                  <List.Item className="border-0 px-0">
                    <div className="flex items-center">
                      <CheckOutlined className="text-green-500 mr-3" />
                      <Text className="text-gray-700">{feature}</Text>
                    </div>
                  </List.Item>
                )}
                className="mb-8"
              />

              <Button
                type="primary"
                size="large"
                block
                loading={loading && selectedPlan?.id === plan.id}
                onClick={() => handleSubscribe(plan)}
                className={`h-12 ${
                  plan.id === 'pro' 
                    ? 'bg-purple-600 hover:bg-purple-700 border-0' 
                    : plan.id === 'enterprise'
                    ? 'bg-green-600 hover:bg-green-700 border-0'
                    : 'bg-blue-600 hover:bg-blue-700 border-0'
                }`}
              >
                {hasActiveSubscription && user?.subscription_status.plan_type === plan.id
                  ? 'Current Plan'
                  : 'Choose Plan'
                }
              </Button>

              {plan.id === 'pro' && (
                <div className="mt-4 text-center">
                  <Tag color="purple" className="text-sm">
                    Most Popular
                  </Tag>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Trial Info */}
        <div className="mt-12 text-center">
          <Card className="bg-blue-50 border-blue-200">
            <Title level={4} className="text-blue-800 mb-2">
              🎉 Start Your Free Trial Today
            </Title>
            <Paragraph className="text-blue-700 mb-0">
              All plans include a 7-day free trial. No credit card required to start. 
              Cancel anytime during the trial period.
            </Paragraph>
          </Card>
        </div>
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

export default SubscriptionPlans;
