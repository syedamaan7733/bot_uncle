import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    message,
    Popconfirm,
    Space,
    Card,
    Tag,
    Image,
    Empty,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import { productService } from '../../services/product.service';
import { categoryService } from '../../services/category.service';
import type { Product, CreateProductDto, UpdateProductDto } from '../../types/product';

const { TextArea } = Input;

export function ProductManagement() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll,
    });

    const { data: products, isLoading } = useQuery({
        queryKey: ['products', selectedCategory],
        queryFn: () => productService.getAll(selectedCategory),
    });

    const createMutation = useMutation({
        mutationFn: productService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Product created successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to create product');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
            productService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Product updated successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to update product');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: productService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            message.success('Product deleted successfully');
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to delete product');
        },
    });

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            form.setFieldsValue({
                name: product.name,
                categoryId: product.categoryId,
                price: parseFloat(product.price),
                line1: product.line1,
                line2: product.line2,
                line3: product.line3,
                imageUrls: product.imageUrls.join('\n'),
            });
        } else {
            setEditingProduct(null);
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        form.resetFields();
    };

    const handleSubmit = async (values: any) => {
        const imageUrls = values.imageUrls
            ? values.imageUrls.split('\n').filter((url: string) => url.trim())
            : [];

        const productData: CreateProductDto = {
            name: values.name,
            categoryId: values.categoryId,
            price: values.price,
            line1: values.line1,
            line2: values.line2,
            line3: values.line3,
            imageUrls,
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data: productData });
        } else {
            createMutation.mutate(productData);
        }
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    const columns = [
        {
            title: 'Image',
            key: 'image',
            width: 80,
            render: (_: any, record: Product) =>
                record.imageUrls[0] ? (
                    <Image
                        src={record.imageUrls[0]}
                        alt={record.name}
                        width={50}
                        height={50}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                ) : (
                    <div
                        style={{
                            width: 50,
                            height: 50,
                            background: '#f0f0f0',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: '#999',
                        }}
                    >
                        No Image
                    </div>
                ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Product) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    {record.line1 && (
                        <div style={{ fontSize: 12, color: '#666' }}>{record.line1}</div>
                    )}
                </div>
            ),
        },
        {
            title: 'Category',
            key: 'category',
            width: 150,
            render: (_: any, record: Product) => (
                <Tag color="blue">{record.category?.name}</Tag>
            ),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 120,
            render: (price: string) => `₹${parseFloat(price).toLocaleString()}`,
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            width: 100,
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: any, record: Product) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenModal(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete product"
                        description="Are you sure you want to delete this product?"
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
                title={<span style={{ fontSize: 20, fontWeight: 600 }}>Products</span>}
                extra={
                    <Space>
                        <Select
                            placeholder="Filter by category"
                            allowClear
                            style={{ width: 200 }}
                            onChange={setSelectedCategory}
                            value={selectedCategory}
                            suffixIcon={<FilterOutlined />}
                        >
                            {categories?.map((cat) => (
                                <Select.Option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </Select.Option>
                            ))}
                        </Select>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenModal()}
                        >
                            Add Product
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={products}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                    locale={{
                        emptyText: (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <div className="flex flex-col gap-2">
                                            <span className="text-gray-500 font-medium">No products found</span>
                                            <span className="text-gray-400 text-xs">Get started by adding your first product</span>
                                        </div>
                                    }
                                >
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()} className="mt-4">
                                        Create Product
                                    </Button>
                                </Empty>
                            </div>
                        )
                    }}
                />
            </Card>

            <Modal
                title={editingProduct ? 'Edit Product' : 'Add Product'}
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="name"
                        label="Product Name"
                        rules={[{ required: true, message: 'Please enter product name' }]}
                    >
                        <Input placeholder="e.g., Nike Air Max" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="categoryId"
                        label="Category"
                        rules={[{ required: true, message: 'Please select a category' }]}
                    >
                        <Select placeholder="Select category" size="large">
                            {categories?.map((cat) => (
                                <Select.Option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="price"
                        label="Price (₹)"
                        rules={[{ required: true, message: 'Please enter price' }]}
                    >
                        <InputNumber
                            min={0}
                            placeholder="0"
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item name="line1" label="Description Line 1">
                        <Input placeholder="Short description" size="large" />
                    </Form.Item>

                    <Form.Item name="line2" label="Description Line 2">
                        <Input placeholder="Additional details" size="large" />
                    </Form.Item>

                    <Form.Item name="line3" label="Description Line 3">
                        <Input placeholder="More information" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="imageUrls"
                        label="Image URLs (one per line)"
                        extra="Enter image URLs, one per line"
                    >
                        <TextArea
                            rows={4}
                            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
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
                                {editingProduct ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
