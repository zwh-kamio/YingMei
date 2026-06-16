import React from 'react';
import { Layout } from 'antd';
import HeaderBar from './HeaderBar';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, showHeader = true }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {showHeader && <HeaderBar />}
      <Content>{children}</Content>
    </Layout>
  );
};

export default MainLayout;
