import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    first_name?: string;
    last_name?: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const success = await register({
        email: values.email,
        username: values.username,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
      });
      
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <Title level={2} className="text-gray-800 mb-2">
            Create Account
          </Title>
          <Text className="text-gray-600">
            Join STTM and start your 7-day free trial
          </Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="Email"
              className="h-12"
            />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please input your username!' },
              { min: 3, message: 'Username must be at least 3 characters!' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Username"
              className="h-12"
            />
          </Form.Item>

          <Form.Item
            name="first_name"
          >
            <Input
              prefix={<IdcardOutlined className="text-gray-400" />}
              placeholder="First Name (Optional)"
              className="h-12"
            />
          </Form.Item>

          <Form.Item
            name="last_name"
          >
            <Input
              prefix={<IdcardOutlined className="text-gray-400" />}
              placeholder="Last Name (Optional)"
              className="h-12"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
              className="h-12"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: 'Please confirm your password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Confirm Password"
              className="h-12"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 border-0"
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Divider className="my-6">
          <Text className="text-gray-500">Already have an account?</Text>
        </Divider>

        <div className="text-center">
          <Link to="/login">
            <Button type="link" className="text-blue-600 hover:text-blue-700">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <Text className="text-blue-800 text-sm">
            <strong>🎉 Free Trial:</strong> Get 7 days of full access to all features. 
            No credit card required to start.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Register;
