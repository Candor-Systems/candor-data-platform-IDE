import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider as AntdConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './components/Dashboard';
import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Campaigns from './pages/Campaigns';
import CampaignManagement from './pages/CampaignManagement';
import CampaignHistory from './components/CampaignHistory';
import Results from './pages/Results';
import Glossary from './pages/Glossary';

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects authenticated users to dashboard)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdConfigProvider
        theme={{
          token: {
            colorPrimary: '#2563eb',
            borderRadius: 8,
          },
        }}
      >
        <AntdApp>
          <AuthProvider>
            <ConfigProvider>
              <Router>
                <div className="min-h-screen bg-gray-50">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    } />
                    <Route path="/register" element={
                      <PublicRoute>
                        <Register />
                      </PublicRoute>
                    } />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/configuration" element={<Navigate to="/campaigns" replace />} />
                    <Route path="/plans" element={
                      <ProtectedRoute>
                        <Layout>
                          <SubscriptionPlans />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/subscription-plans" element={
                      <ProtectedRoute>
                        <SubscriptionPlans />
                      </ProtectedRoute>
                    } />
                    <Route path="/campaigns" element={
                      <ProtectedRoute>
                        <Layout>
                          <Campaigns />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/campaign-management" element={
                      <ProtectedRoute>
                        <Layout>
                          <CampaignManagement />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/campaign-history" element={
                      <ProtectedRoute>
                        <Layout>
                          <CampaignHistory />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/results" element={
                      <ProtectedRoute>
                        <Layout>
                          <Results />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/glossary" element={
                      <ProtectedRoute>
                        <Layout>
                          <Glossary />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/subscription-success" element={
                      <ProtectedRoute>
                        <Layout>
                          <SubscriptionSuccess />
                        </Layout>
                      </ProtectedRoute>
                    } />
                  </Routes>
                  <Toaster position="top-right" />
                </div>
              </Router>
            </ConfigProvider>
          </AuthProvider>
        </AntdApp>
      </AntdConfigProvider>
    </QueryClientProvider>
  );
}

export default App;