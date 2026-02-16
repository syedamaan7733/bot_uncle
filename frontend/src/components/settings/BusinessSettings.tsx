import { useEffect } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService } from '../../services/business.service';
import type { UpdateBusinessDto } from '../../services/business.service';
import { SaveOutlined } from '@ant-design/icons';
import { authService } from '../../services/auth.service';

export function BusinessSettings() {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: business, isLoading } = useQuery({
        queryKey: ['business'],
        queryFn: businessService.getMyBusiness,
    });

    useEffect(() => {
        if (business) {
            form.setFieldsValue({
                name: business.name,
                slug: business.slug,
                whatsappNumber: business.whatsappNumber,
                whatsappPhoneNumberId: business.whatsappPhoneNumberId,
                whatsappAccessToken: business.whatsappAccessToken,
            });
        }
    }, [business, form]);

    const updateMutation = useMutation({
        mutationFn: businessService.updateMyBusiness,
        onSuccess: (updatedBusiness) => {
            queryClient.invalidateQueries({ queryKey: ['business'] });
            // Update local user storage if name/slug changed
            const currentUser = authService.getUser();
            if (currentUser && currentUser.business) {
                const updatedUser = {
                    ...currentUser,
                    business: { ...currentUser.business, ...updatedBusiness }
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            message.success('Settings updated successfully');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to update settings');
        },
    });

    const onFinish = (values: UpdateBusinessDto) => {
        updateMutation.mutate(values);
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Store Settings</h2>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={isLoading}
            >
                <Card title="Business Profile" style={{ marginBottom: 24 }}>
                    <Form.Item
                        name="name"
                        label="Business Name"
                        rules={[{ required: true, message: 'Please enter business name' }]}
                    >
                        <Input size="large" />
                    </Form.Item>

                    <Form.Item
                        name="slug"
                        label="Store URL Slug"
                        extra={
                            <span>
                                Your store will be accessible at: <code>{window.location.origin}/store/{form.getFieldValue('slug') || '...'}</code>
                            </span>
                        }
                        rules={[
                            { required: true, message: 'Please enter a slug' },
                            { pattern: /^[a-z0-9-]+$/, message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
                        ]}
                    >
                        <Input addonBefore="/store/" size="large" />
                    </Form.Item>

                    <Alert
                        message="Changing your slug will change your store URL."
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                    />
                </Card>

                <Card title="WhatsApp Configuration" style={{ marginBottom: 24 }}>
                    <Alert
                        message="Required for integration"
                        description="These details are needed to send automated messages via WhatsApp API."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Form.Item
                        name="whatsappNumber"
                        label="WhatsApp Phone Number"
                        rules={[{ required: true, message: 'Please enter phone number' }]}
                    >
                        <Input placeholder="+919876543210" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="whatsappPhoneNumberId"
                        label="Phone Number ID"
                    >
                        <Input placeholder="From Meta Developer Dashboard" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="whatsappAccessToken"
                        label="System User Access Token"
                    >
                        <Input.Password placeholder="Starting with EAAG..." size="large" />
                    </Form.Item>
                </Card>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={updateMutation.isPending}
                        block
                    >
                        Save Settings
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
