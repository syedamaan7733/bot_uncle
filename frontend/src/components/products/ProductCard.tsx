import { Card, Typography, Badge, Checkbox } from 'antd';
import { WhatsAppOutlined } from '@ant-design/icons';

interface ProductCardProps {
    name: string;
    price: number;
    imageUrl: string;
    line1?: string;
    line2?: string;
    line3?: string;
    onClick?: () => void;
    showWhatsAppButton?: boolean;
    size?: 'small' | 'medium' | 'large';
    showCheckbox?: boolean;
    checkboxChecked?: boolean;
    onCheckboxChange?: () => void;
}

export function ProductCard({
    name,
    price,
    imageUrl,
    line1,
    line2,
    line3,
    onClick,
    showWhatsAppButton = true,
    size = 'medium',
    showCheckbox = false,
    checkboxChecked = false,
    onCheckboxChange,
}: ProductCardProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(price);
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    card: { width: '200px', height: '280px' },
                    image: { width: '180px', height: '120px' },
                    title: { fontSize: '14px' },
                    price: { fontSize: '16px' },
                    checkbox: { transform: 'scale(1.2)' }
                };
            case 'large':
                return {
                    card: { width: '280px', height: '380px' },
                    image: { width: '240px', height: '180px' },
                    title: { fontSize: '18px' },
                    price: { fontSize: '20px' },
                    checkbox: { transform: 'scale(1.4)' }
                };
            default: // medium
                return {
                    card: { width: '240px', height: '320px' },
                    image: { width: '200px', height: '150px' },
                    title: { fontSize: '16px' },
                    price: { fontSize: '18px' },
                    checkbox: { transform: 'scale(1.3)' }
                };
        }
    };

    const styles = getSizeStyles();

    return (
        <Card
            style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(128, 0, 0, 0.1)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                ...styles.card,
            }}
            bodyStyle={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between'
            }}
            hoverable={!!onClick}
            onClick={onClick}
        >
            <div style={{ height: '4px', width: '100%', background: '#800000' }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                {/* Image Container with only line 1 overlay */}
                <div
                    style={{
                        width: styles.image.width,
                        height: styles.image.height,
                        background: '#f5f5f5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    ) : (
                        <Typography.Text style={{ color: '#999', fontSize: '12px' }}>
                            No image
                        </Typography.Text>
                    )}

                    {/* Only line 1 overlaid on image */}
                    {line1 && (
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            right: '8px',
                            zIndex: 1
                        }}>
                            <Badge
                                color="purple"
                                style={{
                                    fontSize: size === 'small' ? '8px' : '10px',
                                    padding: size === 'small' ? '2px 6px' : '4px 8px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {line1}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Product Name */}
                <Typography.Title
                    level={4}
                    style={{
                        color: 'rgba(128, 0, 0, 0.8)',
                        margin: '0 0 4px 0',
                        textAlign: 'center',
                        fontSize: styles.title.fontSize,
                        lineHeight: '1.2',
                        // minHeight: '2.4em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {name || 'Product Name'}
                </Typography.Title>

                {/* Line 2 - Secondary prominence */}
                {line2 && (
                    <div style={{ marginBottom: '-4px', textAlign: 'center' }}>
                        <Typography.Text style={{
                            fontSize: size === 'small' ? '11px' : '13px',
                            color: 'rgba(128, 0, 0, 0.7)',
                            fontWeight: '500',
                        }}>
                            {line2}
                        </Typography.Text>
                    </div>
                )}

                {/* Line 3 - Less prominent, shorter */}
                {line3 && (
                    <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                        <Typography.Text style={{
                            fontSize: size === 'small' ? '10px' : '12px',
                            color: 'rgba(128, 0, 0, 0.6)',
                            fontWeight: '400',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {line3}
                        </Typography.Text>
                    </div>
                )}


                {/* Price at bottom */}
                <div style={{ marginTop: '2px', textAlign: 'center' }}>
                    <Typography.Text style={{
                        fontSize: styles.price.fontSize,
                        fontWeight: 'bold',
                        color: '#800000'
                    }}>
                        {formatPrice(price) || '₹0'}
                    </Typography.Text>
                </div>


                {/* WhatsApp CTA */}
                {showWhatsAppButton && (
                    <div style={{
                        marginTop: 'auto',
                        color: '#25D366',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <WhatsAppOutlined />
                        <Typography.Text style={{
                            fontSize: size === 'small' ? '10px' : '12px',
                            fontWeight: 'bold'
                        }}>
                            Click to enquire on WhatsApp
                        </Typography.Text>
                    </div>
                )}
            </div>

            {/* Enhanced Checkbox Overlay */}
            {showCheckbox && (
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '6px',
                        padding: '4px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCheckboxChange?.();
                    }}
                >
                    <Checkbox
                        checked={checkboxChecked}
                        style={{
                            ...styles.checkbox,
                            margin: 0,
                        }}
                        onChange={(e) => {
                            e.stopPropagation();
                            onCheckboxChange?.();
                        }}
                    />
                </div>
            )}
        </Card>
    );
}
