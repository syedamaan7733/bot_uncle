import React from 'react';
import { Typography } from 'antd';

interface BusinessBrandingProps {
  name: string;
  logoUrl?: string;
  size?: 'small' | 'medium' | 'large';
  direction?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

const BusinessBranding: React.FC<BusinessBrandingProps> = ({
  name,
  logoUrl,
  size = 'medium',
  direction = 'horizontal',
  className,
  style,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          logoSize: 24,
          fontSize: '14px',
          fontWeight: 500,
        };
      case 'large':
        return {
          logoSize: 48,
          fontSize: '24px',
          fontWeight: 700,
        };
      default: // medium
        return {
          logoSize: 32,
          fontSize: '18px',
          fontWeight: 600,
        };
    }
  };

  const { logoSize, fontSize, fontWeight } = getSizeStyles();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: direction === 'horizontal' ? 'center' : 'flex-start',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: direction === 'horizontal' ? '12px' : '8px',
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          style={{
            width: logoSize,
            height: logoSize,
            objectFit: 'contain',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        />
      )}
      <Typography.Title
        level={size === 'large' ? 2 : size === 'medium' ? 3 : 5}
        style={{
          margin: 0,
          color: '#800000',
          fontSize,
          fontWeight,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}
      >
        {name}
      </Typography.Title>
    </div>
  );
};

export default BusinessBranding;
