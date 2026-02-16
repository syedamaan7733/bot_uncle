import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, PhoneOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';
import type { RegisterRequest } from '../types/auth';
import { useState } from 'react';

const { Title, Text } = Typography;

function RegisterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: RegisterRequest) => {
        setLoading(true);
        try {
            const response = await authService.register(values);
            authService.setToken(response.token);
            authService.setUser(response.user);
            message.success('Registration successful!');
            navigate({ to: '/dashboard' });
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            <Card
                style={{
                    width: 450,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 16,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title level={2} style={{ marginBottom: 8 }}>Create Account</Title>
                    <Text type="secondary">Start selling via WhatsApp today</Text>
                </div>

                <Form
                    name="register"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please enter a valid email!' },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Email"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Please input your password!' },
                            { min: 6, message: 'Password must be at least 6 characters!' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Password (min 6 characters)"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="businessName"
                        rules={[{ required: true, message: 'Please input your business name!' }]}
                    >
                        <Input
                            prefix={<ShopOutlined />}
                            placeholder="Business Name"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="whatsappNumber"
                    >
                        <Input
                            prefix={<PhoneOutlined />}
                            placeholder="WhatsApp Number (optional)"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            block
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                height: 48,
                                fontSize: 16,
                                fontWeight: 600,
                            }}
                        >
                            Create Account
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">
                            Already have an account?{' '}
                            <a
                                onClick={() => navigate({ to: '/login' })}
                                style={{ color: '#667eea', fontWeight: 600 }}
                            >
                                Sign in
                            </a>
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export const Route = createFileRoute('/register')({
    component: RegisterPage,
});
