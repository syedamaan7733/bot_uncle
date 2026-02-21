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
        <Layout className="min-h-screen bg-slate-50 font-sans">
            <Sider
                width={280}
                collapsed={sidebarCollapsed}
                collapsedWidth={isMobile ? 0 : 80}
                style={{
                    left: isMobile && sidebarCollapsed ? '-280px' : 0,
                }}
                className={`fixed top-0 h-screen z-[100] !bg-white/70 backdrop-blur-xl border-r border-slate-200 shadow-[10px_0_30px_rgba(0,0,0,0.03)] transition-[left] duration-300 ease-in-out`}
            >
                <div className="p-6 pb-4">
                    <div
                        className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer mb-6"
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
                    }}
                    className="!bg-transparent text-slate-600 font-medium px-4 text-base [&_.ant-menu-item-selected]:!bg-primary/10 [&_.ant-menu-item-selected]:!text-primary [&_.ant-menu-item]:rounded-xl [&_.ant-menu-item]:mb-2 hover:[&_.ant-menu-item:not(.ant-menu-item-selected)]:!bg-slate-100/50"
                    inlineCollapsed={sidebarCollapsed && !isMobile}
                />
            </Sider>
            <Layout className="transition-all duration-300" style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280) }}>
                <Header
                    className="px-6 flex items-center justify-between sticky top-0 z-[99] h-20 !bg-white/70 backdrop-blur-lg border-b border-white/50 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <Button
                                type="text"
                                icon={sidebarCollapsed ? <MenuOutlined /> : <CloseOutlined />}
                                onClick={toggleSidebar}
                                className="text-primary hover:text-primary/80 hover:bg-primary/5 flex items-center justify-center p-2 rounded-xl text-lg transition-colors"
                            />
                        )}
                        <h1
                            className="m-0 text-2xl font-bold text-slate-800 tracking-tight"
                        >
                            Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {user.business.slug && <Button
                            href={`/store/${user.business.slug}`}
                            rel="noopener noreferrer"
                            target="_blank"
                            icon={<ShopOutlined />}
                            className="flex items-center gap-2 px-4 h-10 border-none bg-primary/10 text-primary hover:!bg-primary hover:!text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-[0_4px_12px_rgba(128,0,0,0.2)]"
                        >
                            Visit Store
                        </Button>}
                        <LogoutOutlined
                            onClick={handleLogout}
                            className="text-xl text-slate-500 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl cursor-pointer transition-all focus:outline-none"
                            title="Logout"
                        />
                    </div>
                </Header>
                <Content
                    className={`bg-slate-50/50 min-h-[calc(100vh-80px)] ${isMobile ? 'p-4' : 'p-8'}`}
                >
                    <Outlet />
                </Content>
            </Layout>

            {/* Mobile overlay */}
            {isMobile && !sidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99] transition-opacity"
                    onClick={() => setSidebarCollapsed(true)}
                />
            )}
        </Layout>
    );
}
