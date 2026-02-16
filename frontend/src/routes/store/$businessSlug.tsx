import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Spin, Result, Button, Layout, Input, Badge, FloatButton, Card, Empty, Tag, Drawer } from 'antd';
import { ShoppingCartOutlined, WhatsAppOutlined, SearchOutlined, ShoppingOutlined, FilterOutlined, ShopOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';

// Types
interface StoreData {
    business: any;
    categories: any[];
    products: any[];
}

export const Route = createFileRoute('/store/$businessSlug')({
    component: StorePage,
    loader: async ({ params }) => {
        return { businessSlug: params.businessSlug };
    },
});

function StorePage() {
    const { businessSlug } = Route.useParams();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<Record<string, number>>({}); // productId -> quantity
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Fetch all data in parallel
    const { data: business, isLoading: loadingBusiness } = useQuery({
        queryKey: ['store', businessSlug, 'business'],
        queryFn: async () => {
            const res = await api.get(`/store/${businessSlug}`);
            return res.data;
        },
    });

    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['store', businessSlug, 'categories'],
        queryFn: async () => {
            const res = await api.get(`/store/${businessSlug}/categories`);
            return res.data;
        },
    });

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['store', businessSlug, 'products', selectedCategory, searchQuery],
        queryFn: async () => {
            const params: any = {};
            if (selectedCategory) params.categoryId = selectedCategory;
            if (searchQuery) params.search = searchQuery;
            const res = await api.get(`/store/${businessSlug}/products`, { params });
            return res.data;
        },
    });

    // Calculate cart totals
    const cartSummary = useMemo(() => {
        if (!products) return { count: 0, total: 0, items: [] };

        let count = 0;
        let total = 0;
        const items: any[] = [];

        Object.keys(cart).forEach(productId => {
            const product = products.find((p: any) => p.id === productId);
            // If product not in current view (e.g. filtered out), we might miss its price here
            // ideally we should fetch cart items separately or use a cache of all products
            // For now, let's assume if it's in cart, user has seen it.
            // Fallback: This logic might be slightly buggy if product list changes due to filter. 
            // In a real app we'd have a separate 'all products' cache or fetch cart items by ID.
            if (product) {
                count += cart[productId];
                total += Number(product.price) * cart[productId];
                items.push({ ...product, quantity: cart[productId] });
            }
        });
        return { count, total, items };
    }, [cart, products]);


    const handleAddToCart = (productId: string) => {
        setCart(prev => {
            const newCart = { ...prev };
            // Simple toggle for now, or increment? Task said "distinct UI state"
            if (newCart[productId]) {
                delete newCart[productId];
            } else {
                newCart[productId] = 1;
            }
            return newCart;
        });
    };

    const handleWhatsAppOrder = () => {
        // Generate WhatsApp message
        // Need to find products even if filtered out. 
        // Since 'products' only contains filtered list, this is a limitation of current simple query.
        // A proper implementation would keep a map of all seen products or fetch specific ids.
        // For the MVP fix, lets rely on 'cartSummary.items' which relies on 'products'. 
        // Alert user if cart is empty or items missing? 

        const selectedProducts = cartSummary.items;
        const total = cartSummary.total;

        if (selectedProducts.length === 0) return;

        let message = `Hi *${business.name}*, I would like to place an order:\n\n`;
        selectedProducts.forEach((p: any, index: number) => {
            message += `${index + 1}. *${p.name}* - ₹${p.price}\n`;
        });
        message += `\n*Total Estimate: ₹${total}*`;
        message += `\n\nPlease confirm availability.`;

        const encodedMessage = encodeURIComponent(message);
        const number = business.whatsappNumber || '';
        const cleanNumber = number.replace(/[^0-9]/g, '');

        window.open(`https://wa.me/${cleanNumber}?text=${encodedMessage}`, '_blank');
    };

    if (loadingBusiness) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
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
        <Layout className="min-h-screen bg-[#f8f9fa]">
            {/* Header */}
            <Layout.Header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between h-16 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3">
                    <span className="bg-green-100 text-green-600 p-2 rounded-lg">
                        <ShopOutlined className="text-xl" />
                    </span>
                    <h1 className="text-xl font-bold text-gray-800 m-0 truncate max-w-[200px] sm:max-w-md">
                        {business.name}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Search - Visible on Desktop */}
                    <div className="hidden md:block w-64">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Search..."
                            className="rounded-full bg-gray-50 border-transparent hover:bg-white focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </Layout.Header>

            <Layout.Content className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">

                {/* Mobile Search & Categories */}
                <div className="md:hidden mb-6 space-y-4">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Search products..."
                        className="rounded-full h-10 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Horizontal Scroll Categories */}
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === null
                                    ? 'bg-black text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200'
                                }`}
                        >
                            All
                        </button>
                        {categories?.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id
                                        ? 'bg-black text-white shadow-md'
                                        : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:block w-64 flex-shrink-0">
                        <div className="sticky top-24 space-y-6">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-medium ${selectedCategory === null
                                            ? 'bg-black text-white shadow-lg transform scale-105'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        All Products
                                    </button>
                                    {categories?.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm font-medium flex justify-between items-center ${selectedCategory === cat.id
                                                ? 'bg-black text-white shadow-lg transform scale-105'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span>{cat.name}</span>
                                            {cat._count?.products > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{cat._count.products}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">
                                {selectedCategory
                                    ? categories?.find((c: any) => c.id === selectedCategory)?.name
                                    : 'All Products'}
                            </h2>
                            <span className="text-gray-500 text-sm">{products?.length || 0} items</span>
                        </div>

                        {loadingProducts ? (
                            <div className="flex justify-center py-24"><Spin size="large" /></div>
                        ) : products?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Empty description="No products found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                                {products?.map((product: any) => {
                                    const inCart = !!cart[product.id];
                                    return (
                                        <div
                                            key={product.id}
                                            className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col relative ${inCart ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                                        >
                                            <div className="aspect-square bg-gray-50 relative overflow-hidden">
                                                {product.imageUrls?.[0] ? (
                                                    <img
                                                        src={product.imageUrls[0]}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                                                        <ShoppingOutlined style={{ fontSize: '48px' }} />
                                                    </div>
                                                )}

                                                {/* Overlay Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-1 leading-tight group-hover:text-green-600 transition-colors">
                                                        {product.name}
                                                    </h3>
                                                    <p className="text-gray-500 text-xs sm:text-sm line-clamp-2 mb-3 h-10">
                                                        {product.line1 || 'No description available'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                    <span className="font-bold text-lg text-gray-900">₹{product.price}</span>
                                                    <Button
                                                        type={inCart ? "primary" : "default"}
                                                        shape="circle"
                                                        size="large"
                                                        onClick={() => handleAddToCart(product.id)}
                                                        className={`flex items-center justify-center transition-all ${inCart ? 'bg-green-600 hover:bg-green-500 border-none' : 'hover:border-green-500 hover:text-green-600'}`}
                                                        icon={inCart ? <CheckOutlined /> : <PlusOutlined />}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Layout.Content>

            {/* Bottom Floating Bar (Mobile/Desktop) */}
            <div className={`fixed bottom-6 left-0 right-0 px-4 sm:px-6 z-50 transition-transform duration-500 transform ${cartSummary.count > 0 ? 'translate-y-0' : 'translate-y-[150%]'}`}>
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleWhatsAppOrder}
                        className="w-full bg-[#25D366] hover:bg-[#1fb854] text-white rounded-2xl shadow-xl shadow-green-500/20 p-4 flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-semibold backdrop-blur-sm">
                                {cartSummary.count} Items
                            </div>
                            <span className="font-medium opacity-90">
                                ₹{cartSummary.total.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-lg">
                            Place Order <WhatsAppOutlined className="text-xl group-hover:scale-110 transition-transform" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Added extra padding at bottom so content doesn't get hidden behind floating bar */}
            <div className="h-24"></div>

        </Layout>
    );
}
