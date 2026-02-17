import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Space,
    Card,
    Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { categoryService } from '../../services/category.service';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../../types/product';

export function CategoryManagement() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: categories, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll,
    });

    const createMutation = useMutation({
        mutationFn: categoryService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Category created successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to create category');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
            categoryService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Category updated successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to update category');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: categoryService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Category deleted successfully');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to delete category');
        },
    });

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            form.setFieldsValue({
                name: category.name,
                displayOrder: category.displayOrder,
            });
        } else {
            setEditingCategory(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        form.resetFields();
    };

    const handleSubmit = async (values: CreateCategoryDto) => {
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Category) => (
                <div>
                    <div style={{ fontWeight: 500, fontSize: '16px', color: '#800000' }}>{text}</div>
                    <div style={{ fontSize: 12, color: 'rgba(128, 0, 0, 0.6)' }}>{record.slug}</div>
                </div>
            ),
        },
        {
            title: 'Display Order',
            dataIndex: 'displayOrder',
            key: 'displayOrder',
            width: 150,
            render: (order: number) => (
                <span style={{ fontSize: '14px', color: '#800000' }}>{order}</span>
            ),
        },
        {
            title: 'Products',
            key: 'products',
            width: 120,
            render: (_: any, record: Category) => (
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {record._count?.products || 0}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Category) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenModal(record)}
                        style={{ color: '#800000', padding: '4px 8px' }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete category"
                        description="Are you sure you want to delete this category?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            style={{ padding: '4px 8px' }}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1
                    style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#800000',
                        margin: 0,
                        marginBottom: '8px',
                        letterSpacing: '-0.02em',
                    }}
                >
                    Categories
                </h1>
                <p
                    style={{
                        fontSize: '14px',
                        color: 'rgba(128, 0, 0, 0.7)',
                        margin: 0,
                        lineHeight: '1.4',
                    }}
                >
                    Organize your products into categories
                </p>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenModal()}
                    size="large"
                    style={{
                        background: '#800000',
                        borderColor: '#800000',
                        borderRadius: '8px',
                        fontWeight: 500,
                        height: '44px',
                        padding: '0 24px',
                    }}
                >
                    Add Category
                </Button>
            </div>

            <Card
                variant='borderless'
                style={{
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                }}
            >
                <Table
                    columns={columns}
                    dataSource={categories}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{
                        pageSize: 10,
                        style: {
                            marginTop: '24px',
                            padding: '16px',
                        },
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} categories`,
                    }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '18px',
                                                    fontWeight: 600,
                                                    color: '#800000',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                No categories found
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    color: 'rgba(128, 0, 0, 0.6)',
                                                    lineHeight: '1.5',
                                                }}
                                            >
                                                Get started by adding your first category
                                            </div>
                                        </div>
                                    }
                                >
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => handleOpenModal()}
                                        size="large"
                                        style={{
                                            marginTop: '16px',
                                            background: '#800000',
                                            borderColor: '#800000',
                                            borderRadius: '8px',
                                        }}
                                    >
                                        Create Category
                                    </Button>
                                </Empty>
                            </div>
                        )
                    }}
                    style={{
                        background: 'transparent',
                    }}
                />
            </Card>

            <Modal
                title={
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#800000' }}>
                        {editingCategory ? 'Edit Category' : 'Add Category'}
                    </div>
                }
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={600}
                style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                }}
                styles={{
                    body: {
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                    }
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ displayOrder: 0 }}
                    style={{ marginTop: '24px' }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            name="name"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Category Name
                                </span>
                            }
                            rules={[{ required: true, message: 'Please enter category name' }]}
                        >
                            <Input
                                placeholder="e.g., Footwear, Accessories"
                                size="large"
                                style={{ borderRadius: '8px' }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="displayOrder"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Display Order
                                </span>
                            }
                            rules={[{ required: true, message: 'Please enter display order' }]}
                        >
                            <InputNumber
                                min={0}
                                placeholder="0"
                                style={{ width: '100%', borderRadius: '8px' }}
                                size="large"
                            />
                        </Form.Item>
                    </div>

                    <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <Button
                                onClick={handleCloseModal}
                                size="large"
                                style={{
                                    borderRadius: '8px',
                                    padding: '0 24px',
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                                size="large"
                                style={{
                                    background: '#800000',
                                    borderColor: '#800000',
                                    borderRadius: '8px',
                                    padding: '0 24px',
                                    fontWeight: 500,
                                }}
                            >
                                {editingCategory ? 'Update Category' : 'Create Category'}
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
