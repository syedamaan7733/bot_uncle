import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import {
    AppstoreOutlined,
    TagsOutlined,
    LogoutOutlined,
    ShopOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { authService } from '../../services/auth.service';

const { Header, Sider, Content } = Layout;

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getUser();

    const handleLogout = () => {
        authService.logout();
        navigate({ to: '/login' });
    };

    const menuItems = [
        {
            key: '/dashboard/products',
            icon: <AppstoreOutlined />,
            label: 'Products',
            onClick: () => navigate({ to: '/dashboard/products' }),
        },
        {
            key: '/dashboard/categories',
            icon: <TagsOutlined />,
            label: 'Categories',
            onClick: () => navigate({ to: '/dashboard/categories' }),
        },
        {
            key: '/dashboard/settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => navigate({ to: '/dashboard/settings' }),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    background: '#fff',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    height: 64,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => navigate({ to: '/dashboard' })} className="cursor-pointer">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                        <ShopOutlined style={{ fontSize: 24, color: '#4f46e5' }} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                        {user?.business?.name || 'Dashboard'}
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {user?.business?.slug && (
                        <a
                            href={`/store/${user?.business?.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full transition-colors font-medium text-sm text-decoration-none"
                            style={{ textDecoration: 'none' }}
                        >
                            <span>View Store</span>
                            <ShopOutlined />
                        </a>
                    )}

                    <div className="h-8 w-px bg-gray-200 mx-2" />

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-medium text-gray-900">{user?.business?.name}</div>
                            <div className="text-xs text-gray-500">{user?.email}</div>
                        </div>
                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                            {user?.business?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>

                    <LogoutOutlined
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg cursor-pointer"
                        title="Logout"
                    />
                </div>
            </Header>
            <Layout>
                <Sider
                    width={220}
                    style={{
                        background: '#fff',
                        borderRight: '1px solid #f0f0f0',
                    }}
                >
                    <Menu
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ borderRight: 0, paddingTop: 16 }}
                    />
                </Sider>
                <Content
                    style={{
                        padding: 24,
                        background: '#f5f5f5',
                        minHeight: 'calc(100vh - 64px)',
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
