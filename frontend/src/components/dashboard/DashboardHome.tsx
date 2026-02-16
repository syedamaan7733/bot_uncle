
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, Statistic, Button, Row, Col, Typography, Skeleton } from 'antd';
import { ShopOutlined, AppstoreOutlined, TagsOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link } from '@tanstack/react-router';
import { authService } from '../../services/auth.service';

const { Title, Text } = Typography;

export function DashboardHome() {
    const user = authService.getUser();

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('/products');
            return res.data;
        },
    });

    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get('/categories');
            return res.data;
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <Title level={2} style={{ margin: 0 }}>Welcome back, {user?.business?.name}</Title>
                <Text type="secondary">Here is what's happening with your store today.</Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                    <Skeleton loading={loadingProducts} active avatar paragraph={{ rows: 1 }}>
                        <Statistic
                            title={<span className="text-gray-500 font-medium">Total Products</span>}
                            value={products?.length || 0}
                            prefix={<AppstoreOutlined className="text-blue-500 bg-blue-50 p-2 rounded-lg mr-2" />}
                            valueStyle={{ fontWeight: 'bold' }}
                        />
                    </Skeleton>
                </Card>
                <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                    <Skeleton loading={loadingCategories} active avatar paragraph={{ rows: 1 }}>
                        <Statistic
                            title={<span className="text-gray-500 font-medium">Total Categories</span>}
                            value={categories?.length || 0}
                            prefix={<TagsOutlined className="text-purple-500 bg-purple-50 p-2 rounded-lg mr-2" />}
                            valueStyle={{ fontWeight: 'bold' }}
                        />
                    </Skeleton>
                </Card>
                <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                    <div className="flex flex-col h-full justify-between gap-4">
                        <div>
                            <Text className="text-green-800 font-semibold block mb-1">Your Store is Live</Text>
                            <Text type="secondary" className="text-xs">Share your store link with customers to start selling.</Text>
                        </div>
                        <a
                            href={`/store/${user?.business?.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-green-600 font-medium hover:text-green-700 hover:underline"
                        >
                            Visit Store <ArrowRightOutlined className="ml-1" />
                        </a>
                    </div>
                </Card>
            </div>

            <div className="mt-8">
                <Title level={4}>Quick Actions</Title>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <Link to="/dashboard/products">
                        <Button block size="large" className="h-24 rounded-xl border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-500 transition-colors">
                            <PlusOutlined className="text-xl" />
                            <span>Add Product</span>
                        </Button>
                    </Link>
                    <Link to="/dashboard/categories">
                        <Button block size="large" className="h-24 rounded-xl border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:text-purple-500 transition-colors">
                            <PlusOutlined className="text-xl" />
                            <span>Add Category</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
