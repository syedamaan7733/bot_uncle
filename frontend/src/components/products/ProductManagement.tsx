import { useState } from 'react';
import { ProductPreview } from './ProductPreview';
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
    Upload,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FilterOutlined,
    UploadOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import { productService } from '../../services/product.service';
import { categoryService } from '../../services/category.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import type { Product, CreateProductDto, UpdateProductDto } from '../../types/product';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

export function ProductManagement() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [formValues, setFormValues] = useState<any>({});
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

    // Get image URLs for preview
    const getPreviewImageUrls = () => {
        return fileList
            .filter(file => file.status === 'done')
            .map(file => file.url || file.thumbUrl || '')
            .filter(url => url && !url.startsWith('blob:'));
    };

    const previewImageUrls = getPreviewImageUrls();

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
            });
            // Populate fileList with existing images
            const existingFiles: UploadFile[] = product.imageUrls.map((url, index) => ({
                uid: `existing-${index}`,
                name: `Image ${index + 1}`,
                status: 'done',
                url,
                thumbUrl: url,
            }));
            setFileList(existingFiles);
        } else {
            setEditingProduct(null);
            form.resetFields();
            setFileList([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        form.resetFields();
        setFileList([]);
        setUploading(false);
    };

    const customUploadRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
        const validation = cloudinaryService.validateImageFile(file as File);
        if (!validation.valid) {
            message.error(validation.error);
            onError?.(new Error(validation.error));
            return;
        }

        // For now, just mark as done - actual upload happens on form submit
        onSuccess?.({ url: URL.createObjectURL(file as File) });
    };

    const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        // Only keep the latest file for single image upload
        const latestFile = newFileList.slice(-1);
        setFileList(latestFile);
    };

    const handleFileRemove: UploadProps['onRemove'] = (file) => {
        setFileList(prev => prev.filter(f => f.uid !== file.uid));
    };

    const handleSubmit = async (values: any) => {
        try {
            setUploading(true);

            // Handle single image
            const newFile = fileList.find(file => file.originFileObj);
            const existingImage = editingProduct?.imageUrls?.[0] || '';

            // Create product data without imageUrls initially
            const productData: CreateProductDto = {
                name: values.name,
                categoryId: values.categoryId,
                price: values.price,
                line1: values.line1,
                line2: values.line2,
                line3: values.line3,
                imageUrls: existingImage ? [existingImage] : [], // Keep existing image if editing
            };

            let productId: string;

            if (editingProduct) {
                // Update existing product
                const updatedProduct = await productService.update(editingProduct.id, productData);
                productId = updatedProduct.id;

                // If there's a new image, upload it and remove old one if it exists
                if (newFile?.originFileObj) {
                    const formData = new FormData();
                    formData.append('images', newFile.originFileObj);

                    // Remove old image first if it exists
                    if (existingImage) {
                        await productService.removeImages(productId, [existingImage]);
                    }

                    // Upload new image
                    await productService.uploadImages(productId, formData);
                }
            } else {
                // Create new product
                const newProduct = await productService.create(productData);
                productId = newProduct.id;

                // Upload image if provided
                if (newFile?.originFileObj) {
                    const formData = new FormData();
                    formData.append('images', newFile.originFileObj);
                    await productService.uploadImages(productId, formData);
                }
            }

            // Refresh data and close modal
            queryClient.invalidateQueries({ queryKey: ['products'] });
            message.success(`Product ${editingProduct ? 'updated' : 'created'} successfully`);
            handleCloseModal();

        } catch (error: any) {
            message.error(error.response?.data?.message || `Failed to ${editingProduct ? 'update' : 'create'} product`);
        } finally {
            setUploading(false);
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
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                    Products
                </h1>
                <p
                    style={{
                        fontSize: '14px',
                        color: 'rgba(128, 0, 0, 0.7)',
                        margin: 0,
                        lineHeight: '1.4',
                    }}
                >
                    Manage your product catalog
                </p>
            </div>

            <div className="filter-toolbar">
                <div className="filter-controls">
                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>Filter by category:</span>
                    <Select
                        placeholder="All categories"
                        allowClear
                        className="filter-select"
                        style={{
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                        }}
                        onChange={setSelectedCategory}
                        value={selectedCategory}
                        suffixIcon={<FilterOutlined style={{ color: '#800000' }} />}
                        size="large"
                    >
                        {categories?.map((cat: any) => (
                            <Select.Option key={cat.id} value={cat.id}>
                                {cat.name}
                            </Select.Option>
                        ))}
                    </Select>
                </div>
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
                    Add Product
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
                    dataSource={products}
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
                            `${range[0]}-${range[1]} of ${total} products`,
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
                                                No products found
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '14px',
                                                    color: 'rgba(128, 0, 0, 0.6)',
                                                    lineHeight: '1.5',
                                                }}
                                            >
                                                Get started by adding your first product
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
                                        Create Product
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
                        {editingProduct ? 'Edit Product' : 'Add Product'}
                    </div>
                }
                open={isModalOpen}
                onCancel={handleCloseModal}
                footer={null}
                width={1000}
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
                <div className="modal-inner-grid">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        onValuesChange={(_changedValues, allValues) => setFormValues(allValues)}
                    >
                        <div className="form-grid-2col">
                            <Form.Item
                                name="name"
                                label={
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                        Product Name
                                    </span>
                                }
                                rules={[{ required: true, message: 'Please enter product name' }]}
                            >
                                <Input
                                    placeholder="e.g., Nike Air Max"
                                    size="large"
                                    style={{ borderRadius: '8px' }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="categoryId"
                                label={
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                        Category
                                    </span>
                                }
                                rules={[{ required: true, message: 'Please select a category' }]}
                            >
                                <Select
                                    placeholder="Select category"
                                    size="large"
                                    style={{ borderRadius: '8px' }}
                                >
                                    {categories?.map((cat: any) => (
                                        <Select.Option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>

                        <Form.Item
                            name="price"
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Price (₹)
                                </span>
                            }
                            rules={[{ required: true, message: 'Please enter price' }]}
                        >
                            <InputNumber
                                min={0}
                                placeholder="0"
                                style={{ width: '100%', borderRadius: '8px' }}
                                size="large"
                                formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                        </Form.Item>

                        <div className="form-grid-3col">
                            <Form.Item
                                name="line1"
                                label={
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                        Description Line 1
                                    </span>
                                }
                            >
                                <Input
                                    placeholder="Short description"
                                    size="large"
                                    style={{ borderRadius: '8px' }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="line2"
                                label={
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                        Description Line 2
                                    </span>
                                }
                            >
                                <Input
                                    placeholder="Additional details"
                                    size="large"
                                    style={{ borderRadius: '8px' }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="line3"
                                label={
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                        Description Line 3
                                    </span>
                                }
                            >
                                <Input
                                    placeholder="More information"
                                    size="large"
                                    style={{ borderRadius: '8px' }}
                                />
                            </Form.Item>
                        </div>

                        <Form.Item
                            label={
                                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                                    Product Images
                                </span>
                            }
                            extra={
                                <span style={{ fontSize: '14px', color: 'rgba(128, 0, 0, 0.6)' }}>
                                    Upload product images (max 5MB each, JPEG/PNG/WebP/GIF)
                                </span>
                            }
                        >
                            <Upload
                                customRequest={customUploadRequest}
                                fileList={fileList}
                                onChange={handleFileChange}
                                onRemove={handleFileRemove}
                                listType="picture-card"
                                accept="image/*"
                                disabled={uploading}
                                style={{
                                    borderRadius: '8px',
                                }}
                            >
                                {fileList.length >= 1 ? null : (
                                    <div>
                                        {uploading ? <LoadingOutlined /> : <UploadOutlined />}
                                        <div style={{ marginTop: 8 }}>Upload Image</div>
                                    </div>
                                )}
                            </Upload>
                        </Form.Item>

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
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>

                    <div style={{
                        position: 'sticky',
                        top: 0,
                        height: 'fit-content'
                    }}>
                        <ProductPreview
                            name={formValues.name || 'Product Name'}
                            price={formValues.price || 0}
                            line1={formValues.line1}
                            line2={formValues.line2}
                            line3={formValues.line3}
                            imageUrls={previewImageUrls}
                        />
                    </div>
                </div>
            </Modal>
        </div >
    );
}
