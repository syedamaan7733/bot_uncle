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
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{record.slug}</div>
                </div>
            ),
        },
        {
            title: 'Display Order',
            dataIndex: 'displayOrder',
            key: 'displayOrder',
            width: 150,
        },
        {
            title: 'Products',
            key: 'products',
            width: 120,
            render: (_: any, record: Category) => record._count?.products || 0,
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
                        <Button type="link" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card
                title={<span style={{ fontSize: 20, fontWeight: 600 }}>Categories</span>}
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenModal()}
                    >
                        Add Category
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={categories}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingCategory ? 'Edit Category' : 'Add Category'}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ displayOrder: 0 }}
                >
                    <Form.Item
                        name="name"
                        label="Category Name"
                        rules={[{ required: true, message: 'Please enter category name' }]}
                    >
                        <Input placeholder="e.g., Footwear, Accessories" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="displayOrder"
                        label="Display Order"
                        rules={[{ required: true, message: 'Please enter display order' }]}
                    >
                        <InputNumber
                            min={0}
                            placeholder="0"
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleCloseModal}>Cancel</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingCategory ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
