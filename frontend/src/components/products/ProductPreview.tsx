import { ProductCard } from './ProductCard';

interface ProductPreviewProps {
    name: string;
    price: number;
    line1?: string;
    line2?: string;
    line3?: string;
    imageUrls: string[];
}

export function ProductPreview({ name, price, line1, line2, line3, imageUrls }: ProductPreviewProps) {
    return (
        <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 500, color: '#800000' }}>
                    Preview: How your product will appear to customers
                </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ProductCard
                    name={name}
                    price={price}
                    imageUrl={imageUrls[0] || ''}
                    line1={line1}
                    line2={line2}
                    line3={line3}
                    size="large"
                    showWhatsAppButton={true}
                />
            </div>
        </div>
    );
}
