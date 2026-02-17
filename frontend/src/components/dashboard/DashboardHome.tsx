
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, Statistic, Button, Typography, Skeleton } from 'antd';
import { AppstoreOutlined, TagsOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <Title
                    level={1}
                    style={{
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: 600,
                        color: '#800000',
                        lineHeight: '1.2',
                        letterSpacing: '-0.02em',
                        marginBottom: '8px',
                    }}
                >
                    Welcome back, {user?.business?.name}
                </Title>
                <Text
                    style={{
                        fontSize: '16px',
                        color: 'rgba(128, 0, 0, 0.7)',
                        lineHeight: '1.4',
                    }}
                >
                    Here is what's happening with your store today.
                </Text>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '48px',
            }}>
                <Card
                    variant='borderless'
                    style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        transition: 'all 0.3s ease',
                    }}
                    className="hover:shadow-glass"
                >
                    <Skeleton loading={loadingProducts} active avatar paragraph={{ rows: 1 }}>
                        <Statistic
                            title={
                                <span
                                    style={{
                                        fontSize: '14px',
                                        color: 'rgba(128, 0, 0, 0.7)',
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Total Products
                                </span>
                            }
                            value={products?.length || 0}
                            prefix={
                                <div
                                    style={{
                                        background: 'rgba(0, 123, 255, 0.1)',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px',
                                    }}
                                >
                                    <AppstoreOutlined style={{ fontSize: 20, color: '#007bff' }} />
                                </div>
                            }
                            styles={{
                                content: {
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    color: '#007bff',
                                }
                            }}
                        />
                    </Skeleton>
                </Card>
                <Card
                    variant='borderless'
                    style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        transition: 'all 0.3s ease',
                    }}
                    className="hover:shadow-glass"
                >
                    <Skeleton loading={loadingCategories} active avatar paragraph={{ rows: 1 }}>
                        <Statistic
                            title={
                                <span
                                    style={{
                                        fontSize: '14px',
                                        color: 'rgba(128, 0, 0, 0.7)',
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Total Categories
                                </span>
                            }
                            value={categories?.length || 0}
                            prefix={
                                <div
                                    style={{
                                        background: 'rgba(147, 51, 234, 0.1)',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '12px',
                                    }}
                                >
                                    <TagsOutlined style={{ fontSize: 20, color: '#9333ea' }} />
                                </div>
                            }
                            styles={{
                                content: {
                                    fontSize: '32px',
                                    fontWeight: 'bold',
                                    color: '#9333ea',
                                }
                            }}
                        />
                    </Skeleton>
                </Card>
                <Card
                    variant='borderless'
                    style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        gridColumn: 'span 1',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '16px' }}>
                        <div>
                            <Text
                                style={{
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: '#22c55e',
                                    display: 'block',
                                    marginBottom: '4px',
                                }}
                            >
                                Your Store is Live
                            </Text>
                            <Text
                                style={{
                                    fontSize: '14px',
                                    color: 'rgba(34, 197, 94, 0.7)',
                                    lineHeight: '1.5',
                                }}
                            >
                                Share your store link with customers to start selling.
                            </Text>
                        </div>
                        <a
                            href={`/store/${user?.business?.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: '#22c55e',
                                fontWeight: 500,
                                fontSize: '14px',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                            }}
                            className="hover:text-green-700 hover:underline"
                        >
                            Visit Store <ArrowRightOutlined style={{ marginLeft: '4px' }} />
                        </a>
                    </div>
                </Card>
            </div>

            <div style={{ marginTop: '48px' }}>
                <Title
                    level={3}
                    style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#800000',
                        marginBottom: '24px',
                    }}
                >
                    Quick Actions
                </Title>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                }}>
                    <Link to="/dashboard/products" style={{ textDecoration: 'none' }}>
                        <Button
                            block
                            size="large"
                            style={{
                                height: '80px',
                                borderRadius: '12px',
                                border: '2px dashed rgba(128, 0, 0, 0.3)',
                                background: 'rgba(255, 255, 255, 0.5)',
                                backdropFilter: 'blur(5px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '16px',
                                fontWeight: 500,
                                color: 'rgba(128, 0, 0, 0.7)',
                                transition: 'all 0.3s ease',
                            }}
                            className="hover:border-primary hover:text-primary hover:bg-primary/5"
                        >
                            <PlusOutlined style={{ fontSize: '20px' }} />
                            <span>Add Product</span>
                        </Button>
                    </Link>
                    <Link to="/dashboard/categories" style={{ textDecoration: 'none' }}>
                        <Button
                            block
                            size="large"
                            style={{
                                height: '80px',
                                borderRadius: '12px',
                                border: '2px dashed rgba(128, 0, 0, 0.3)',
                                background: 'rgba(255, 255, 255, 0.5)',
                                backdropFilter: 'blur(5px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '16px',
                                fontWeight: 500,
                                color: 'rgba(128, 0, 0, 0.7)',
                                transition: 'all 0.3s ease',
                            }}
                            className="hover:border-primary hover:text-primary hover:bg-primary/5"
                        >
                            <PlusOutlined style={{ fontSize: '20px' }} />
                            <span>Add Category</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
