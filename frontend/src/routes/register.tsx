import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, PhoneOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';
import type { RegisterRequest } from '../types/auth';
import { useState } from 'react';

const { Text } = Typography;

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
        <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden px-4 py-8">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(128,0,0,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(128,0,0,0.1)_0%,transparent_50%)] z-0 pointer-events-none" />

            <Card
                className="w-full max-w-[480px] bg-white/40 backdrop-blur-2xl rounded-3xl shadow-glass border border-white/40 z-10 relative overflow-hidden transition-all duration-300 hover:shadow-glass-sm mt-4 mb-4"
                styles={{
                    body: {
                        padding: '40px 32px',
                    }
                }}
            >
                <div className="text-center mb-10">
                    <h1 className="text-[40px] leading-tight font-bold text-primary mb-3 tracking-tight">
                        Create Account
                    </h1>
                    <Text className="text-base text-primary/70">
                        Start selling via WhatsApp today
                    </Text>
                </div>

                <Form
                    name="register"
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
                            prefix={<UserOutlined className="text-primary/60 pr-1" />}
                            placeholder="Email"
                            className="rounded-2xl border-primary/20 bg-white/70 hover:bg-white focus:bg-white transition-all px-4 py-3 text-base shadow-sm"
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
                            prefix={<LockOutlined className="text-primary/60 pr-1" />}
                            placeholder="Password (min 6 characters)"
                            className="rounded-2xl border-primary/20 bg-white/70 hover:bg-white focus:bg-white transition-all px-4 py-3 text-base shadow-sm"
                        />
                    </Form.Item>

                    <Form.Item
                        name="businessName"
                        rules={[{ required: true, message: 'Please input your business name!' }]}
                    >
                        <Input
                            prefix={<ShopOutlined className="text-primary/60 pr-1" />}
                            placeholder="Business Name"
                            className="rounded-2xl border-primary/20 bg-white/70 hover:bg-white focus:bg-white transition-all px-4 py-3 text-base shadow-sm"
                        />
                    </Form.Item>

                    <Form.Item
                        name="whatsappNumber"
                        className="mb-8"
                    >
                        <Input
                            prefix={<PhoneOutlined className="text-primary/60 pr-1" />}
                            placeholder="WhatsApp Number (optional)"
                            className="rounded-2xl border-primary/20 bg-white/70 hover:bg-white focus:bg-white transition-all px-4 py-3 text-base shadow-sm"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            block
                            className="bg-primary hover:!bg-primary/90 border-none h-[52px] text-base font-semibold rounded-2xl shadow-[0_4px_16px_rgba(128,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(128,0,0,0.35)] transition-all active:scale-[0.98]"
                        >
                            Create Account
                        </Button>
                    </Form.Item>

                    <div className="text-center mt-8">
                        <Text className="text-primary/60">
                            Already have an account?{' '}
                            <a
                                onClick={() => navigate({ to: '/login' })}
                                className="text-primary font-semibold no-underline border-b border-primary/30 pb-[2px] hover:border-primary transition-colors cursor-pointer"
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
