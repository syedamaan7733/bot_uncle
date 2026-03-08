import { Layout, Menu, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import {
    AppstoreOutlined,
    TagsOutlined,
    LogoutOutlined,
    ShopOutlined,
    SettingOutlined,
    MenuOutlined,
    CloseOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { authService } from '../../services/auth.service';
import { useState, useEffect } from 'react';
import BusinessBranding from '../branding/BusinessBranding';

const { Header, Sider, Content } = Layout;

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getUser();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setSidebarCollapsed(false);
            } else {
                setSidebarCollapsed(true);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleLogout = () => {
        authService.logout();
        navigate({ to: '/login' });
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    const menuItems = [
        {
            key: '/dashboard/products',
            icon: <AppstoreOutlined className="text-lg" />,
            label: 'Products',
            onClick: () => {
                navigate({ to: '/dashboard/products' });
                if (isMobile) setSidebarCollapsed(true);
            },
        },
        {
            key: '/dashboard/categories',
            icon: <TagsOutlined className="text-lg" />,
            label: 'Categories',
            onClick: () => {
                navigate({ to: '/dashboard/categories' });
                if (isMobile) setSidebarCollapsed(true);
            },
        },
        {
            key: '/dashboard/import',
            icon: <ImportOutlined className="text-lg" />,
            label: 'Smart Import',
            onClick: () => {
                navigate({ to: '/dashboard/import' });
                if (isMobile) setSidebarCollapsed(true);
            },
        },
        {
            key: '/dashboard/settings',
            icon: <SettingOutlined className="text-lg" />,
            label: 'Settings',
            onClick: () => {
                navigate({ to: '/dashboard/settings' });
                if (isMobile) setSidebarCollapsed(true);
            },
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#ffffff' }}>
            <Sider
                width={280}
                collapsed={sidebarCollapsed}
                collapsedWidth={isMobile ? 0 : 80}
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    position: isMobile ? 'fixed' : 'fixed',
                    height: '100vh',
                    left: isMobile && sidebarCollapsed ? '-280px' : 0,
                    top: 0,
                    zIndex: 100,
                    overflow: 'auto',
                    transition: 'left 0.3s ease',
                }}
                className="glassmorphism-sidebar"
            >
                <div style={{ padding: '24px 16px 16px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(128, 0, 0, 0.1)',
                            marginBottom: '24px',
                            cursor: 'pointer',
                        }}
                        onClick={() => navigate({ to: '/dashboard' })}
                    >

                        {!sidebarCollapsed && (
                            <BusinessBranding name={user.business.name} logoUrl={user.business.logoUrl} />

                        )}
                    </div>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    style={{
                        borderRight: 0,
                        background: 'transparent',
                        fontSize: '16px',
                        padding: '0 16px',
                    }}
                    className="glassmorphism-menu"
                    inlineCollapsed={sidebarCollapsed && !isMobile}
                />
            </Sider>
            <Layout style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280) }}>
                <Header
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
                        padding: '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        height: 80,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {isMobile && (
                            <Button
                                type="text"
                                icon={sidebarCollapsed ? <MenuOutlined /> : <CloseOutlined />}
                                onClick={toggleSidebar}
                                style={{
                                    color: '#800000',
                                    fontSize: '18px',
                                }}
                            />
                        )}
                        <h1
                            style={{
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: 700,
                                color: '#800000',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Dashboard
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {user.business?.slug && <Button
                            href={`/store/${user.business.slug}`}
                            rel="noopener noreferrer"
                            target="_blank"
                            icon={<ShopOutlined />}
                            classNames="
                              flex items-center gap-2
                              px-3
                              !bg-maroon-100 !text-maroon-700
                              border border-maroon-200
                              rounded-xl
                              font-medium text-sm
                              transition-all
                              hover:bg-maroon-600 hover:text-white hover:border-maroon-600"
                        >
                            Visit Store
                        </Button>}
                        <LogoutOutlined
                            onClick={handleLogout}
                            style={{
                                fontSize: 20,
                                color: 'rgba(128, 0, 0, 0.6)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                            }}
                            className="hover:bg-red-50 hover:text-red-600"
                            title="Logout"
                        />
                    </div>
                </Header>
                <Content
                    style={{
                        padding: isMobile ? 16 : 32,
                        background: '#ffffff',
                        minHeight: 'calc(100vh - 80px)',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>

            {/* Mobile overlay */}
            {isMobile && !sidebarCollapsed && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 99,
                    }}
                    onClick={() => setSidebarCollapsed(true)}
                />
            )}
        </Layout>
    );
}
