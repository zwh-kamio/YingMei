import React, { useState } from 'react';
import { Layout, Button, Modal, Form, Input, message, Dropdown, Avatar, Space } from 'antd';
import { LoginOutlined, UserOutlined, CameraOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';
import { authApi } from '../../services/api';

const { Header } = Layout;

const HeaderBar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, login, logout } = useUserStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (values: { phone: string; password: string }) => {
    setLoginLoading(true);
    try {
      const res = await authApi.login(values.phone, values.password);
      login(res.data.user, res.data.token);
      message.success('登录成功');
      setLoginModalOpen(false);
      loginForm.resetFields();
    } catch (err: any) {
      message.error(err.message || '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    message.info('已退出登录');
  };

  const userMenuItems = [
    { key: 'profile', label: '个人中心', icon: <UserOutlined /> },
    { key: 'vip', label: '会员中心', icon: <CrownOutlined /> },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录', danger: true },
  ];

  return (
    <>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}
          onClick={() => navigate('/')}
        >
          <CameraOutlined style={{ fontSize: 24, color: '#FF6B81' }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>映美</span>
        </div>

        <div>
          {isLoggedIn ? (
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') handleLogout();
                },
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} src={user?.avatarUrl} />
                <span>{user?.nickname || '用户'}</span>
              </Space>
            </Dropdown>
          ) : (
            <Button type="primary" icon={<LoginOutlined />} onClick={() => setLoginModalOpen(true)}>
              登录 / 注册
            </Button>
          )}
        </div>
      </Header>

      <Modal
        title="登录 / 注册"
        open={loginModalOpen}
        onCancel={() => setLoginModalOpen(false)}
        footer={null}
        width={400}
      >
        <Form form={loginForm} layout="vertical" onFinish={handleLogin} style={{ marginTop: 16 }}>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" maxLength={32} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loginLoading} block>
              登录 / 注册
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
            未注册手机号将自动注册
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default HeaderBar;
