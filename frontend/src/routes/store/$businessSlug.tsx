import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Spin, Result, Button, Select, Checkbox, Tooltip, Typography, Input, Upload } from 'antd';
import { WhatsAppOutlined, GlobalOutlined, AppstoreOutlined, AppstoreFilled } from '@ant-design/icons';
import BusinessBranding from '../../components/branding/BusinessBranding';
import { ProductCard } from '../../components/products/ProductCard';

// Helper to convert UPPERCASE to Title Case
const toTitleCase = (str: string): string => {
    if (!str) return "";
    return str.replace(
        /\w\S*/g,
        (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// Translations
const translations = {
    en: {
        explore: "Explore",
        selectCategory: "Select Category",
        showingResults: "Showing results for",
        noItems: "No items found for this category.",
        clickToChat: "Click to enquire on WhatsApp",
        sendEnquiry: "Send Enquiry",
        selected: "Selected",
        bulkMessageIntro: "Hello, I am interested in these products:",
        articleLabel: "Article",
        categoryLabel: "Category",
        imageLabel: "Image",
    },
    hi: {
        explore: "खोजें",
        selectCategory: "श्रेणी चुनें",
        showingResults: "परिणाम दिखाए जा रहे हैं",
        noItems: "इस श्रेणी के लिए कोई आइटम नहीं मिला।",
        clickToChat: "व्हाट्सएप पर पूछताछ करने के लिए क्लिक करें",
        sendEnquiry: "पूछताछ भेजें",
        selected: "चयनित",
        bulkMessageIntro: "नमस्ते, मैं इन उत्पादों में रुचि रखता हूँ:",
        articleLabel: "आर्टिकल",
        categoryLabel: "श्रेणी",
        imageLabel: "छवि",
    },
};

export const Route = createFileRoute('/store/$businessSlug')({
    component: StorePage,
    loader: async ({ params }) => {
        return { businessSlug: params.businessSlug };
    },
    validateSearch: (search) => ({
        categoryId: search.categoryId as string | undefined,
        search: search.search as string | undefined,
    }),
});

function StorePage() {
    const { businessSlug } = Route.useParams();
    const { categoryId, search } = Route.useSearch();
    const navigate = Route.useNavigate();

    // States
    const [lang, setLang] = useState("hi");
    const [isSingleColumn, setIsSingleColumn] = useState(false);

    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    const t = translations[lang as 'en' | 'hi'];

    // Fetch business
    const { data: business, isLoading: loadingBusiness } = useQuery({
        queryKey: ['store', businessSlug, 'business'],
        queryFn: async () => {
            const res = await api.get(`/store/${businessSlug}`);
            return res.data;
        },
    });

    // Fetch categories
    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['store', businessSlug, 'categories'],
        queryFn: async () => {
            const res = await api.get(`/store/${businessSlug}/categories`);
            return res.data;
        },
    });

    // Fetch products
    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['store', businessSlug, 'products', categoryId, search],
        queryFn: async () => {
            const params: any = {};
            if (categoryId) params.categoryId = categoryId;
            if (search) params.search = search;
            const res = await api.get(`/store/${businessSlug}/products`, { params });
            return res.data;
        },
    });

    // Effects
    useEffect(() => {
        setSelectedItems([]);
    }, [categoryId]);

    useEffect(() => {
        if (categories && categories.length > 0 && !categoryId) {
            // Set first category as default in URL
            navigate({
                search: { categoryId: categories[0].id, search },
                replace: true
            });
        }
    }, [categories, categoryId, navigate, search]);

    // Functions
    const toggleItemSelection = (item: any) => {
        const isSelected = selectedItems.find((i: any) => i.id === item.id);
        if (isSelected) {
            setSelectedItems((prev: any[]) => prev.filter((i: any) => i.id !== item.id));
        } else {
            setSelectedItems((prev: any[]) => [...prev, item]);
        }
    };

    const handleCategoryChange = (value: string) => {
        navigate({
            search: { categoryId: value, search },
            replace: true
        });
    };

    const handleSearchChange = (value: string) => {
        if (value.trim()) {
            navigate({
                search: { categoryId, search: value.trim() },
                replace: true
            });
        } else {
            navigate({
                search: { categoryId, search: undefined },
                replace: true
            });
        }
    };

    const handleImageSearch = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await api.post(`/store/${businessSlug}/image-search`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { searchText } = res.data;
            navigate({
                search: { categoryId, search: searchText },
                replace: true
            });
        } catch (error) {
            console.error('Image search failed:', error);
        }
    };

    const toggleLanguage = () => {
        setLang((prev: string) => prev === "en" ? "hi" : "en");
    };

    const handleWhatsAppRedirect = (item: any) => {
        const phoneNumber = business?.whatsappNumber || "";
        let message = "";

        if (lang === "hi") {
            message = `नमस्ते, मैं इस प्रोडक्ट के बारे में जानकारी चाहता हूँ।\n${t.articleLabel}: ${item.name}\n${t.categoryLabel}: ${item.category.name}\n${t.imageLabel}: ${item.imageUrls?.[0] || 'N/A'}`;
        } else {
            message = `Hello, I am interested in this product:\nArticle: ${item.name}\nCategory: ${categoryId}\nImage: ${item.imageUrls?.[0] || 'N/A'}`;
        }

        const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    };

    const handleBulkWhatsAppRedirect = () => {
        const phoneNumber = business?.whatsappNumber || "";
        let message = `${t.bulkMessageIntro}\n\n`;

        selectedItems.forEach((item, index) => {
            if (lang === "hi") {
                message += `${index + 1}. ${t.articleLabel}: ${item.name}, ${t.categoryLabel}: ${categoryId}\n${t.imageLabel}: ${item.imageUrls?.[0] || 'N/A'}\n\n`;
            } else {
                message += `${index + 1}. ${t.articleLabel}: ${item.name}, ${t.categoryLabel}: ${categoryId}\n${t.imageLabel}: ${item.imageUrls?.[0] || 'N/A'}\n\n`;
            }
        });

        const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
        setSelectedItems([]);
    };

    if (loadingBusiness) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#ffffff' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!business) {
        return (
            <Result
                status="404"
                title="Store Not Found"
                subTitle="Sorry, the store you visited does not exist."
            />
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, white, #f7f7f9)', paddingTop: '0' }}>
            {/* Brand Header */}
            <div
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid rgba(128, 0, 0, 0.1)',
                    padding: '16px 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                }}
            >
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <BusinessBranding name={business?.name || ''} logoUrl={business?.logoUrl} size="medium" />
                    <Typography.Text
                        style={{
                            color: 'rgba(128, 0, 0, 0.6)',
                            fontSize: '12px',
                            margin: 0,
                        }}
                    >
                        Online Store
                    </Typography.Text>
                </div>
            </div>

            <div className="store-content">
                {/* Header Section */}
                <div className="store-header-controls">
                    <div className="store-header-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <Typography.Title
                                level={1}
                                style={{
                                    fontSize: '36px',
                                    fontWeight: 800,
                                    color: '#800000',
                                    letterSpacing: 'tight',
                                    textTransform: 'uppercase',
                                    margin: 0,
                                }}
                            >
                                {t.explore}
                            </Typography.Title>
                            <Tooltip title={lang === 'en' ? "हिंदी में देखें" : "View in English"}>
                                <Button
                                    icon={<GlobalOutlined />}
                                    onClick={toggleLanguage}
                                    type="text"
                                    style={{ color: '#800000' }}
                                />
                            </Tooltip>
                        </div>

                        {/* Mobile Grid Toggle */}
                        <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <Button
                                icon={<AppstoreOutlined />}
                                size="small"
                                type="text"
                                style={{
                                    color: isSingleColumn ? 'white' : '#6b7280',
                                    background: isSingleColumn ? '#800000' : 'transparent',
                                    borderRadius: '6px',
                                }}
                                onClick={() => setIsSingleColumn(true)}
                            />
                            <Button
                                icon={<AppstoreFilled />}
                                size="small"
                                type="text"
                                style={{
                                    color: !isSingleColumn ? 'white' : '#6b7280',
                                    background: !isSingleColumn ? '#800000' : 'transparent',
                                    borderRadius: '6px',
                                }}
                                onClick={() => setIsSingleColumn(false)}
                            />
                        </div>
                    </div>

                    {/* Category Dropdown */}
                    <div className="store-category-select">
                        <Select
                            placeholder={t.selectCategory}
                            value={categoryId}
                            onChange={handleCategoryChange}
                            style={{ width: '100%' }}
                            loading={loadingCategories}
                        >
                            {categories?.map((cat: any) => (
                                <Select.Option key={cat.id} value={cat.id}>
                                    {toTitleCase(cat.name)}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    {/* Search Input */}
                    <div className="store-search-input">
                        <Input
                            placeholder="Search products..."
                            value={search || ''}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            style={{ flex: 1 }}
                            allowClear
                        />
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleImageSearch(file);
                                return false; // Prevent default upload behavior
                            }}
                        >
                            <Button icon={<span>📷</span>} title="Search by image" />
                        </Upload>
                    </div>
                </div>

                {/* Selected Category Status */}
                {(categoryId || search) && (
                    <div style={{ marginBottom: '24px' }}>
                        {categoryId && (
                            <Typography.Text style={{ fontSize: '16px', color: 'rgba(128, 0, 0, 0.7)', fontWeight: 500, marginRight: search ? '16px' : 0 }}>
                                {t.showingResults} <span style={{ color: '#800000', fontWeight: 'bold' }}>{toTitleCase(categories?.find((c: any) => c.id === categoryId)?.name)}</span>
                            </Typography.Text>
                        )}
                        {search && (
                            <Typography.Text style={{ fontSize: '16px', color: 'rgba(128, 0, 0, 0.7)', fontWeight: 500 }}>
                                Search results for: <span style={{ color: '#800000', fontWeight: 'bold' }}>{search}</span>
                            </Typography.Text>
                        )}
                    </div>
                )}

                {/* Products Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${isSingleColumn ? '100%' : '280px'}, 1fr))`,
                        gap: '20px',
                        justifyContent: 'center',
                        paddingBottom: '120px',
                    }}
                >
                    {products?.map((product: any) => (
                        <div key={product.id} style={{ position: 'relative', margin: 'auto' }}>
                            <ProductCard
                                name={product.name}
                                price={parseFloat(product.price)}
                                imageUrl={product.imageUrls?.[0] || ''}
                                line1={product.line1}
                                line2={product.line2}
                                line3={product.line3}
                                size="medium"
                                showWhatsAppButton={true}
                                showCheckbox={true}
                                checkboxChecked={selectedItems.some(item => item.id === product.id)}
                                onCheckboxChange={() => toggleItemSelection(product)}
                                onClick={() => handleWhatsAppRedirect(product)}
                            />
                        </div>
                    ))}

                    {/* Loading Skeletons */}
                    {loadingProducts && Array.from({ length: 5 }).map((_, i: number) => (
                        <div
                            key={`skeleton-${i}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <div style={{ width: '200px', height: '200px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '16px' }} />
                            <div style={{ width: '60%', height: '20px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '8px' }} />
                            <div style={{ width: '40%', height: '15px', background: '#f3f4f6', borderRadius: '4px' }} />
                        </div>
                    ))}

                    {!loadingProducts && products?.length === 0 && categoryId && (
                        <div style={{ textAlign: 'center', marginTop: '48px', padding: '48px' }}>
                            {business?.logoUrl ? (
                                <img
                                    src={business.logoUrl}
                                    alt="No products"
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        objectFit: 'contain',
                                        opacity: 0.5,
                                        marginBottom: '24px',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        background: 'rgba(128, 0, 0, 0.1)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 24px',
                                    }}
                                >
                                    <Typography.Text style={{ fontSize: '48px', color: 'rgba(128, 0, 0, 0.3)' }}>
                                        📦
                                    </Typography.Text>
                                </div>
                            )}
                            <Typography.Title level={4} style={{ color: 'rgba(128, 0, 0, 0.8)', marginBottom: '8px' }}>
                                {t.noItems}
                            </Typography.Title>
                            <Typography.Text style={{ fontSize: '14px', color: 'rgba(128, 0, 0, 0.6)' }}>
                                Try selecting a different category
                            </Typography.Text>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Bar for Bulk Send */}
                {selectedItems.length > 0 && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                            padding: '16px 24px',
                            boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 100,
                        }}
                    >
                        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography.Text style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                {selectedItems.length} {t.selected}
                            </Typography.Text>
                            <Button
                                type="primary"
                                icon={<WhatsAppOutlined />}
                                onClick={handleBulkWhatsAppRedirect}
                                size="large"
                                style={{
                                    background: '#25D366',
                                    borderColor: '#25D366',
                                    borderRadius: '8px',
                                }}
                            >
                                {t.sendEnquiry} ({selectedItems.length})
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
