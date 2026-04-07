import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Row, Col, Space, Divider, Avatar, Badge } from 'antd';
import { 
  DatabaseOutlined, 
  RobotOutlined, 
  ThunderboltOutlined, 
  SafetyOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  StarOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  CloudOutlined,
  ApiOutlined,
  BarChartOutlined,
  TeamOutlined,
  LockOutlined,
  SyncOutlined,
  EyeOutlined,
  SettingOutlined,
  TrophyOutlined,
  FireOutlined,
  CrownOutlined,
  RightOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

const { Title, Paragraph, Text } = Typography;

const Home: React.FC = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const { scrollYProgress } = useScroll();

  // Animated values
  const y = useTransform(scrollYProgress, [0, 1], [0, -30]);

  const features = [
    {
      icon: <DatabaseOutlined className="text-3xl text-blue-600" />,
      title: "Smart Mapping",
      description: "AI-powered source-to-target mapping with intelligent column matching and data transformation suggestions.",
      color: "blue"
    },
    {
      icon: <RobotOutlined className="text-3xl text-green-600" />,
      title: "AI-Powered",
      description: "Leverage advanced machine learning algorithms to automate complex data mapping processes.",
      color: "green"
    },
    {
      icon: <ThunderboltOutlined className="text-3xl text-yellow-600" />,
      title: "Real-time Processing",
      description: "Process large datasets instantly with optimized algorithms and parallel processing capabilities.",
      color: "yellow"
    },
    {
      icon: <SafetyOutlined className="text-3xl text-purple-600" />,
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption and compliance with industry standards.",
      color: "purple"
    },
    {
      icon: <CloudOutlined className="text-3xl text-indigo-600" />,
      title: "Cloud Native",
      description: "Scalable cloud infrastructure that grows with your business needs and data volume.",
      color: "indigo"
    },
    {
      icon: <ApiOutlined className="text-3xl text-teal-600" />,
      title: "API First",
      description: "Comprehensive REST APIs and webhooks for seamless integration with your existing systems.",
      color: "teal"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO, TechCorp",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      content: "STTM has revolutionized our data integration process. We've reduced mapping time by 90% and eliminated human errors completely.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Data Architect, DataFlow Inc",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
      content: "The AI-powered suggestions are incredibly accurate. Our team can now focus on strategic work instead of manual mapping.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "VP Engineering, CloudScale",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      content: "Best investment we've made in our data infrastructure. The ROI was visible within the first month of implementation.",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 data sources",
        "Basic AI mapping",
        "Email support",
        "Standard templates"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$99",
      period: "per month",
      description: "Ideal for growing businesses",
      features: [
        "Unlimited data sources",
        "Advanced AI mapping",
        "Priority support",
        "Custom templates",
        "API access",
        "Real-time sync"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations",
      features: [
        "Everything in Professional",
        "Dedicated support",
        "Custom integrations",
        "On-premise deployment",
        "SLA guarantee",
        "Training & consulting"
      ],
      popular: false
    }
  ];

  const stats = [
    { label: "Active Users", value: "50,000+", icon: <TeamOutlined /> },
    { label: "Data Sources", value: "500+", icon: <DatabaseOutlined /> },
    { label: "Mappings Created", value: "1M+", icon: <RocketOutlined /> },
    { label: "Uptime", value: "99.9%", icon: <TrophyOutlined /> }
  ];

  const benefits = [
    "Reduce mapping time by up to 90%",
    "Automated data quality validation",
    "Real-time mapping suggestions",
    "Support for 500+ database systems",
    "Intuitive drag-and-drop interface",
    "Comprehensive audit trails"
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <DatabaseOutlined className="text-white text-xl" />
              </div>
              <Title level={3} className="text-gray-900 mb-0 font-bold">STTM</Title>
            </div>
            <Space size="middle">
              <Link to="/login">
                <Button 
                  className="text-white bg-gray-800 border-gray-800 hover:bg-gray-700 hover:border-gray-700 font-semibold px-6 h-10 transition-all duration-300"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  type="primary" 
                  className="bg-blue-600 hover:bg-blue-700 border-0 font-semibold px-6 h-10 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Get Started
                </Button>
              </Link>
            </Space>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section 
        style={{ y }}
        className="pt-20 pb-24 bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <Badge.Ribbon text="NEW" color="blue" className="mb-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full">
                  <FireOutlined className="mr-2" />
                  AI-Powered Mapping
                </div>
              </Badge.Ribbon>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              The Future of
              <span className="block text-blue-600">
                Data Mapping
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Transform your data integration with our revolutionary AI-powered platform. 
              <span className="text-blue-600 font-semibold"> 90% faster mapping</span>, 
              <span className="text-green-600 font-semibold"> 99.9% accuracy</span>, and 
              <span className="text-purple-600 font-semibold"> zero human errors</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <Link to="/register">
                <Button 
                  type="primary" 
                  size="large" 
                  className="h-14 px-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700 border-0 shadow-lg"
                  icon={<RocketOutlined />}
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  size="large" 
                  className="h-14 px-8 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-blue-600 hover:text-blue-600"
                >
                  Sign In
                </Button>
              </Link>
              <Button 
                size="large" 
                className="h-14 px-8 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-blue-600 hover:text-blue-600"
                icon={<PlayCircleOutlined />}
              >
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 text-sm md:text-base">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </Title>
            <Paragraph className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to streamline your data mapping process
            </Paragraph>
          </motion.div>

          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="h-full"
                >
                  <Card 
                    className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 group"
                    bodyStyle={{ padding: '2rem' }}
                  >
                    <div className="mb-6">{feature.icon}</div>
                    <Title level={3} className="text-xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </Title>
                    <Paragraph className="text-gray-600 mb-6">
                      {feature.description}
                    </Paragraph>
                    <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors duration-300">
                      <span>Learn more</span>
                      <RightOutlined className="ml-2" />
                    </div>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Title level={2} className="text-4xl font-bold text-gray-900 mb-6">
                  Why Choose STTM?
                </Title>
                <Paragraph className="text-lg text-gray-600 mb-8">
                  Our platform combines cutting-edge AI technology with user-friendly design 
                  to deliver exceptional results for your data integration needs.
                </Paragraph>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex items-center"
                    >
                      <CheckOutlined className="text-green-500 text-lg mr-3" />
                      <Text className="text-lg text-gray-700">{benefit}</Text>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </Col>
            <Col xs={24} lg={12}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <Card className="shadow-xl border-0">
                  <div className="p-12">
                    <div className="text-6xl mb-6">📊</div>
                    <Title level={3} className="text-2xl font-bold text-gray-900 mb-4">
                      Ready to Transform Your Data?
                    </Title>
                    <Paragraph className="text-lg text-gray-600 mb-8">
                      Join thousands of organizations already using STTM to streamline 
                      their data integration processes.
                    </Paragraph>
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <StarOutlined className="text-yellow-500 text-xl mr-2" />
                        <Text className="text-lg font-semibold text-gray-700">4.9/5 Rating</Text>
                      </div>
                      <div className="flex items-center justify-center">
                        <Text className="text-2xl font-bold text-blue-600">50,000+</Text>
                        <Text className="text-lg text-gray-600 ml-2">Active Users</Text>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </Title>
            <Paragraph className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our customers are saying about their transformation
            </Paragraph>
          </motion.div>

          <motion.div
            key={currentTestimonial}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="shadow-xl border-0">
              <div className="p-12 text-center">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <StarOutlined key={i} className="text-yellow-500 text-2xl mx-1" />
                  ))}
                </div>
                <blockquote className="text-2xl text-gray-700 mb-8 italic">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                <div className="flex items-center justify-center">
                  <Avatar 
                    size={64} 
                    src={testimonials[currentTestimonial].avatar}
                    className="mr-4"
                  />
                  <div className="text-left">
                    <div className="text-xl font-bold text-gray-900">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-gray-600">
                      {testimonials[currentTestimonial].role}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                  index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </Title>
            <Paragraph className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Upgrade or downgrade at any time.
            </Paragraph>
          </motion.div>

          <Row gutter={[32, 32]} justify="center">
            {pricingPlans.map((plan, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="h-full"
                >
                  <Card 
                    className={`h-full border-2 ${plan.popular ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-gray-200'} hover:shadow-xl transition-all duration-300`}
                    bodyStyle={{ padding: '2rem' }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge 
                          count="Most Popular" 
                          style={{ backgroundColor: '#3b82f6' }}
                          className="text-sm font-bold"
                        />
                      </div>
                    )}
                    
                    <div className="text-center mb-8">
                      <Title level={3} className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </Title>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-600 ml-2">/{plan.period}</span>
                      </div>
                      <Paragraph className="text-gray-600">{plan.description}</Paragraph>
                    </div>

                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center">
                          <CheckOutlined className="text-green-500 text-lg mr-3" />
                          <Text className="text-gray-700">{feature}</Text>
                        </div>
                      ))}
                    </div>

                    <Link to="/register">
                      <Button 
                        type={plan.popular ? 'primary' : 'default'}
                        size="large" 
                        className={`w-full h-12 text-lg font-semibold ${
                          plan.popular 
                            ? 'bg-blue-600 hover:bg-blue-700 border-0' 
                            : 'border-2 border-gray-300 hover:border-blue-600'
                        }`}
                      >
                        {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                      </Button>
                    </Link>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Title level={2} className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Data?
            </Title>
            <Paragraph className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Join thousands of organizations already using STTM to streamline 
              their data integration processes. Start your free trial today.
            </Paragraph>
            <Space size="large" className="flex flex-col sm:flex-row justify-center">
              <Link to="/register">
                <Button 
                  type="primary" 
                  size="large" 
                  className="h-14 px-8 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-50 border-0 shadow-lg"
                  icon={<RocketOutlined />}
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button 
                  size="large" 
                  className="h-14 px-8 text-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent"
                >
                  Sign In
                </Button>
              </Link>
            </Space>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <DatabaseOutlined className="text-white text-xl" />
                </div>
                <h3 className="text-white mb-0 font-bold text-2xl">STTM</h3>
              </div>
              <Paragraph className="text-gray-400">
                The future of data mapping is here. Transform your data integration with AI.
              </Paragraph>
            </div>
            <div>
              <h4 className="text-white mb-4 font-bold text-xl">Product</h4>
              <div className="space-y-2">
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Features</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Pricing</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">API</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Documentation</Link></div>
              </div>
            </div>
            <div>
              <h4 className="text-white mb-4 font-bold text-xl">Company</h4>
              <div className="space-y-2">
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">About</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Blog</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Careers</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Contact</Link></div>
              </div>
            </div>
            <div>
              <h4 className="text-white mb-4 font-bold text-xl">Support</h4>
              <div className="space-y-2">
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Help Center</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Community</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Status</Link></div>
                <div><Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Security</Link></div>
              </div>
            </div>
          </div>
          <Divider className="border-gray-700" />
          <div className="flex flex-col md:flex-row justify-between items-center">
                <Text className="text-gray-400">
                  © 2025 UltraAI Agent. All rights reserved.
                </Text>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy</Link>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Terms</Link>
              <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-200">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
