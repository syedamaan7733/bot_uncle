import { useState, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Button,
    Table,
    Input,
    InputNumber,
    Select,
    Tag,
    message,
    Progress,
    Card,
    Steps,
    Upload,
    Alert,
    Tooltip,
    Spin,
} from 'antd';
import {
    InboxOutlined,
    RobotOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ImportOutlined,
    ReloadOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { categoryService } from '../../services/category.service';
import {
    smartImportService,
    type ExtractedProduct,
    type ConfirmProduct,
} from '../../services/smart-import.service';

const { Dragger } = Upload;

// ── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'idle' | 'uploading' | 'processing' | 'review' | 'importing' | 'done';

interface EditableProduct extends ExtractedProduct {
    _key: number;
    /** Whether the user has REJECTED the new-category suggestion and wants to pick existing */
    _rejectedNewCategory: boolean;
    /** Editable new category name (starts as categorySuggestion, user can change it) */
    _newCategoryName: string;
    /** Temporary search input state for the custom Select dropdown */
    _customSearch?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function confidenceBadge(confidence: number) {
    if (confidence >= 0.8) return <Tag color="green">{Math.round(confidence * 100)}%</Tag>;
    if (confidence >= 0.5) return <Tag color="orange">{Math.round(confidence * 100)}%</Tag>;
    return <Tag color="red">{Math.round(confidence * 100)}%</Tag>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SmartImport() {
    const navigate = useNavigate();
    const [step, setStep] = useState<WizardStep>('idle');
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [jobId, setJobId] = useState<string | null>(null);
    const [products, setProducts] = useState<EditableProduct[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getAll,
    });

    // ── Polling ──────────────────────────────────────────────────────────────

    const startPolling = useCallback((id: string) => {
        pollingRef.current = setInterval(async () => {
            try {
                const job = await smartImportService.getJob(id);
                if (job.status === 'READY_FOR_REVIEW') {
                    clearInterval(pollingRef.current!);
                    const rawProducts = job.resultJson?.products ?? [];
                    setProducts(
                        rawProducts.map((p, i) => ({
                            ...p,
                            _key: i,
                            _rejectedNewCategory: false,
                            _newCategoryName: p.categorySuggestion ?? '',
                        })),
                    );
                    setStep('review');
                } else if (job.status === 'FAILED') {
                    clearInterval(pollingRef.current!);
                    setErrorMsg('AI processing failed. Please try again with a clearer image.');
                    setStep('idle');
                }
            } catch {
                // transient error — keep polling
            }
        }, 2500);
    }, []);

    // ── Upload ───────────────────────────────────────────────────────────────

    const handleUpload = async () => {
        const rawFile = fileList[0]?.originFileObj;
        if (!rawFile) { message.warning('Please select an image first'); return; }
        setErrorMsg(null);
        setStep('uploading');
        try {
            const { jobId: id } = await smartImportService.upload(rawFile as File);
            setJobId(id);
            setStep('processing');
            startPolling(id);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Upload failed. Please try again.');
            setStep('idle');
        }
    };

    // ── Inline edit helpers ───────────────────────────────────────────────────

    const updateProduct = (key: number, field: keyof EditableProduct, value: any) => {
        setProducts(prev => prev.map(p => p._key === key ? { ...p, [field]: value } : p));
    };

    const removeProduct = (key: number) => {
        setProducts(prev => prev.filter(p => p._key !== key));
    };

    // ── Confirm import ────────────────────────────────────────────────────────

    const handleConfirmImport = async () => {
        if (products.length === 0) { message.warning('No products to import'); return; }

        // Validate: Every product MUST have either an existing categoryId or a _newCategoryName
        const missingCategory = products.filter(
            (p) => !p.categoryId && !p._newCategoryName?.trim(),
        );
        if (missingCategory.length > 0) {
            message.error(
                `Please assign a category to all products. (${missingCategory.length} missing)`,
            );
            return;
        }

        setStep('importing');

        const payload: ConfirmProduct[] = products.map((p) => {
            if (!p.categoryId && p._newCategoryName) {
                // New category flow: backend will create it
                return {
                    name: p.name,
                    price: p.price,
                    line1: p.line1 || null,
                    line2: p.line2 || null,
                    line3: p.line3 || null,
                    newCategoryName: p._newCategoryName.trim(),
                };
            }
            return {
                name: p.name,
                price: p.price,
                line1: p.line1 || null,
                line2: p.line2 || null,
                line3: p.line3 || null,
                categoryId: p.categoryId!,
            };
        });

        try {
            const result = await smartImportService.confirmImport(jobId!, payload);
            setStep('done');
            const extra = result.newCategoriesCreated
                ? ` (${result.newCategoriesCreated} new category created)`
                : '';
            message.success(`${result.imported} product(s) imported${extra}!`);
            setTimeout(() => navigate({ to: '/dashboard/products' }), 1800);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Import failed. Please try again.');
            setStep('review');
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────

    const handleReset = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep('idle');
        setFileList([]);
        setJobId(null);
        setProducts([]);
        setErrorMsg(null);
    };

    // ── Derived state ─────────────────────────────────────────────────────────

    const newCategoryProducts = products.filter(
        (p) => !p.categoryId && !!p._newCategoryName?.trim(),
    );
    const uniqueNewCategories = [...new Set(newCategoryProducts.map((p) => p._newCategoryName.trim()).filter(Boolean))];

    // ── Table columns ─────────────────────────────────────────────────────────

    const reviewColumns = [
        {
            title: 'Product Name',
            key: 'name',
            width: 190,
            render: (_: any, record: EditableProduct) => (
                <Input
                    value={record.name}
                    onChange={(e) => updateProduct(record._key, 'name', e.target.value)}
                    size="small"
                    style={{ fontWeight: 500 }}
                />
            ),
        },
        {
            title: 'Price (₹)',
            key: 'price',
            width: 120,
            render: (_: any, record: EditableProduct) => (
                <InputNumber
                    value={record.price}
                    onChange={(v) => updateProduct(record._key, 'price', v ?? 0)}
                    min={0}
                    size="small"
                    style={{ width: '100%' }}
                    formatter={(v) => `₹ ${v}`}
                />
            ),
        },
        {
            title: 'Line 1',
            key: 'line1',
            render: (_: any, record: EditableProduct) => (
                <Input
                    value={record.line1 ?? ''}
                    onChange={(e) => updateProduct(record._key, 'line1', e.target.value || null)}
                    size="small"
                    placeholder="—"
                />
            ),
        },
        {
            title: 'Line 2',
            key: 'line2',
            render: (_: any, record: EditableProduct) => (
                <Input
                    value={record.line2 ?? ''}
                    onChange={(e) => updateProduct(record._key, 'line2', e.target.value || null)}
                    size="small"
                    placeholder="—"
                />
            ),
        },
        {
            title: 'Line 3',
            key: 'line3',
            render: (_: any, record: EditableProduct) => (
                <Input
                    value={record.line3 ?? ''}
                    onChange={(e) => updateProduct(record._key, 'line3', e.target.value || null)}
                    size="small"
                    placeholder="—"
                />
            ),
        },
        {
            title: (
                <span>
                    Category{' '}
                    <Tooltip title="Select an existing category or create a new one. AI suggestions are highlighted in orange.">
                        <QuestionCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                </span>
            ),
            key: 'category',
            width: 250,
            render: (_: any, record: EditableProduct) => {
                // Determine the current value for the Select
                let selectValue: string | undefined = undefined;
                if (record.categoryId) {
                    selectValue = record.categoryId;
                } else if (record._newCategoryName) {
                    selectValue = `__NEW__${record._newCategoryName}`;
                }

                // Temporary search state is stored per row to allow typing new categories
                // We'll use onSearch to capture what they are typing

                return (
                    <Select
                        showSearch
                        allowClear
                        value={selectValue}
                        labelInValue={false}
                        optionLabelProp="label"
                        placeholder="Select or type to create..."
                        size="small"
                        style={{ width: '100%' }}
                        listHeight={250}
                        status={!selectValue ? 'error' : undefined}
                        filterOption={(input, option) => {
                            // Custom filter to match children text
                            const text = option?.children;
                            if (typeof text === 'string') {
                                return text.toLowerCase().includes(input.toLowerCase());
                            }
                            if (Array.isArray(text)) {
                                const joined = (text as any[]).map(t => typeof t === 'string' ? t : '').join('');
                                return joined.toLowerCase().includes(input.toLowerCase());
                            }
                            return true;
                        }}
                        onChange={(val: string) => {
                            if (!val) {
                                updateProduct(record._key, 'categoryId', null);
                                updateProduct(record._key, '_newCategoryName', '');
                                updateProduct(record._key, '_rejectedNewCategory', true);
                            } else if (val.startsWith('__NEW__')) {
                                updateProduct(record._key, 'categoryId', null);
                                updateProduct(record._key, '_newCategoryName', val.substring(7));
                                updateProduct(record._key, '_rejectedNewCategory', false);
                            } else {
                                updateProduct(record._key, 'categoryId', val);
                                updateProduct(record._key, '_newCategoryName', '');
                                updateProduct(record._key, '_rejectedNewCategory', true);
                            }
                        }}
                        onSearch={(val) => {
                            // Update a local UI state so we can render the "Create '{val}'" option
                            // We use record._customSearch to bypass React state arrays for simplicity
                            (record as any)._customSearch = val;
                            // Force a re-render by calling updateProduct with a dummy toggle
                            updateProduct(record._key, '_key', record._key);
                        }}
                    >
                        {/* 1. Show the user's typed custom category if it doesn't match an existing one exactly */}
                        {record._customSearch && !categories?.find((c: any) => c.name.toLowerCase() === record._customSearch?.toLowerCase()) && (
                            <Select.Option value={`__NEW__${record._customSearch}`} label={record._customSearch}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Create</Tag>
                                    <span style={{ fontWeight: 500 }}>{record._customSearch}</span>
                                </div>
                            </Select.Option>
                        )}

                        {/* 2. Show the AI suggested category if it exists and hasn't been typed/created yet */}
                        {(record.category || record.categorySuggestion) &&
                            record._customSearch?.toLowerCase() !== (record.category || record.categorySuggestion)!.toLowerCase() &&
                            !categories?.find((c: any) => c.name.toLowerCase() === (record.category || record.categorySuggestion)!.toLowerCase()) && (
                                <Select.Option value={`__NEW__${record.category || record.categorySuggestion}`} label={record.category || record.categorySuggestion}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>✨ AI Suggests</Tag>
                                        <span style={{ fontWeight: 500, color: '#fa8c16' }}>{record.category || record.categorySuggestion}</span>
                                    </div>
                                </Select.Option>
                            )}


                        {/* 3. Show all existing categories */}
                        {categories?.map((c: any) => (
                            <Select.Option key={c.id} value={c.id} label={c.name}>
                                {c.name}
                            </Select.Option>
                        ))}
                    </Select>
                );
            },
        },
        {
            title: 'AI',
            key: 'confidence',
            width: 70,
            align: 'center' as const,
            render: (_: any, record: EditableProduct) => confidenceBadge(record.confidence),
        },
        {
            title: '',
            key: 'remove',
            width: 48,
            render: (_: any, record: EditableProduct) => (
                <Button
                    type="text"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => removeProduct(record._key)}
                    size="small"
                />
            ),
        },
    ];

    // ── Upload dragger props ──────────────────────────────────────────────────

    const draggerProps: UploadProps = {
        name: 'image',
        multiple: false,
        accept: 'image/*',
        fileList,
        beforeUpload: (file) => {
            if (!file.type.startsWith('image/')) { message.error('Only image files accepted'); return Upload.LIST_IGNORE; }
            if (file.size > 10 * 1024 * 1024) { message.error('Image must be < 10MB'); return Upload.LIST_IGNORE; }
            return false;
        },
        onChange: ({ fileList: fl }) => setFileList(fl.slice(-1)),
        onRemove: () => setFileList([]),
    };

    // ── Step indicator ────────────────────────────────────────────────────────

    const stepItems = [
        { title: 'Upload', description: 'Select catalog image' },
        { title: 'AI Processing', description: 'Extracting products' },
        { title: 'Review & Edit', description: 'Verify extracted data' },
        { title: 'Import', description: 'Create products' },
    ];

    const currentStepIndex: Record<WizardStep, number> = {
        idle: 0, uploading: 0, processing: 1, review: 2, importing: 3, done: 3,
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Page header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#800000', margin: 0, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                    Smart Import
                </h1>
                <p style={{ fontSize: '14px', color: 'rgba(128, 0, 0, 0.7)', margin: 0, lineHeight: '1.4' }}>
                    Upload a product catalog image and let AI extract your products automatically.
                </p>
            </div>

            {/* Progress steps */}
            <Card variant="borderless" style={{ ...cardStyle, marginBottom: '24px' }}>
                <Steps current={currentStepIndex[step]} items={stepItems} style={{ padding: '8px 0' }} />
            </Card>

            {/* Error */}
            {errorMsg && (
                <Alert type="error" message={errorMsg} showIcon closable onClose={() => setErrorMsg(null)}
                    style={{ marginBottom: '24px', borderRadius: '12px' }} />
            )}

            {/* ── IDLE / UPLOADING ──────────────────────────────────────────── */}
            {(step === 'idle' || step === 'uploading') && (
                <Card variant="borderless" style={cardStyle}>
                    <Dragger
                        {...draggerProps}
                        style={{ borderRadius: '12px', border: '2px dashed rgba(128, 0, 0, 0.3)', background: 'rgba(128, 0, 0, 0.02)' }}
                        disabled={step === 'uploading'}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: '#800000', fontSize: '48px' }} />
                        </p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#800000', marginBottom: '4px' }}>
                            Drop your catalog image here
                        </p>
                        <p style={{ color: 'rgba(128, 0, 0, 0.6)', fontSize: '13px' }}>
                            Supports JPEG, PNG, WebP · Max 10MB
                        </p>
                    </Dragger>
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        {fileList.length > 0 && (
                            <Button
                                onClick={handleUpload}
                                type="primary"
                                icon={<RobotOutlined />}
                                loading={step === 'uploading'}
                                size="large"
                                style={{ background: '#800000', borderColor: '#800000', borderRadius: '8px', fontWeight: 500, height: '44px', padding: '0 28px' }}
                            >
                                {step === 'uploading' ? 'Uploading…' : 'Analyse with AI'}
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* ── PROCESSING ───────────────────────────────────────────────── */}
            {step === 'processing' && (
                <Card variant="borderless" style={{ ...cardStyle, textAlign: 'center', padding: '80px 24px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '32px', fontSize: '18px', fontWeight: 600, color: '#800000' }}>
                        AI is reading your catalog…
                    </div>
                    <div style={{ marginTop: '8px', color: 'rgba(128, 0, 0, 0.7)', fontSize: '14px' }}>
                        Running OCR, vision analysis, and product extraction. This may take up to a minute.
                    </div>
                    <Progress
                        percent={100} status="active" showInfo={false} strokeColor="#800000"
                        style={{ maxWidth: '400px', margin: '40px auto 0' }}
                    />
                    <Button type="text" onClick={handleReset} style={{ marginTop: '24px', color: 'rgba(128, 0, 0, 0.5)' }}>
                        Cancel
                    </Button>
                </Card>
            )}

            {/* ── REVIEW ───────────────────────────────────────────────────── */}
            {step === 'review' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#800000' }}>
                                {products.length} product{products.length !== 1 ? 's' : ''} extracted
                            </span>
                            <span style={{ fontSize: '13px', color: 'rgba(128, 0, 0, 0.6)', marginLeft: '12px' }}>
                                Review and edit before importing
                            </span>
                        </div>
                        <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">Start Over</Button>
                    </div>

                    {/* New-category banner */}
                    {uniqueNewCategories.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: '16px', borderRadius: '12px' }}
                            message={
                                <span>
                                    <strong>{uniqueNewCategories.length} new {uniqueNewCategories.length === 1 ? 'category' : 'categories'} will be created:</strong>
                                    {' '}
                                    {uniqueNewCategories.map((n, i) => (
                                        <Tag key={i} color="orange" style={{ marginLeft: 4 }}>{n || '(empty — please fill in)'}</Tag>
                                    ))}
                                </span>
                            }
                            description="You can edit the category names inline in the table or assign an existing category instead."
                        />
                    )}

                    <Card variant="borderless" style={{ ...cardStyle, marginBottom: '24px' }}>
                        <Table
                            columns={reviewColumns}
                            dataSource={products}
                            rowKey="_key"
                            pagination={false}
                            size="small"
                            scroll={{ x: 1200 }}
                            style={{ background: 'transparent' }}
                            rowClassName={(record) =>
                                !record.categoryId && !!record._newCategoryName?.trim()
                                    ? 'smart-import-new-cat-row'
                                    : ''
                            }
                        />
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="primary"
                            icon={<ImportOutlined />}
                            onClick={handleConfirmImport}
                            size="large"
                            disabled={products.length === 0}
                            style={{ background: '#800000', borderColor: '#800000', borderRadius: '8px', fontWeight: 500, height: '44px', padding: '0 32px' }}
                        >
                            Import {products.length} Product{products.length !== 1 ? 's' : ''}
                            {uniqueNewCategories.length > 0 && ` + ${uniqueNewCategories.length} new ${uniqueNewCategories.length === 1 ? 'category' : 'categories'}`}
                        </Button>
                    </div>
                </>
            )}

            {/* ── IMPORTING ────────────────────────────────────────────────── */}
            {step === 'importing' && (
                <Card variant="borderless" style={{ ...cardStyle, textAlign: 'center', padding: '80px 24px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '24px', fontSize: '18px', fontWeight: 600, color: '#800000' }}>
                        Creating products…
                    </div>
                </Card>
            )}

            {/* ── DONE ─────────────────────────────────────────────────────── */}
            {step === 'done' && (
                <Card variant="borderless" style={{ ...cardStyle, textAlign: 'center', padding: '80px 24px' }}>
                    <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
                    <div style={{ marginTop: '24px', fontSize: '20px', fontWeight: 600, color: '#800000' }}>
                        Import complete!
                    </div>
                    <div style={{ marginTop: '8px', color: 'rgba(128, 0, 0, 0.6)' }}>
                        Redirecting to your products…
                    </div>
                </Card>
            )}

            {/* Row highlight style for new-category rows */}
            <style>{`
                .smart-import-new-cat-row td {
                    background: rgba(250, 140, 22, 0.05) !important;
                }
            `}</style>
        </div>
    );
}
