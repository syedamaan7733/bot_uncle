import { useEffect } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService } from '../../services/business.service';
import type { UpdateBusinessDto } from '../../services/business.service';
import { SaveOutlined } from '@ant-design/icons';
import { authService } from '../../services/auth.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { Upload, } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

export function BusinessSettings() {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const [logoFileList, setLogoFileList] = useState<UploadFile[]>([]);
    const [uploadingLogo, setUploadingLogo] = useState(false);

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
            if (business.logoUrl) {
                setLogoFileList([{
                    uid: 'existing-logo',
                    name: 'Business Logo',
                    status: 'done',
                    url: business.logoUrl,
                    thumbUrl: business.logoUrl,
                }]);
            }
        }
    }, [business, form]);

    const customLogoUploadRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
        const validation = cloudinaryService.validateImageFile(file as File);
        if (!validation.valid) {
            message.error(validation.error);
            onError?.(new Error(validation.error));
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await businessService.uploadLogo(formData);
            queryClient.invalidateQueries({ queryKey: ['business'] });
            onSuccess?.(response);
            message.success('Logo uploaded successfully');
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to upload logo');
            onError?.(error);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleLogoChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        setLogoFileList(newFileList);
    };

    const handleLogoRemove: UploadProps['onRemove'] = () => {
        setLogoFileList([]);
    };

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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1
                    style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#800000',
                        margin: 0,
                        marginBottom: '8px',
                        letterSpacing: '-0.02em',
                    }}
                >
                    Store Settings
                </h1>
                <p
                    style={{
                        fontSize: '16px',
                        color: 'rgba(128, 0, 0, 0.7)',
                        margin: 0,
                        lineHeight: '1.5',
                    }}
                >
                    Configure your business profile and WhatsApp integration
                </p>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={isLoading}
            >
                <Card
                    title={
                        <span style={{ fontSize: '20px', fontWeight: 600, color: '#800000' }}>
                            Business Profile
                        </span>
                    }
                    style={{
                        marginBottom: '24px',
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    }}
                    styles={{
                        header: {
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '16px 16px 0 0',
                        }
                    }}
                >
                    <div className="form-grid-2col">
                        <Form.Item
                            name="name"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Business Name
                                </span>
                            }
                            rules={[{ required: true, message: 'Please enter business name' }]}
                        >
                            <Input
                                size="large"
                                style={{ borderRadius: '8px' }}
                                placeholder="Your Business Name"
                            />
                        </Form.Item>

                        <Form.Item
                            name="slug"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Store URL Slug
                                </span>
                            }
                            extra={
                                <span style={{ fontSize: '14px', color: 'rgba(128, 0, 0, 0.6)' }}>
                                    Your store will be accessible at: <code style={{ background: 'rgba(128, 0, 0, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>{window.location.origin}/store/{form.getFieldValue('slug') || '...'}</code>
                                </span>
                            }
                            rules={[
                                { required: true, message: 'Please enter a slug' },
                                { pattern: /^[a-z0-9-]+$/, message: 'Slug can only contain lowercase letters, numbers, and hyphens' }
                            ]}
                        >
                            <Input
                                addonBefore="/store/"
                                size="large"
                                style={{ borderRadius: '8px' }}
                                placeholder="your-store-slug"
                            />
                        </Form.Item>
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                Business Logo
                            </span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', color: 'rgba(128, 0, 0, 0.6)' }}>
                                Upload your business logo (optional, max 5MB, JPEG/PNG/WebP/GIF)
                            </span>
                        </div>
                        <Upload
                            customRequest={customLogoUploadRequest}
                            fileList={logoFileList}
                            onChange={handleLogoChange}
                            onRemove={handleLogoRemove}
                            listType="picture-card"
                            maxCount={1}
                            accept="image/*"
                            disabled={uploadingLogo}
                        >
                            {logoFileList.length >= 1 ? null : (
                                <div>
                                    {uploadingLogo ? <LoadingOutlined /> : <UploadOutlined />}
                                    <div style={{ marginTop: 8 }}>Upload Logo</div>
                                </div>
                            )}
                        </Upload>
                    </div>

                    <Alert
                        message={
                            <span style={{ fontWeight: 500, color: '#800000' }}>
                                Changing your slug will change your store URL
                            </span>
                        }
                        description="Make sure to update any external links pointing to your old URL."
                        type="warning"
                        showIcon
                        style={{
                            marginTop: '16px',
                            borderRadius: '8px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                        }}
                    />
                </Card>

                <Card
                    title={
                        <span style={{ fontSize: '20px', fontWeight: 600, color: '#800000' }}>
                            WhatsApp Configuration
                        </span>
                    }
                    style={{
                        marginBottom: '32px',
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    }}
                    styles={{
                        header: {
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '16px 16px 0 0',
                        }
                    }}
                >
                    <Alert
                        message={
                            <span style={{ fontWeight: 500, color: '#800000' }}>
                                Required for integration
                            </span>
                        }
                        description="These details are needed to send automated messages via WhatsApp API. You can get these from your Meta Developer Dashboard."
                        type="info"
                        showIcon
                        style={{
                            marginBottom: '24px',
                            borderRadius: '8px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                    />

                    <div className="form-grid-2col">
                        <Form.Item
                            name="whatsappNumber"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    WhatsApp Phone Number
                                </span>
                            }
                            rules={[{ required: true, message: 'Please enter phone number' }]}
                        >
                            <Input
                                placeholder="+919876543210"
                                size="large"
                                style={{ borderRadius: '8px' }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="whatsappPhoneNumberId"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Phone Number ID
                                </span>
                            }
                        >
                            <Input
                                placeholder="From Meta Developer Dashboard"
                                size="large"
                                style={{ borderRadius: '8px' }}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="whatsappAccessToken"
                        label={
                            <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                System User Access Token
                            </span>
                        }
                    >
                        <Input.Password
                            placeholder="Starting with EAAG..."
                            size="large"
                            style={{ borderRadius: '8px' }}
                        />
                    </Form.Item>
                </Card>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={updateMutation.isPending}
                        style={{
                            background: '#800000',
                            borderColor: '#800000',
                            borderRadius: '8px',
                            fontWeight: 500,
                            height: '48px',
                            padding: '0 32px',
                            fontSize: '16px',
                        }}
                    >
                        Save Settings
                    </Button>
                </div>
            </Form>
        </div>
    );
}
