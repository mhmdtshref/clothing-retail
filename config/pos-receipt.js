// Simple config for receipt headers/footers
const POS_RECEIPT = {
  shopName: process.env.NEXT_PUBLIC_SHOP_NAME || 'Clothing Shop',
  addressLine1: process.env.NEXT_PUBLIC_SHOP_ADDR1 || '123 Market Street',
  addressLine2: process.env.NEXT_PUBLIC_SHOP_ADDR2 || 'City, Country',
  taxId: process.env.NEXT_PUBLIC_TAX_ID || 'TAX ID: 123456789',
  footerNote: process.env.NEXT_PUBLIC_RECEIPT_FOOTER || 'Thank you for your purchase!',
};

export default POS_RECEIPT;
