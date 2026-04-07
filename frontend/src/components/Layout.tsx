import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar, Dropdown, Menu as AntMenu } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  Home, 
  Settings, 
  GitMerge, 
  BarChart3, 
  BookOpen,
  Database,
  Target,
  User,
  LogOut,
  Crown,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout, hasActiveSubscription, isTrialActive, daysRemaining, trialDaysRemaining } = useAuth();

  // Profile dropdown menu
  const profileMenuItems = [
    {
      key: 'profile-header',
      disabled: true,
      label: (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <Avatar size={40} className="bg-blue-600">
              {user?.first_name?.[0]}{user?.last_name?.[0] || user?.username?.[0] || 'SK'}
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-base">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.username || 'SK sathish'
                }
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap">
                {user?.email || 'sathish@cygnussoftwa.com'}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'subscription',
      disabled: true,
      label: (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-sm mb-1">
            <Crown size={14} className={hasActiveSubscription ? "text-yellow-500" : "text-gray-400"} />
            <span className="text-gray-600 font-medium">
              {user?.subscription_status?.plan_type || (isTrialActive ? 'Trial Plan' : 'Free Plan')}
            </span>
            <div className={`h-2 w-2 rounded-full ${
              hasActiveSubscription ? 'bg-green-500' : 
              user?.subscription_status?.is_expired ? 'bg-red-500' : 
              isTrialActive ? 'bg-blue-500' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Calendar size={12} />
            <span>
              {isTrialActive 
                ? `Trial: ${trialDaysRemaining} days left`
                : hasActiveSubscription 
                  ? `Expires: ${user?.subscription_status?.current_period_end ? new Date(user.subscription_status.current_period_end).toLocaleDateString() : 'Unknown'}`
                  : 'No active subscription'
              }
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      disabled: true,
      label: (
        <div className="px-4 py-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Active</span>
          </div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: (
        <div className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
          <LogOut size={16} />
          <span>Sign Out</span>
        </div>
      ),
      onClick: logout,
    },
  ];

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Create Campaign', href: '/campaigns', icon: Target },
    { name: 'Campaign Management', href: '/campaign-management', icon: GitMerge },
    { name: 'Campaign History', href: '/campaign-history', icon: BarChart3 },
    { name: 'Results', href: '/results', icon: BarChart3 },
    { name: 'Glossary', href: '/glossary', icon: BookOpen },
  ];

  return (
    <>
      <style>
        {`
          .profile-dropdown-overlay .ant-dropdown-menu {
            padding: 0 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            border: 1px solid #e5e7eb !important;
            min-width: 400px !important;
            max-width: 500px !important;
          }
          .profile-dropdown-overlay .ant-dropdown-menu-item {
            padding: 0 !important;
            margin: 0 !important;
          }
          .profile-dropdown-overlay .ant-dropdown-menu-item-disabled {
            cursor: default !important;
            opacity: 1 !important;
          }
          .profile-dropdown-overlay .ant-dropdown-menu-item:hover {
            background-color: transparent !important;
          }
          .profile-dropdown-overlay .ant-dropdown-menu-item:not(.ant-dropdown-menu-item-disabled):hover {
            background-color: #f9fafb !important;
          }
        `}
      </style>
      <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white shadow-lg flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">AI-STTM</h1>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                  ${!sidebarOpen ? 'justify-center' : ''}
                `}
                title={!sidebarOpen ? item.name : ''}
              >
                <Icon className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''} transition-all duration-200`} />
                {sidebarOpen && (
                  <span className="transition-all duration-200">{item.name}</span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Toggle Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-full flex items-center justify-center p-3 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 hover:scale-105 ${
              !sidebarOpen ? 'justify-center' : 'justify-start'
            }`}
            title={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Minimize</span>
              </>
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 hover:scale-105 lg:hidden"
                title={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">System Active</span>
              </div>
              <Dropdown 
                menu={{ 
                  items: profileMenuItems,
                  className: 'profile-dropdown-menu'
                }}
                placement="bottomRight"
                trigger={['click']}
                className="cursor-pointer"
                overlayStyle={{ 
                  minWidth: '400px',
                  maxWidth: '500px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                overlayClassName="profile-dropdown-overlay"
              >
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <Avatar size={32} className="bg-blue-600">
                    {user?.first_name?.[0]}{user?.last_name?.[0] || user?.username?.[0] || 'SK'}
                  </Avatar>
                  <span className="text-gray-700 font-medium text-sm">
                    {user?.first_name || user?.username || 'SK'}
                  </span>
                </div>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      
      {/* Floating Toggle Button for Mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-4 left-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 md:hidden"
        title={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </button>
      </div>
    </>
  );
};

export default Layout;