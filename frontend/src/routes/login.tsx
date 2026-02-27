import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';
import type { LoginRequest } from '../types/auth';
import { useState } from 'react';

const { Text } = Typography;

function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: LoginRequest) => {
        setLoading(true);
        try {
            const response = await authService.login(values);
            authService.setToken(response.token);
            authService.setUser(response.user);
            message.success('Login successful!');
            navigate({ to: '/dashboard' });
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-outer" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 20% 80%, rgba(128, 0, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(128, 0, 0, 0.1) 0%, transparent 50%)',
                zIndex: 0,
            }} />

            <Card
                className="auth-card"
                style={{
                    width: 420,
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 20,
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    zIndex: 1,
                    position: 'relative',
                }}
                styles={{
                    body: {
                        padding: '48px 40px',
                    }
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: '#800000',
                        marginBottom: '16px',
                        letterSpacing: '-0.02em',
                    }}>
                        Welcome Back
                    </div>
                    <Text
                        style={{
                            fontSize: '16px',
                            color: 'rgba(128, 0, 0, 0.7)',
                            lineHeight: '1.5',
                        }}
                    >
                        Sign in to your account
                    </Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please enter a valid email!' },
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: 'rgba(128, 0, 0, 0.6)' }} />}
                            placeholder="Email"
                            style={{
                                borderRadius: '12px',
                                border: '1px solid rgba(128, 0, 0, 0.2)',
                                background: 'rgba(255, 255, 255, 0.8)',
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Please input your password!' }]}
                        style={{ marginBottom: '32px' }}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: 'rgba(128, 0, 0, 0.6)' }} />}
                            placeholder="Password"
                            style={{
                                borderRadius: '12px',
                                border: '1px solid rgba(128, 0, 0, 0.2)',
                                background: 'rgba(255, 255, 255, 0.8)',
                            }}
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
                                background: '#800000',
                                border: 'none',
                                height: 52,
                                fontSize: 16,
                                fontWeight: 600,
                                borderRadius: '12px',
                                boxShadow: '0 4px 16px rgba(128, 0, 0, 0.3)',
                            }}
                        >
                            Sign In
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Text style={{ color: 'rgba(128, 0, 0, 0.6)' }}>
                            Don't have an account?{' '}
                            <a
                                onClick={() => navigate({ to: '/register' })}
                                style={{
                                    color: '#800000',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    borderBottom: '1px solid rgba(128, 0, 0, 0.3)',
                                    paddingBottom: '2px',
                                }}
                            >
                                Sign up
                            </a>
                        </Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export const Route = createFileRoute('/login')({
    component: LoginPage,
});
