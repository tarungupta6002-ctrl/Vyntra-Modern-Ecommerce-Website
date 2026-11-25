'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  CheckCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  Star,
  Heart,
  ShoppingCart,
  Zap,
  ChevronRight,
  Share2,
  MapPin,
  Info,
  Ruler,
  Clock,
  Eye,
  CreditCard,
  Percent,
  Package,
  ThumbsUp,
  Lock,
  ChevronDown,
  Award,
  Store,
  Check,
  Layers,
  X,
  Smartphone,
  Cpu,
  Battery,
  Camera,
  Wifi,
  Laptop,
  Monitor,
  HardDrive,
  Headphones,
  Watch,
  BookOpen,
  FileText,
  Globe,
} from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore, WishlistAuthError } from '@/store/wishlist-store';
import { useAddressStore } from '@/store/address-store';
import { formatINR } from '@/lib/utils';
import { APlusContentDisplay } from '@/components/products/aplus-content-display';
import { ProductReviewsSection } from '@/components/products/product-reviews-section';
import { SellerOfferItem } from '@/types/multiseller';
import {
  DetailedProduct,
  ProductColor,
  ProductSize,
} from '@/data/products';

interface ProductDetailViewProps {
  product: DetailedProduct;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const { addItem, openCart } = useCartStore();
  const { getDefaultAddress, getSelectedAddress } = useAddressStore();
  const activeAddress = getSelectedAddress() || getDefaultAddress();

  // Active Gallery Image
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Partition offers: Original Creator on top, followed by Other Sellers (Sell Existing Product)
  const allAvailableOffers = product.sellerOffers || [];
  const originalCreatorOffer =
    allAvailableOffers.find(
      (o) =>
        o.isOriginalCreator ||
        o.vendorId === product.originalVendorId ||
        o.vendor.storeName === product.originalVendorName ||
        o.vendor.storeName === product.vendorName
    ) || allAvailableOffers[0];

  const existingSellersOffers = allAvailableOffers.filter(
    (o) => o.id !== originalCreatorOffer?.id
  );

  const drawerOffers = originalCreatorOffer
    ? [originalCreatorOffer, ...existingSellersOffers.sort((a, b) => a.sellingPrice - b.sellingPrice)]
    : allAvailableOffers;

  // Selections: Default to the Original Creator who listed the product (e.g. Varun Store)
  const defaultWinner = originalCreatorOffer || product.buyBox?.winner || product.sellerOffers?.[0];
  const [selectedOffer, setSelectedOffer] = useState<SellerOfferItem | undefined>(defaultWinner);

  useEffect(() => {
    const creator =
      (product.sellerOffers || []).find(
        (o) =>
          o.isOriginalCreator ||
          o.vendorId === product.originalVendorId ||
          o.vendor.storeName === product.originalVendorName ||
          o.vendor.storeName === product.vendorName
      ) || product.buyBox?.winner || product.sellerOffers?.[0];
    if (creator) {
      setSelectedOffer(creator);
    }
  }, [product.id, product.sellerOffers, product.originalVendorId]);

  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(
    product.colors?.[0]
  );

  const isFootwear = useMemo(() => {
    const titleLower = (product.title || '').toLowerCase();
    const catLower = (product.category || '').toLowerCase();
    const subCatLower = (product.subCategory || '').toLowerCase();
    const hasUkSizes = (product.sizes || []).some((s) => s.size?.toUpperCase().includes('UK'));
    return (
      hasUkSizes ||
      titleLower.includes('shoe') ||
      titleLower.includes('sneaker') ||
      titleLower.includes('sandal') ||
      titleLower.includes('boot') ||
      titleLower.includes('loafer') ||
      titleLower.includes('footwear') ||
      catLower.includes('shoe') ||
      catLower.includes('footwear') ||
      subCatLower.includes('shoe') ||
      subCatLower.includes('footwear')
    );
  }, [product]);

  const isWomenFootwear = useMemo(() => {
    if (!isFootwear) return false;
    const combined = `${product.title || ''} ${product.category || ''} ${product.subCategory || ''}`.toLowerCase();
    return (
      combined.includes('women') ||
      combined.includes('girl') ||
      combined.includes('female') ||
      combined.includes('ladies') ||
      (product.sizes || []).some((s) => ['3 UK', '4 UK', '5 UK'].includes(s.size))
    );
  }, [isFootwear, product]);

  const isLaptopOrComputer = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat.includes('laptop') ||
      cat.includes('computer') ||
      subCat.includes('laptop') ||
      subCat.includes('computer') ||
      subCat.includes('macbook') ||
      title.includes('laptop') ||
      title.includes('macbook') ||
      title.includes('ultrabook') ||
      title.includes('notebook') ||
      title.includes('ai pc') ||
      title.includes('intel core') ||
      title.includes('ryzen') ||
      slug.includes('laptop') ||
      slug.includes('macbook') ||
      slug.includes('swift') ||
      slug.includes('xps') ||
      slug.includes('zenbook') ||
      slug.includes('thinkpad') ||
      slug.includes('rog') ||
      slug.includes('predator') ||
      slug.includes('ideapad')
    );
  }, [product]);

  const isAudioOrHeadphones = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat.includes('audio') ||
      cat.includes('headphone') ||
      subCat.includes('audio') ||
      subCat.includes('headphone') ||
      subCat.includes('earphone') ||
      subCat.includes('earbud') ||
      subCat.includes('speaker') ||
      title.includes('headphone') ||
      title.includes('earbud') ||
      title.includes('airpods') ||
      title.includes('soundbar') ||
      title.includes('tws') ||
      slug.includes('wh-1000') ||
      slug.includes('airdopes') ||
      slug.includes('airpods')
    );
  }, [product]);

  const isSmartwatch = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat.includes('smartwatch') ||
      subCat.includes('smartwatch') ||
      subCat.includes('wearable') ||
      title.includes('smartwatch') ||
      title.includes('apple watch') ||
      title.includes('galaxy watch') ||
      title.includes('smart watch') ||
      slug.includes('watch-series') ||
      slug.includes('smartwatch')
    );
  }, [product]);

  const isCamera = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat.includes('camera') ||
      subCat.includes('camera') ||
      subCat.includes('photography') ||
      title.includes('camera') ||
      title.includes('mirrorless') ||
      title.includes('dslr') ||
      title.includes('alpha ilce') ||
      title.includes('eos r') ||
      title.includes('gopro') ||
      title.includes('lumix') ||
      slug.includes('camera') ||
      slug.includes('ilce')
    );
  }, [product]);

  const isAppliance = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat.includes('appliance') ||
      subCat.includes('appliance') ||
      subCat.includes('refrigerator') ||
      subCat.includes('washing') ||
      subCat.includes('conditioner') ||
      subCat.includes('microwave') ||
      title.includes('refrigerator') ||
      title.includes('fridge') ||
      title.includes('washing machine') ||
      title.includes('air conditioner') ||
      title.includes('split ac') ||
      title.includes('microwave') ||
      title.includes('chimney') ||
      title.includes('water purifier') ||
      title.includes('geyser') ||
      title.includes('vacuum cleaner') ||
      title.includes('cooler') ||
      slug.includes('fridge') ||
      slug.includes('washing') ||
      slug.includes('ac-') ||
      slug.includes('app-')
    );
  }, [product]);

  const isBook = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat === 'books' ||
      cat.includes('book') ||
      subCat.includes('book') ||
      subCat.includes('literature') ||
      title.includes('hardcover') ||
      title.includes('paperback') ||
      title.includes('novel') ||
      slug.includes('book') ||
      slug.includes('habits') ||
      slug.includes('psychology-of-money') ||
      slug.includes('rich-dad') ||
      slug.includes('meluha') ||
      slug.includes('grandma') ||
      slug.includes('ikigai')
    );
  }, [product]);

  const isMobilePhone = useMemo(() => {
    // If it's a laptop, audio device, smartwatch, camera, appliance, or book, it is NOT a mobile phone
    if (isLaptopOrComputer || isAudioOrHeadphones || isSmartwatch || isCamera || isAppliance || isBook) return false;
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat === 'mobiles' ||
      cat === 'smartphones' ||
      subCat.includes('mobile') ||
      subCat.includes('smartphone') ||
      title.includes('smartphone') ||
      (title.includes('phone') && !title.includes('headphone') && !title.includes('earphone')) ||
      slug.includes('iphone') ||
      slug.includes('galaxy-s') ||
      slug.includes('oneplus-12') ||
      slug.includes('redmi-note') ||
      slug.includes('realme-12') ||
      slug.includes('motorola-edge')
    );
  }, [product, isLaptopOrComputer, isAudioOrHeadphones, isSmartwatch, isCamera, isAppliance, isBook]);

  const isMobileOrElectronic = useMemo(() => {
    if (isBook) return false;
    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();
    return (
      cat === 'mobiles' ||
      cat === 'electronics' ||
      cat === 'appliances' ||
      cat.includes('electronic') ||
      cat.includes('mobile') ||
      cat.includes('laptop') ||
      cat.includes('computer') ||
      cat.includes('appliance') ||
      isLaptopOrComputer ||
      isAudioOrHeadphones ||
      isSmartwatch ||
      isCamera ||
      isAppliance ||
      subCat.includes('mobile') ||
      subCat.includes('phone') ||
      subCat.includes('smartphone') ||
      subCat.includes('laptop') ||
      subCat.includes('audio') ||
      subCat.includes('headphone') ||
      subCat.includes('smartwatch') ||
      subCat.includes('tablet') ||
      subCat.includes('appliance') ||
      subCat.includes('refrigerator') ||
      subCat.includes('washing') ||
      subCat.includes('conditioner') ||
      title.includes('phone') ||
      title.includes('5g') ||
      title.includes('laptop') ||
      title.includes('macbook') ||
      title.includes('headphone') ||
      title.includes('processor') ||
      title.includes('intel') ||
      title.includes('ryzen') ||
      title.includes('ai pc') ||
      slug.includes('iphone') ||
      slug.includes('samsung') ||
      slug.includes('oneplus') ||
      slug.includes('redmi') ||
      slug.includes('realme') ||
      slug.includes('motorola') ||
      slug.includes('nothing-phone') ||
      slug.includes('vivo') ||
      slug.includes('oppo') ||
      slug.includes('swift') ||
      slug.includes('laptop') ||
      Boolean(
        product.customSpecs?.some(
          (s) =>
            s.label?.toLowerCase().includes('ram') ||
            s.label?.toLowerCase().includes('processor') ||
            s.label?.toLowerCase().includes('storage') ||
            s.label?.toLowerCase().includes('display') ||
            s.label?.toLowerCase().includes('operating system')
        )
      )
    );
  }, [product, isBook, isLaptopOrComputer, isAudioOrHeadphones, isSmartwatch, isCamera, isAppliance]);

  // Strict Fashion Category check: Size Guide & Detailed Measurements MUST ONLY appear for genuine fashion & footwear
  const isFashionCategory = useMemo(() => {
    // 1. Strict non-fashion hard exclusions (Electronics, Mobiles, Appliances, Books, Beauty, Home)
    if (
      isBook ||
      isAppliance ||
      isLaptopOrComputer ||
      isAudioOrHeadphones ||
      isSmartwatch ||
      isCamera ||
      isMobileOrElectronic
    ) {
      return false;
    }

    const cat = (product.category || '').toLowerCase();
    const subCat = (product.subCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    const slug = (product.slug || '').toLowerCase();

    const nonFashionTerms = [
      'electronics', 'laptop', 'computer', 'pc', 'notebook', 'desktop', 'mobile',
      'smartphone', 'phone', 'tablet', 'audio', 'headphone', 'earphone', 'speaker',
      'soundbar', 'smartwatch', 'camera', 'appliance', 'refrigerator', 'fridge',
      'washing', 'conditioner', 'cooler', 'geyser', 'heater', 'microwave', 'oven',
      'purifier', 'vacuum', 'dishwasher', 'chimney', 'mixer', 'grinder', 'iron',
      'book', 'novel', 'literature', 'hardcover', 'paperback', 'author', 'isbn',
      'beauty', 'wellness', 'perfume', 'attar', 'skincare', 'cosmetic', 'serum',
      'shampoo', 'cream', 'makeup', 'lipstick', 'home-living', 'utensil', 'kitchen',
      'cookware', 'crockery', 'furniture', 'decor'
    ];
    if (nonFashionTerms.some((term) => cat.includes(term) || subCat.includes(term))) {
      return false;
    }

    // 2. Footwear is always fashion
    if (isFootwear) return true;

    // 3. Positive fashion keyword matching
    const fashionKeywords = [
      'fashion', 'clothing', 'apparel', 'ethnic', 'western', 'saree', 'sari', 'suit',
      'kurta', 'kurti', 'dress', 'shirt', 'tshirt', 't-shirt', 'top', 'pant', 'jean',
      'trouser', 'blazer', 'jacket', 'coat', 'hoodie', 'sweater', 'cardigan', 'skirt',
      'lehenga', 'anarkali', 'sherwani', 'palazzo', 'legging', 'lingerie', 'bra',
      'panty', 'sleepwear', 'loungewear', 'innerwear', 'nightwear', 'footwear',
      'shoe', 'sneaker', 'sandal', 'heel', 'flat', 'boot', 'churidar', 'salwar',
      'dupatta', 'shawl', 'stole', 'chunni', 'mens-clothing', 'womens-clothing',
      'boys-clothing', 'girls-clothing', 'western-wear'
    ];

    if (fashionKeywords.some((k) => cat.includes(k) || subCat.includes(k) || title.includes(k) || slug.includes(k))) {
      return true;
    }

    // 4. Has standard apparel sizing
    const hasApparelSizes = (product.sizes || []).some((s) => {
      const sz = (s.size || '').toLowerCase().trim();
      return ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', 'xxl', 'xxxl'].includes(sz);
    });

    return Boolean(hasApparelSizes);
  }, [
    isBook,
    isAppliance,
    isLaptopOrComputer,
    isAudioOrHeadphones,
    isSmartwatch,
    isCamera,
    isMobileOrElectronic,
    isFootwear,
    product,
  ]);

  const isUnstitchedOrFreeSize =
    isFashionCategory &&
    !isFootwear &&
    (product.category === 'ethnic' ||
      product.category?.toLowerCase().includes('saree') ||
      product.subCategory?.toLowerCase().includes('saree') ||
      product.title?.toLowerCase().includes('saree') ||
      product.subCategory?.toLowerCase().includes('shawl') ||
      product.subCategory?.toLowerCase().includes('dupatta'));

  const defaultSize = isUnstitchedOrFreeSize
    ? 'Free Size'
    : product.sizes?.[0]
    ? product.sizes[0].size
    : isFootwear
    ? isWomenFootwear
      ? '5 UK'
      : '8 UK'
    : isMobileOrElectronic
    ? product.rawVariants?.[0]?.size || 'Standard Edition'
    : 'Free Size';

  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [quantity, setQuantity] = useState(1);
  const isWishlisted = useWishlistStore((state) =>
    state.items.some(
      (item) =>
        item.id === product.id ||
        item.productId === product.id ||
        (item.slug && (item.slug === product.slug || item.slug === product.id))
    )
  );
  const [pincode, setPincode] = useState(activeAddress?.pincode || '210427');
  const [pincodeChecked, setPincodeChecked] = useState(true);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>({});
  const [sellersDrawerOpen, setSellersDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'info' }>({
    show: false,
    message: '',
  });

  const [wishlistBusy, setWishlistBusy] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2500);
  };

  // Color selection with gallery sync & variant resolution
  const handleSelectColor = (color: ProductColor) => {
    setSelectedColor(color);

    // Sync gallery image if this color variant has a dedicated image
    if (color.imageUrl) {
      const matchedIdx = product.images.findIndex((img) => img.src === color.imageUrl);
      if (matchedIdx !== -1) {
        setActiveImageIndex(matchedIdx);
      }
    }

    // Adapt selected size if current size is not offered in this color
    if (product.rawVariants && product.rawVariants.length > 0) {
      const colorVariants = product.rawVariants.filter(
        (v) => !v.color || v.color.toLowerCase() === color.name.toLowerCase()
      );
      if (colorVariants.length > 0) {
        const hasCurrentSize = colorVariants.some(
          (v) => v.size && v.size.toLowerCase() === selectedSize.toLowerCase()
        );
        if (!hasCurrentSize && colorVariants[0].size) {
          setSelectedSize(colorVariants[0].size);
        }
      }
    }
  };

  // Unique deduplicated sizes list, dynamically factoring in selectedColor if variants exist
  const uniqueSizesList = useMemo(() => {
    if (!product.sizes || product.sizes.length === 0) return [];

    const map = new Map<string, { size: string; dimension?: string; disabled: boolean }>();
    product.sizes.forEach((s) => {
      if (!map.has(s.size)) {
        map.set(s.size, { size: s.size, dimension: s.dimension, disabled: Boolean(s.disabled) });
      }
    });

    const list = Array.from(map.values());

    // If color is selected and rawVariants exist, update disabled status based on that color's stock
    if (selectedColor && product.rawVariants && product.rawVariants.length > 0) {
      return list.map((item) => {
        const variantForColor = product.rawVariants?.find(
          (v) =>
            v.size?.toLowerCase() === item.size.toLowerCase() &&
            (!v.color || v.color.toLowerCase() === selectedColor.name.toLowerCase())
        );
        return {
          ...item,
          disabled: !variantForColor || variantForColor.stock <= 0,
        };
      });
    }

    return list;
  }, [product.sizes, product.rawVariants, selectedColor]);

  // Resolve Real Database Variant (if available)
  const selectedVariant = product.rawVariants?.find((v) => {
    const sizeMatches = !v.size || v.size.toLowerCase() === selectedSize.toLowerCase();
    const colorMatches = !v.color || v.color.toLowerCase() === (selectedColor?.name || '').toLowerCase();
    return sizeMatches && colorMatches;
  }) || product.rawVariants?.find((v) => !v.size || v.size.toLowerCase() === selectedSize.toLowerCase()) || product.rawVariants?.[0];

  // Matched offer variant within selectedOffer (if multi-seller variants exist)
  const matchedOfferVariant = selectedOffer?.offerVariants?.find(
    (ov) => ov.productVariantId === selectedVariant?.id
  ) || selectedOffer?.offerVariants?.[0];

  const currentPrice =
    matchedOfferVariant?.sellingPrice ??
    (selectedOffer?.sellingPrice ?? (selectedVariant?.price || product.price));
  const currentMrp =
    matchedOfferVariant?.mrpPrice ??
    (selectedOffer?.originalPrice ??
      (product.originalPrice > currentPrice ? product.originalPrice : currentPrice));
  const currentSavings = currentMrp - currentPrice;
  const currentDiscountPercent =
    currentMrp > currentPrice ? Math.round((currentSavings / currentMrp) * 100) : 0;

  const currentStock =
    matchedOfferVariant?.stock !== undefined
      ? matchedOfferVariant.stock
      : selectedOffer?.stock !== undefined
      ? selectedOffer.stock
      : selectedVariant && selectedVariant.stock !== undefined
      ? selectedVariant.stock
      : product.stockCount !== undefined
      ? product.stockCount
      : 15;

  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= 5;
  const activeImage = product.images[activeImageIndex] || product.images[0];

  // Sticky bar scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Image zoom handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // Add to Cart
  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast('This item is currently out of stock.', 'info');
      return;
    }

    const targetVariantId = selectedVariant?.id || `var-${product.id}`;
    const targetOfferVariantId = matchedOfferVariant?.id || selectedOffer?.id;

    addItem({
      id: `cart-${product.id}-${selectedOffer?.id || 'default'}-${targetVariantId}-${Date.now()}`,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: targetVariantId,
      size: isUnstitchedOrFreeSize ? 'Free Size' : (selectedSize || undefined),
      color: selectedColor?.name || undefined,
      price: currentPrice,
      originalPrice: currentMrp,
      quantity,
      image: activeImage.src,
      vendorName: selectedOffer?.vendor?.storeName || product.vendorName,
      vendorId: selectedOffer?.vendorId,
      sellerOfferId: selectedOffer?.isOriginalCreator ? undefined : selectedOffer?.id,
      offerVariantId: selectedOffer?.isOriginalCreator ? undefined : targetOfferVariantId,
      handlingDays: selectedOffer?.handlingDays || 2,
    });

    showToast(`Added ${quantity} item(s) to Cart!`);
  };

  // Add to Cart for specific alternative Seller Offer
  const handleAddToCartOffer = (offer: SellerOfferItem) => {
    if (offer.stock <= 0) {
      showToast(`${offer.vendor.storeName} is currently out of stock.`, 'info');
      return;
    }

    const targetVariantId = selectedVariant?.id || `var-${product.id}`;
    const matchedOV =
      offer.offerVariants?.find((ov) => ov.productVariantId === selectedVariant?.id) ||
      offer.offerVariants?.[0];

    addItem({
      id: `cart-${product.id}-${offer.id}-${targetVariantId}-${Date.now()}`,
      productId: product.id,
      title: product.title,
      brand: product.brand,
      variantId: targetVariantId,
      size: isUnstitchedOrFreeSize ? 'Free Size' : (selectedSize || undefined),
      color: selectedColor?.name || undefined,
      price: matchedOV?.sellingPrice ?? offer.sellingPrice,
      originalPrice: matchedOV?.mrpPrice ?? offer.originalPrice,
      quantity: 1,
      image: activeImage.src,
      vendorName: offer.vendor.storeName,
      vendorId: offer.vendorId,
      sellerOfferId: offer.isOriginalCreator ? undefined : offer.id,
      offerVariantId: offer.isOriginalCreator ? undefined : (matchedOV?.id || offer.id),
      handlingDays: offer.handlingDays,
    });

    showToast(`Added to Bag from ${offer.vendor.storeName}!`);
  };

  // Select an offer to become the active offer on PDP
  const handleSelectOffer = (offer: SellerOfferItem) => {
    if (offer.stock <= 0) {
      showToast(`Cannot select ${offer.vendor.storeName}: currently out of stock.`, 'info');
      return;
    }
    setSelectedOffer(offer);
    showToast(`Switched seller to ${offer.vendor.storeName}!`, 'info');
  };

  // Buy Now
  const handleBuyNow = () => {
    if (isOutOfStock) {
      showToast('This item is currently out of stock.', 'info');
      return;
    }
    handleAddToCart();
    openCart();
  };

  // Wishlist toggle
  const toggleWishlist = async () => {
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const result = await useWishlistStore.getState().toggleItemResult({
        id: product.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        subtitle: product.subtitle,
        brand: product.brand,
        category: product.category,
        price: currentPrice,
        originalPrice: currentMrp,
        discount: `${currentDiscountPercent}% OFF`,
        rating: product.rating,
        reviewCount: product.reviewCount,
        image: activeImage.src,
        inStock: !isOutOfStock,
        boardIds: ['all'],
      });
      if (result === 'added') {
        showToast('Saved to your Wishlist!');
      } else {
        showToast('Removed from Wishlist', 'info');
      }
    } catch (err: any) {
      // Sign-in errors open the global sign-in dialog (from the store); only toast other failures.
      if (!(err instanceof WishlistAuthError)) {
        showToast(err?.message || 'Could not update Wishlist.', 'info');
      }
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!');
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen text-[#0F1111] font-sans antialiased">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl bg-[#0F1111] text-white text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <CheckCircle className="h-4 w-4 text-[#FFD814]" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="border-b border-[#EAEDED] bg-white">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-2.5 text-xs text-[#565959] flex items-center gap-1.5 flex-wrap">
          {product.breadcrumb.map((crumb, idx) => (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <span className="text-[#888C8C]">›</span>}
              <Link href={crumb.href} className="hover:text-[#007185] hover:underline">
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-[#888C8C]">›</span>
          <span className="text-[#0F1111] font-semibold truncate max-w-xs">{product.title}</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PRIMARY PRODUCT SECTION (AMAZON 3-COLUMN ARCHITECTURE)               */}
      {/* Left: Gallery (5 cols) | Center: Details (4 cols) | Right: Buy Box (3 cols) */}
      {/* ===================================================================== */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================================================================= */}
          {/* COLUMN 1: PRODUCT GALLERY WITH THUMBNAILS & ZOOM (5 COLS)        */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-4 lg:sticky lg:top-24">
            {/* Thumbnails strip */}
            {product.images.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible shrink-0 pb-2 sm:pb-0 no-scrollbar">
                {product.images.map((img, idx) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onMouseEnter={() => setActiveImageIndex(idx)}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-14 h-18 sm:w-16 sm:h-20 rounded-md overflow-hidden bg-[#F7F8F8] border transition-all shrink-0 ${
                        isActive
                          ? 'border-[#007185] ring-2 ring-[#007185]/30 shadow-sm'
                          : 'border-[#D5D9D9] hover:border-[#565959] opacity-80 hover:opacity-100'
                      }`}
                      title={img.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.alt} className="w-full h-full object-contain p-1" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Primary Image with Magnifier Zoom */}
            <div className="relative flex-1 rounded-xl overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shadow-sm group">
              <div
                className="relative w-full aspect-[3/4] overflow-hidden cursor-crosshair flex items-center justify-center bg-white p-3"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={activeImage.id || activeImage.src}
                  src={activeImage.src}
                  alt={activeImage.alt}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  style={
                    isZooming
                      ? {
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          transform: 'scale(1.8)',
                        }
                      : { transform: 'scale(1)' }
                  }
                  className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-100 ease-out select-none mx-auto animate-in fade-in duration-200"
                />

                {/* Overlays / Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  {product.badge && (
                    <span className="bg-[#800020] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded shadow-md flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#FFD814]" />
                      <span>{product.badge}</span>
                    </span>
                  )}
                  {isMobileOrElectronic ? (
                    <span className="bg-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded shadow-md">
                      Brand Warranty • 5G
                    </span>
                  ) : product.isCustomized ? (
                    <span className="bg-[#FFD814] text-[#0F1111] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded shadow-md border border-[#FCD200]">
                      Customized / Made to Order
                    </span>
                  ) : (
                    <span className="bg-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded shadow-md">
                      Ready to Ship
                    </span>
                  )}
                </div>

                {/* Top-Right Wishlist and Share Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#D5D9D9] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? 'text-[#CC0C39] fill-[#CC0C39]' : 'text-[#565959]'}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#D5D9D9] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all text-[#565959] hover:text-[#007185]"
                    title="Share Product"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Hover Zoom Helper */}
                {!isZooming && (
                  <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-sm border border-[#D5D9D9] px-2.5 py-1 rounded text-[10px] font-semibold text-[#565959] flex items-center gap-1 shadow-sm pointer-events-none">
                    <Eye className="h-3 w-3 text-[#007185]" />
                    <span>Roll over image to zoom in</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* COLUMN 2: CORE DETAILS, RATINGS, VARIANTS & HIGHLIGHTS (4 COLS)   */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 space-y-4">
            {/* Brand Store Link */}
            <div>
              <Link
                href={
                  isBook
                    ? `/books?author=${encodeURIComponent(product.brand)}`
                    : isAppliance
                    ? `/appliances?brand=${encodeURIComponent(product.brand)}`
                    : isMobilePhone
                    ? `/mobiles?brand=${encodeURIComponent(product.brand)}`
                    : `/products?brand=${encodeURIComponent(product.brand)}`
                }
                className="text-xs font-bold text-[#007185] hover:underline"
              >
                {isBook
                  ? `by ${product.brand} (Author)`
                  : `Visit the ${product.brand} ${isAppliance ? 'Appliances Store' : isMobileOrElectronic ? 'Official Store' : 'Atelier Store'}`}
              </Link>
              <h1 className="text-xl sm:text-2xl font-headline font-bold text-[#0F1111] leading-snug mt-1">
                {product.title}
              </h1>
              {product.subtitle && !product.subtitle.trim().startsWith('{') && (
                <p className="text-xs text-[#565959] mt-0.5 leading-relaxed">{product.subtitle}</p>
              )}
            </div>

            {/* Ratings, Reviews & Amazon Choice Badge */}
            <div className="flex items-center gap-2 flex-wrap text-xs pb-3 border-b border-[#EAEDED]">
              <div className="flex items-center gap-1 text-[#FFA41C]">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= Math.round(product.rating)
                          ? 'fill-[#FFA41C] text-[#FFA41C]'
                          : 'text-[#D5D9D9]'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-[#0F1111] ml-1">{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-[#565959]">|</span>
              <a href="#customer-reviews" className="text-[#007185] hover:underline">
                {product.reviewCount} customer reviews
              </a>
              <span className="text-[#565959]">|</span>
              <span className="bg-[#131921] text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                Vyntra&apos;s Choice
              </span>
            </div>

            {/* Pricing Section (Amazon Style) */}
            <div className="space-y-1 pb-4 border-b border-[#EAEDED]">
              <div className="flex items-baseline gap-2">
                {currentDiscountPercent > 0 && (
                  <span className="text-2xl font-light text-[#CC0C39]">
                    -{currentDiscountPercent}%
                  </span>
                )}
                <div className="flex items-start">
                  <span className="text-xs font-bold text-[#0F1111] mt-1 mr-0.5">₹</span>
                  <span className="text-3xl font-extrabold text-[#0F1111]">
                    {currentPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {currentMrp > currentPrice && (
                <div className="text-xs text-[#565959]">
                  M.R.P.: <span className="line-through">{formatINR(currentMrp)}</span>
                </div>
              )}

              <p className="text-[11px] text-[#565959]">
                Inclusive of all taxes. Free express shipping across India.
              </p>
            </div>

            {/* Color Selector — Amazon-Style Image Swatches */}
            {!isBook && product.colors && product.colors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#565959]">
                    Color:{' '}
                    <strong className="text-[#0F1111] font-bold">{selectedColor?.name}</strong>
                  </span>
                  <span className="text-[11px] font-semibold text-[#565959]">
                    {product.colors.length} {product.colors.length === 1 ? 'choice' : 'choices'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor?.name === color.name;
                    const swatchImg =
                      color.imageUrl ||
                      (product.colors && product.colors.length === 1 ? product.images[0]?.src : undefined);

                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => handleSelectColor(color)}
                        className={`group relative flex flex-col items-center p-1 rounded-lg border-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007185] focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'border-[#007185] ring-2 ring-[#007185]/20 bg-[#007185]/5 shadow-sm'
                            : 'border-[#D5D9D9] hover:border-[#565959] bg-white'
                        }`}
                        title={`Select ${color.name}`}
                        aria-label={`Color ${color.name}${isSelected ? ' (Selected)' : ''}`}
                        aria-pressed={isSelected}
                      >
                        {/* Square Swatch Thumbnail */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-[#F7F8F8] flex items-center justify-center relative">
                          {swatchImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={swatchImg}
                              alt={color.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : color.hex ? (
                            <div
                              className="w-full h-full flex items-center justify-center shadow-inner"
                              style={{ backgroundColor: color.hex }}
                            >
                              <span className="text-[10px] font-bold text-white/90 drop-shadow uppercase">
                                {color.name.slice(0, 3)}
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-[#E3E6E6] flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#565959]">
                                {color.name.slice(0, 2)}
                              </span>
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#007185] text-white flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>

                        {/* Color name caption under swatch */}
                        <span
                          className={`text-[10px] mt-1 max-w-[64px] truncate text-center font-medium ${
                            isSelected ? 'font-bold text-[#007185]' : 'text-[#565959]'
                          }`}
                        >
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size / Storage Variant Selector with Live Stock Indication */}
            {product.sizes &&
              product.sizes.length > 0 &&
              !(
                product.colors &&
                product.colors.length > 0 &&
                uniqueSizesList.every((s) => {
                  const lower = (s.size || '').toLowerCase().trim();
                  return (
                    lower === 'standard edition' ||
                    lower === 'standard' ||
                    lower === 'default' ||
                    lower === 'regular' ||
                    lower === 'one size'
                  );
                })
              ) && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#565959]">
                    {isBook
                      ? 'Binding / Format:'
                      : isMobilePhone
                      ? 'Storage / Variant:'
                      : isCamera
                      ? 'Kit / Configuration:'
                      : isAppliance
                      ? 'Capacity / Star Rating:'
                      : isAudioOrHeadphones
                      ? 'Edition / Style:'
                      : isLaptopOrComputer
                      ? 'Configuration / Spec:'
                      : isMobileOrElectronic
                      ? 'Option / Variant:'
                      : 'Size:'}{' '}
                    <strong className="text-[#0F1111]">{selectedSize}</strong>
                  </span>
                  {/* Size Chart Link (Fashion only) */}
                  {isFashionCategory && !isUnstitchedOrFreeSize && (
                    <a
                      href="#size-chart"
                      className="text-[#007185] hover:underline flex items-center gap-1 font-semibold text-xs"
                    >
                      <Ruler className="h-3 w-3" />
                      <span>{isFootwear ? 'Size Guide' : 'Size Chart'}</span>
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isFashionCategory && (isUnstitchedOrFreeSize || (product.sizes.length === 1 && product.sizes[0].size.toLowerCase().includes('free'))) ? (
                    <span className="inline-block px-3 py-1 bg-[#F7F8F8] border border-[#D5D9D9] rounded-md text-xs font-bold text-[#0F1111]">
                      Free Size {isUnstitchedOrFreeSize ? '(Standard 5.5m + 0.8m Blouse Piece)' : ''}
                    </span>
                  ) : (
                    uniqueSizesList.map((s) => {
                      const isSelected = selectedSize === s.size;
                      return (
                        <button
                          key={s.size}
                          type="button"
                          disabled={s.disabled}
                          onClick={() => setSelectedSize(s.size)}
                          className={`min-w-14 px-3.5 py-2 rounded-md text-xs font-bold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007185] focus-visible:ring-offset-2 ${
                            isSelected
                              ? 'border-[#007185] bg-[#007185]/10 text-[#007185] shadow-sm ring-1 ring-[#007185]'
                              : s.disabled
                              ? 'border-[#E5E7EB] bg-[#F7F8F8] text-stone-400 line-through cursor-not-allowed opacity-60'
                              : 'border-[#D5D9D9] bg-white text-[#0F1111] hover:border-[#565959] cursor-pointer'
                          }`}
                          title={s.disabled ? `${s.size} - Currently out of stock` : `${s.size}`}
                          aria-label={`${isMobileOrElectronic ? 'Storage' : 'Size'} ${s.size}${isSelected ? ' (Selected)' : ''}${s.disabled ? ' (Out of stock)' : ''}`}
                          aria-pressed={isSelected}
                        >
                          {s.size}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Bullet Highlights ("About this item") */}
            <div className="pt-4 border-t border-[#EAEDED] space-y-2">
              <h3 className="font-headline font-bold text-sm text-[#0F1111]">About this item</h3>
              <ul className="space-y-1.5 text-xs text-[#0F1111] leading-relaxed list-disc list-inside">
                {(product.highlights && product.highlights.length > 0
                  ? product.highlights
                  : [
                      `Brand: ${product.brand}`,
                      'Authentic product verified under Vyntra quality assurance standards',
                      product.isCustomized
                        ? 'Customized / Made to Order: Specially tailored upon order placement'
                        : 'Ready to Ship: Express dispatched within 24 hours in protective packaging',
                      '100% Genuine guaranteed by verified sellers across India',
                    ]
                ).map((hl, i) => (
                  <li key={i} className="text-[#0F1111]">
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ================================================================= */}
          {/* COLUMN 3: AMAZON-STYLE BUY BOX CARD (3 COLS)                     */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto pr-1 no-scrollbar space-y-3">
            <div className="rounded-2xl border border-[#D5D9D9] bg-white p-4 shadow-md space-y-3">
              {/* Buy Box Featured Status Pill */}
              {selectedOffer && (
                <div className="flex items-center justify-between pb-1">
                  {selectedOffer.isOriginalCreator || selectedOffer.vendorId === product.originalVendorId || selectedOffer.vendor.storeName === product.vendorName ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#800020] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="h-3 w-3 text-[#FF9900]" />
                      <span>Featured Creator Listing</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#007185] bg-[#007185]/10 border border-[#007185]/30 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" />
                      <span>Alternative Seller Selected</span>
                    </span>
                  )}
                  {selectedOffer.fulfillmentType === 'VYNTRA_FULFILLED' ? (
                    <span className="text-[10px] font-bold text-[#067D62]">Vyntra Fulfilled</span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#565959]">Direct Dispatch</span>
                  )}
                </div>
              )}

              {/* Buy Box Price */}
              <div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-[#0F1111]">₹</span>
                  <span className="text-2xl font-extrabold text-[#0F1111]">
                    {currentPrice.toLocaleString('en-IN')}
                  </span>
                  {currentMrp > currentPrice && (
                    <>
                      <span className="text-xs text-[#565959] line-through font-medium">
                        ₹{currentMrp.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-[#CC0C39]">
                        {currentDiscountPercent}% OFF
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-[#007185] font-semibold mt-0.5">
                  FREE Delivery across India
                </p>
              </div>

              {/* Delivery Estimation & Pincode Check */}
              <div className="text-xs space-y-1 text-[#565959] pb-2 border-b border-[#EAEDED]">
                <div className="flex items-center gap-1.5 text-[#0F1111] font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-[#007185] shrink-0" />
                  <span suppressHydrationWarning>
                    {mounted && activeAddress
                      ? `Deliver to ${activeAddress.city} ${activeAddress.pincode}`
                      : 'Pan-India Express Delivery'}
                  </span>
                </div>
                <p className="text-[11px] text-[#067D62] font-bold">
                  {selectedOffer
                    ? `Estimated delivery in ${selectedOffer.estimatedDeliveryDays} business days`
                    : isMobileOrElectronic
                    ? 'Fastest delivery Tomorrow with Express SLA'
                    : product.isCustomized
                    ? 'Expected delivery in 5-7 business days (Tailored Craft)'
                    : 'Fastest delivery Tomorrow with Express SLA'}
                </p>
              </div>

              {/* Stock Status Indicator */}
              <div className="space-y-1">
                {isOutOfStock ? (
                  <div className="text-sm font-bold text-[#CC0C39]">Currently Out of Stock</div>
                ) : isLowStock ? (
                  <div className="text-sm font-bold text-[#B12704]">
                    Only {currentStock} left in stock - order soon.
                  </div>
                ) : (
                  <div className="text-base font-bold text-[#067D62]">In Stock</div>
                )}
                {isMobileOrElectronic ? (
                  <p className="text-[11px] text-[#007185] font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#067D62]" />
                    <span>7 Days Replacement • Brand Warranty</span>
                  </p>
                ) : product.isCustomized ? (
                  <p className="text-[11px] text-[#800020] font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Customized on order for you</span>
                  </p>
                ) : null}
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#0F1111]">Quantity:</label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D5D9D9] bg-[#F7F8F8] font-bold focus:outline-none focus:border-[#007185]"
                  >
                    {[1, 2, 3, 4, 5].slice(0, Math.min(5, currentStock)).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons: Add to Cart & Buy Now */}
              <div className="space-y-2 pt-0.5">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="w-full py-2.5 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] active:scale-95 text-[#0F1111] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 border border-[#FCD200] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  className="w-full py-2.5 rounded-full bg-[#FFA41C] hover:bg-[#FA8900] active:scale-95 text-[#0F1111] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 border border-[#FF8F00] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="h-4 w-4" />
                  <span>Buy Now</span>
                </button>
              </div>

              {/* Merchant & Trust Details */}
              <div className="text-[11px] space-y-1 text-[#565959] pt-2 border-t border-[#EAEDED]">
                <div className="flex items-center justify-between">
                  <span>Ships from</span>
                  <span className="font-semibold text-[#0F1111] truncate max-w-[150px]">
                    {selectedOffer?.shipsFrom || 'Vyntra Prime Logistics'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sold by</span>
                  <span className="font-semibold text-[#007185] truncate max-w-[150px]">
                    {selectedOffer?.vendor?.storeName || product.vendorName}
                  </span>
                </div>
                {selectedOffer?.vendor && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Seller Rating</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      ★ {selectedOffer.vendor.rating.toFixed(1)} / 5.0
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Payment</span>
                  <span className="font-semibold text-[#0F1111]">Secure COD &amp; Online</span>
                </div>
              </div>

              {/* Security & Return Policy Badges */}
              <div className="pt-2 border-t border-[#EAEDED] flex items-center justify-between text-[11px] text-[#565959]">
                <div className="flex items-center gap-1.5 text-[#067D62]">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-semibold">Secure</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#565959]">
                  <RotateCcw className="h-3.5 w-3.5 text-[#007185] shrink-0" />
                  <span>7-Day Returns</span>
                </div>
              </div>

              {/* Wishlist Link in Buy Box */}
              <button
                type="button"
                onClick={toggleWishlist}
                className="w-full py-1.5 rounded-lg border border-[#D5D9D9] hover:bg-[#F7F8F8] text-xs font-bold text-[#0F1111] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Heart
                  className={`h-3.5 w-3.5 ${isWishlisted ? 'text-[#CC0C39] fill-[#CC0C39]' : 'text-[#565959]'}`}
                />
                <span>{isWishlisted ? 'In Your Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {/* ================================================================= */}
            {/* OTHER SELLERS ON VYNTRA (AMAZON-STYLE CARD - Image 3)            */}
            {/* ================================================================= */}
            {existingSellersOffers.length > 0 && (
              <div className="rounded-2xl border border-[#D5D9D9] bg-white p-3.5 shadow-sm space-y-2">
                <span className="text-xs font-bold text-[#0F1111] block">
                  Other sellers on Vyntra
                </span>
                <button
                  type="button"
                  onClick={() => setSellersDrawerOpen(true)}
                  className="w-full text-left p-3 rounded-xl bg-[#F7F8F8] hover:bg-[#EAEDED] border border-[#D5D9D9] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F1111]">
                      <span>New ({existingSellersOffers.length})</span>
                      <span>from</span>
                      <span className="text-[#B12704] font-extrabold text-sm font-sans">
                        ₹{Math.min(...existingSellersOffers.map((o) => o.sellingPrice)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#007185] font-medium flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      <span>{existingSellersOffers.length === 1 ? '1 other seller offer available' : `${existingSellersOffers.length} other seller offers available`}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#565959] group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* SLIDE-OVER DRAWER: OTHER SELLERS (AMAZON-STYLE - Image 4)        */}
      {/* ================================================================= */}
      {sellersDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSellersDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#D5D9D9] flex items-center justify-between bg-[#F7F8F8]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-14 rounded-lg overflow-hidden bg-white border border-[#D5D9D9] shrink-0 relative">
                  <img
                    src={activeImage?.src || product.images[0]?.src}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#0F1111] line-clamp-1">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-[#565959] mt-0.5">
                    <span className="font-semibold text-amber-700">★ {product.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>{product.reviewCount} verified ratings</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSellersDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#EAEDED] text-[#565959] transition-colors shrink-0 cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Subheader */}
            <div className="px-4 py-2.5 bg-white border-b border-[#EAEDED] flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F1111]">
                {allAvailableOffers.length} seller options available
              </span>
              <span className="text-[11px] text-[#565959] font-medium">
                Creator First &bull; Then Best Value
              </span>
            </div>

            {/* Drawer Body: Offers List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar divide-y divide-[#EAEDED]">
              {drawerOffers.map((offer, idx) => {
                const isCreator = offer.id === originalCreatorOffer?.id;
                const isWinner = product.buyBox?.winner?.id === offer.id;
                const isSelected = selectedOffer?.id === offer.id;
                const isOfferOutOfStock = offer.stock <= 0;

                return (
                  <div key={offer.id} className={`${idx > 0 ? 'pt-4' : ''} space-y-2`}>
                    {/* Badge Category Header */}
                    {isCreator && (
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#800020] bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
                        <Award className="h-3.5 w-3.5 text-[#FF9900]" />
                        <span>
                          {isMobileOrElectronic
                            ? 'Verified Marketplace Seller'
                            : 'Original Creator / Atelier Master'}
                        </span>
                      </div>
                    )}
                    {!isCreator && idx === (originalCreatorOffer ? 1 : 0) && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#007185] bg-[#007185]/5 border border-[#007185]/20 px-2.5 py-1 rounded-md mt-3">
                        <Store className="h-3.5 w-3.5" />
                        <span>Other Verified Sellers (Sell Existing Product)</span>
                      </div>
                    )}

                    <div
                      className={`rounded-xl p-3.5 border transition-all space-y-3 shadow-xs ${
                        isSelected
                          ? 'border-[#007185] bg-[#007185]/5 ring-1 ring-[#007185]/20'
                          : 'border-[#D5D9D9] bg-white hover:border-[#565959]'
                      }`}
                    >
                      {/* Price & Add to Cart Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-[#0F1111]">₹</span>
                            <span className="text-2xl font-extrabold text-[#0F1111] font-sans">
                              {offer.sellingPrice.toLocaleString('en-IN')}
                            </span>
                            {offer.originalPrice > offer.sellingPrice && (
                              <span className="text-xs text-[#565959] line-through font-sans">
                                ₹{offer.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#067D62] font-semibold block mt-0.5">
                            FREE Delivery by {new Date(Date.now() + (offer.estimatedDeliveryDays || 2) * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        {/* Add to Cart button for this specific seller */}
                        <button
                          type="button"
                          disabled={isOfferOutOfStock}
                          onClick={() => {
                            handleAddToCartOffer(offer);
                            setSellersDrawerOpen(false);
                            openCart();
                          }}
                          className="px-4 py-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] active:scale-95 text-[#0F1111] font-bold text-xs shadow-sm transition-all border border-[#FCD200] shrink-0 disabled:opacity-40 cursor-pointer"
                        >
                          Add to Cart
                        </button>
                      </div>

                      {/* Seller Info & Feedback */}
                      <div className="pt-2 border-t border-[#EAEDED] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[#565959]">
                          <span>Ships from</span>
                          <span className="font-semibold text-[#0F1111]">{offer.shipsFrom || 'India'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#565959]">
                          <span>Sold by</span>
                          <span className="font-bold text-[#007185] flex items-center gap-1">
                            {offer.vendor.storeName}
                            {isCreator && (
                              <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-extrabold">
                                Creator
                              </span>
                            )}
                            {isWinner && (
                              <span className="text-[10px] text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded font-extrabold border border-rose-200">
                                Best Price
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#565959]">
                          <span>Seller Rating</span>
                          <span className="text-amber-700 font-bold">
                            ★ {offer.vendor.rating.toFixed(1)} / 5.0 (98% positive)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#565959]">
                          <span>Stock</span>
                          <span className={isOfferOutOfStock ? 'text-rose-600 font-bold' : 'text-[#067D62] font-semibold'}>
                            {isOfferOutOfStock ? 'Out of Stock' : `${offer.stock} units available`}
                          </span>
                        </div>
                      </div>

                      {/* Select as active option */}
                      <div className="pt-2 border-t border-[#EAEDED] flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectOffer(offer);
                            setSellersDrawerOpen(false);
                          }}
                          className={`text-xs font-bold underline cursor-pointer ${
                            isSelected ? 'text-[#067D62]' : 'text-[#007185] hover:text-[#0F1111]'
                          }`}
                        >
                          {isSelected ? '✓ Currently Selected on Page' : 'Select as primary display'}
                        </button>
                        <span className="text-[10px] text-[#565959]">
                          Condition: <strong>New</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-WIDTH SCROLLABLE DESCRIPTION & RICH CONTENT (NO POPUPS/MODALS)  */}
      {/* ===================================================================== */}
      <section className="max-w-[1500px] mx-auto px-4 sm:px-6 py-12 space-y-14 border-t border-[#D5D9D9]">
        {/* Amazon A+ Content Display (Rich Editorial Modules - Optional) */}
        {product.aplusContent && product.aplusContent.modules && product.aplusContent.modules.length > 0 ? (
          <APlusContentDisplay
            aplus={product.aplusContent}
            brandName={product.brand}
          />
        ) : !isMobileOrElectronic && product.category === 'ethnic' ? (
          /* Fallback Atelier Narrative for Ethnic products */
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
              <Store className="h-5 w-5 text-[#800020]" />
              <h2 className="text-xl font-headline font-bold text-[#0F1111]">
                From the Manufacturer &amp; Artisan Guild
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#F7F8F8] rounded-2xl p-6 sm:p-10 border border-[#D5D9D9]">
              <div className="space-y-4">
                <span className="bg-[#800020] text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full inline-block">
                  Artisanal Provenance
                </span>
                <h3 className="text-2xl font-headline font-bold text-[#0F1111]">
                  Master Craftsmanship from {product.brand}
                </h3>
                <p className="text-xs sm:text-sm text-[#0F1111] leading-relaxed">
                  {product.subtitle ||
                    product.tabs?.story?.description?.[0] ||
                    'Each piece is crafted in limited batches in accordance with traditional handloom techniques. By directly connecting verified master weavers to patrons, Vyntra eliminates intermediaries and guarantees authenticity.'}
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white p-3.5 rounded-xl border border-[#D5D9D9]">
                    <span className="text-[10px] text-[#565959] uppercase font-bold">Standard</span>
                    <p className="text-sm font-extrabold text-[#0F1111] mt-0.5">100% GI Handloom</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-[#D5D9D9]">
                    <span className="text-[10px] text-[#565959] uppercase font-bold">Guild</span>
                    <p className="text-sm font-extrabold text-[#007185] mt-0.5 truncate">{product.vendorName}</p>
                  </div>
                </div>
              </div>

              {/* Atelier Imagery */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white border border-[#D5D9D9] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[1]?.src || activeImage.src}
                  alt="Artisan Craftsmanship"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* 2. Technical Product Specifications Matrix */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#D5D9D9]">
            <div className="flex items-center gap-2">
              {isMobileOrElectronic ? (
                <Smartphone className="h-5 w-5 text-[#007185]" />
              ) : (
                <Package className="h-5 w-5 text-[#007185]" />
              )}
              <h2 className="text-xl font-headline font-bold text-[#0F1111]">
                {isMobileOrElectronic
                  ? 'Technical Specifications & Hardware Matrix'
                  : 'Product Specifications'}
              </h2>
            </div>
            {isMobileOrElectronic && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-[#007185]/10 text-[#007185] border border-[#007185]/20 flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <span>5G Enabled</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Verified Device</span>
                </span>
              </div>
            )}
          </div>

          {/* Highlight Specs Cards */}
          {isLaptopOrComputer ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Cpu className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Processor</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('processor') || s.label.toLowerCase().includes('cpu'))?.value ||
                    'High-Performance Multi-Core Processor'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Laptop className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Display</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('display') || s.label.toLowerCase().includes('screen'))?.value ||
                    'High Resolution IPS Display'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <HardDrive className="h-3.5 w-3.5 text-[#007185]" />
                  <span>RAM / Memory</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'ram' || s.label.toLowerCase().includes('memory'))?.value ||
                    '16 GB High-Speed Memory'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Battery className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Battery</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'battery' || s.label.toLowerCase().includes('battery'))?.value ||
                    'All-Day High Capacity Battery'}
                </p>
              </div>
            </div>
          ) : isMobilePhone ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Cpu className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Processor</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'processor')?.value ||
                    'Octa-Core Flagship Architecture'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Smartphone className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Display</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'display')?.value ||
                    'High Refresh Rate OLED'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Camera className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Camera</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'primary camera')?.value ||
                    'High Resolution Multi-Sensor'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Battery className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Battery</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'battery')?.value ||
                    'All-Day High Capacity Battery'}
                </p>
              </div>
            </div>
          ) : isAudioOrHeadphones ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Headphones className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Audio & Driver</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('audio') || s.label.toLowerCase().includes('driver'))?.value ||
                    'Hi-Res Studio Sound'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Battery className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Battery / Playtime</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('battery') || s.label.toLowerCase().includes('playtime'))?.value ||
                    'All-Day Playtime'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Noise Cancellation</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('noise') || s.label.toLowerCase().includes('anc'))?.value ||
                    'Active Noise Cancellation'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Wifi className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Connectivity</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('connect') || s.label.toLowerCase().includes('bluetooth'))?.value ||
                    'Bluetooth 5.3 Wireless'}
                </p>
              </div>
            </div>
          ) : isCamera ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Camera className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Photo Sensor</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('sensor'))?.value ||
                    'High-Resolution CMOS'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Stabilisation</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('stabilis') || s.label.toLowerCase().includes('stabiliz'))?.value ||
                    'Sensor-Shift IS'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Zap className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Lens Mounting</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('mount'))?.value ||
                    'Interchangeable Mount'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Wifi className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Connectivity</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('connect') || s.label.toLowerCase().includes('wireless'))?.value ||
                    'Wi-Fi & Bluetooth'}
                </p>
              </div>
            </div>
          ) : isSmartwatch ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Watch className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Display</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('display'))?.value ||
                    'Always-On Retina Display'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Battery className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Battery</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('battery'))?.value ||
                    'Multi-Day Battery Life'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Sensors & Health</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('sensor') || s.label.toLowerCase().includes('health'))?.value ||
                    'Heart Rate & SpO2 Tracking'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Water Resistance</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('water') || s.label.toLowerCase().includes('ip'))?.value ||
                    '50m Water Resistant'}
                </p>
              </div>
            </div>
          ) : isBook ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <FileText className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Print Length</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('page') || s.label.toLowerCase().includes('length'))?.value ||
                    '320 pages'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Globe className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Language</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('language'))?.value ||
                    'English'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <BookOpen className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Format & Binding</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('binding') || s.label.toLowerCase().includes('format'))?.value ||
                    selectedSize ||
                    'Paperback'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Award className="h-3.5 w-3.5 text-[#007600]" />
                  <span>Publisher</span>
                </div>
                <p className="text-xs font-extrabold text-[#007600] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('publisher'))?.value ||
                    'Authorized Publishing House'}
                </p>
              </div>
            </div>
          ) : isAppliance ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Star className="h-3.5 w-3.5 text-[#FF9900]" />
                  <span>Energy Star Rating</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('energy') || s.label.toLowerCase().includes('star'))?.value ||
                    '5 Star / 3 Star BEE Efficiency'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Layers className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Capacity / Size</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => {
                    const l = s.label.toLowerCase();
                    return l.includes('capacity') || l.includes('tank') || l.includes('wattage') || l.includes('suction');
                  })?.value ||
                    (typeof product.sizes?.[0] === 'object' ? product.sizes[0]?.size : product.sizes?.[0]) ||
                    'Standard Capacity'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Zap className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Inverter Technology</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('compressor') || s.label.toLowerCase().includes('motor'))?.value ||
                    'Digital Inverter with 10-Yr Warranty'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#007600]" />
                  <span>Installation & Demo</span>
                </div>
                <p className="text-xs font-extrabold text-[#007600] line-clamp-2">
                  Free Scheduled Certified Installation
                </p>
              </div>
            </div>
          ) : isMobileOrElectronic ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl">
              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Cpu className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Processor</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('processor'))?.value ||
                    'High Performance Chipset'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Monitor className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Display</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('display'))?.value ||
                    'High Resolution Screen'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Wifi className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Connectivity</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase().includes('connect'))?.value ||
                    'Wireless Enabled'}
                </p>
              </div>

              <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#565959] text-[11px] font-bold">
                  <Battery className="h-3.5 w-3.5 text-[#007185]" />
                  <span>Battery</span>
                </div>
                <p className="text-xs font-extrabold text-[#0F1111] line-clamp-2">
                  {product.customSpecs?.find((s) => s.label.toLowerCase() === 'battery')?.value ||
                    'All-Day High Capacity Battery'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="border border-[#D5D9D9] rounded-xl overflow-hidden max-w-5xl shadow-sm bg-white">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-[#D5D9D9]">
                {(() => {
                  const baseSpecs: Array<{ label: string; value: string; isBold?: boolean }> = isMobilePhone
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        { label: 'Network Service Provider', value: 'Unlocked for All Carriers (Jio, Airtel, Vi, BSNL)' },
                        {
                          label: 'Operating System',
                          value:
                            product.customSpecs?.find(
                              (s) =>
                                s.label.toLowerCase().includes('operating') ||
                                s.label.toLowerCase() === 'os'
                            )?.value || 'Android / iOS',
                          isBold: true,
                        },
                        { label: 'Cellular Technology', value: '5G, 4G LTE, VoLTE, VoWiFi' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isLaptopOrComputer
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        {
                          label: 'Operating System',
                          value:
                            product.customSpecs?.find(
                              (s) =>
                                s.label.toLowerCase().includes('operating') ||
                                s.label.toLowerCase() === 'os'
                            )?.value ||
                            (product.title.toLowerCase().includes('macbook')
                              ? 'macOS'
                              : product.title.toLowerCase().includes('win')
                              ? 'Windows 11 Home'
                              : 'Windows 11'),
                          isBold: true,
                        },
                        {
                          label: 'Graphics Description',
                          value:
                            product.customSpecs?.find(
                              (s) =>
                                s.label.toLowerCase().includes('graphic') ||
                                s.label.toLowerCase().includes('gpu')
                            )?.value || 'Integrated',
                        },
                        { label: 'Connectivity', value: 'Wi-Fi 6E / Wi-Fi 6, Bluetooth 5.3' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isCamera
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        {
                          label: 'Compatible Mountings',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('mount'))?.value ||
                            'Sony E / Interchangeable',
                          isBold: true,
                        },
                        {
                          label: 'Photo Sensor Technology',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('sensor'))?.value ||
                            'APS-C Exmor R CMOS',
                        },
                        {
                          label: 'Image Stabilisation',
                          value:
                            product.customSpecs?.find(
                              (s) =>
                                s.label.toLowerCase().includes('stabilis') || s.label.toLowerCase().includes('stabiliz')
                            )?.value || '5-Axis Sensor-shift',
                        },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isBook
                    ? [
                        { label: 'Author', value: product.brand, isBold: true },
                        { label: 'Book Title', value: product.title },
                        {
                          label: 'Publisher',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('publisher'))?.value ||
                            'Authorized Publishing House',
                          isBold: true,
                        },
                        {
                          label: 'Language',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('language'))?.value ||
                            'English',
                        },
                        {
                          label: 'Print Length',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('page') || s.label.toLowerCase().includes('length'))?.value ||
                            '320 pages',
                        },
                        {
                          label: 'Binding / Format',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('binding') || s.label.toLowerCase().includes('format'))?.value ||
                            selectedSize ||
                            'Paperback',
                          isBold: true,
                        },
                        {
                          label: 'ISBN-10',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('isbn-10') || s.label.toLowerCase().includes('isbn 10'))?.value ||
                            '935302484X',
                        },
                        {
                          label: 'ISBN-13',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('isbn-13') || s.label.toLowerCase().includes('isbn 13'))?.value ||
                            '978-9353024840',
                        },
                        {
                          label: 'Reading Age',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('reading age') || s.label.toLowerCase().includes('age'))?.value ||
                            '13 years and up',
                        },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Protected Book-Pack Dispatched' },
                      ]
                    : isAppliance
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        {
                          label: 'Energy Star Rating',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('energy') || s.label.toLowerCase().includes('star'))?.value ||
                            '5 Star / 3 Star BEE Certified',
                          isBold: true,
                        },
                        {
                          label: 'Capacity / Size',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('capacity'))?.value ||
                            (typeof product.sizes?.[0] === 'object' ? product.sizes[0]?.size : product.sizes?.[0]) ||
                            'Standard Capacity',
                          isBold: true,
                        },
                        {
                          label: 'Compressor / Motor Type',
                          value:
                            product.customSpecs?.find((s) => s.label.toLowerCase().includes('compressor') || s.label.toLowerCase().includes('motor'))?.value ||
                            'Digital Smart Inverter Technology',
                        },
                        {
                          label: 'Installation & Demo',
                          value: 'Free Scheduled Doorstep Installation by Certified Technician',
                          isBold: true,
                        },
                        { label: 'Warranty Summary', value: '10 Years on Motor/Compressor + 1 Year Comprehensive' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isAudioOrHeadphones
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        { label: 'Connectivity Technology', value: 'Wireless Bluetooth' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isSmartwatch
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        { label: 'Compatible Devices', value: 'Smartphone (iOS & Android)' },
                        { label: 'Connectivity Technology', value: 'Bluetooth, Wi-Fi' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : isMobileOrElectronic
                    ? [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Model Name', value: product.title },
                        { label: 'Connectivity Technology', value: 'Bluetooth & Wi-Fi' },
                        { label: 'Fulfillment & Dispatch', value: 'Vyntra Express Inspected Stock' },
                      ]
                    : [
                        { label: 'Brand', value: product.brand, isBold: true },
                        { label: 'Merchant Guild', value: product.vendorName },
                        {
                          label: 'Fulfillment Model',
                          value: product.isCustomized ? 'Customized / Made to Order' : 'Ready to Ship (Pre-stocked)',
                          isBold: true,
                        },
                        { label: 'Category', value: product.category },
                      ];

                  // Add vendor-provided technical specs or fallback defaults
                  const additionalSpecs: Array<{ label: string; value: string; isBold?: boolean }> =
                    product.customSpecs && product.customSpecs.length > 0
                      ? product.customSpecs.map((s) => ({ label: s.label, value: s.value }))
                      : isMobilePhone
                      ? [
                          { label: 'Network', value: '5G Dual SIM' },
                          { label: 'Warranty', value: '1 Year Brand Manufacturer Warranty' },
                          { label: 'In-The-Box', value: 'Handset, Type-C Cable, SIM Ejector, Documentation' },
                        ]
                      : isLaptopOrComputer
                      ? [
                          { label: 'Warranty', value: '1 Year Brand Manufacturer Warranty' },
                          { label: 'In-The-Box', value: 'Laptop, Power Adapter, User Manual' },
                        ]
                      : isCamera
                      ? [
                          { label: 'Aspect Ratio', value: '1:1, 3:2, 4:3, 16:9' },
                          { label: 'Supported File Format', value: 'HEIF, JPEG, RAW' },
                          { label: 'Expanded ISO Minimum', value: '50' },
                          { label: 'Optical Zoom', value: 'Lens Dependent (e.g. 1x - 7.5x)' },
                          { label: 'Warranty', value: '2 Years Brand Manufacturer Warranty' },
                          { label: 'In-The-Box', value: 'Camera Body, Rechargeable Battery NP-FZ100, Shoulder Strap, Body Cap, Eyepiece Cup, User Manual' },
                        ]
                      : isBook
                      ? [
                          { label: 'Item Weight', value: '280 g' },
                          { label: 'Dimensions', value: '13.5 x 2.2 x 20.3 cm' },
                          { label: 'Country of Origin', value: 'India' },
                          { label: 'Edition', value: 'Standard Unabridged Edition' },
                          { label: 'Generic Name', value: 'Book / Literature' },
                        ]
                      : isAppliance
                      ? [
                          { label: 'Warranty Summary', value: '10 Years on Motor/Compressor + 1 Year Comprehensive Machine Warranty' },
                          { label: 'Installation', value: 'Free Scheduled Installation & Demonstration by Brand Certified Technician' },
                          { label: 'Exchange Eligibility', value: 'Eligible for Old Appliance Exchange up to ₹5,000' },
                          { label: 'In-The-Box', value: 'Main Unit, User Manual, Warranty Card, Standard Inlet/Drain Pipe & Installation Kit' },
                        ]
                      : isAudioOrHeadphones
                      ? [
                          { label: 'Ear Placement', value: 'Over Ear' },
                          { label: 'Form Factor', value: 'Over Ear' },
                          { label: 'Impedance', value: '32 Ohms' },
                          { label: 'Noise Cancellation', value: 'Adaptive Noise Cancelling with Smart Ambient' },
                          { label: 'Battery Life', value: 'Up to 76 hours of battery life' },
                          { label: 'Warranty', value: '1 Year Brand Manufacturer Warranty' },
                          { label: 'In-The-Box', value: 'Headphone, Type-C Cable, Audio Cable, Quick Start Guide' },
                        ]
                      : isMobileOrElectronic
                      ? [
                          { label: 'Warranty', value: '1 Year Brand Manufacturer Warranty' },
                          { label: 'In-The-Box', value: 'Device, Power Cable, User Manual' },
                        ]
                      : [
                          { label: 'Material & Weave', value: '100% Certified Organic Natural Fiber' },
                          { label: 'Country of Origin', value: 'India' },
                          { label: 'Care & Wash', value: 'Dry Clean Recommended for Longevity' },
                        ];

                  // Deduplicate in case vendor specified "Brand" or "Category"
                  const allRows = [
                    ...baseSpecs.filter(
                      (b) => !additionalSpecs.some((a) => a.label.toLowerCase() === b.label.toLowerCase())
                    ),
                    ...additionalSpecs,
                  ];

                  return allRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-[#F7F8F8]' : 'bg-white'}>
                      <th className="py-3 px-4 font-bold text-[#565959] w-1/3 sm:w-1/4">
                        {row.label}
                      </th>
                      <td className={`py-3 px-4 text-[#0F1111] ${row.isBold ? 'font-semibold' : ''}`}>
                        {row.value}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Size Chart & Measurements Guide (Fashion & Footwear only) */}
        {isFashionCategory && (isFootwear || !isUnstitchedOrFreeSize) && (
          <div id="size-chart" className="space-y-4 pt-4 border-t border-[#D5D9D9]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#D5D9D9]">
              <Ruler className="h-5 w-5 text-[#007185]" />
              <h2 className="text-xl font-headline font-bold text-[#0F1111]">
                {isFootwear
                  ? `Shoe Size Guide & Fit Conversion (${isWomenFootwear ? "Women's" : "Men's"} India / UK / EU)`
                  : 'Size Guide & Detailed Measurements'}
              </h2>
            </div>

          {isFootwear ? (
            <div className="space-y-3">
              <div className="border border-[#D5D9D9] rounded-xl overflow-x-auto max-w-3xl shadow-sm bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Brand Size</th>
                      <th className="py-3 px-4 font-bold text-[#007185]">UK / India</th>
                      <th className="py-3 px-4 font-bold">EU</th>
                      <th className="py-3 px-4 font-bold">USA</th>
                      <th className="py-3 px-4 font-bold">Heel to Toe (in)</th>
                      <th className="py-3 px-4 font-bold">Foot Length (cm)</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D9D9]">
                    {(isWomenFootwear
                      ? [
                          { brand: '3', uk: '3 UK', eu: '35.5', us: '4.5', in: '8.7 in', cm: '22.1 cm' },
                          { brand: '4', uk: '4 UK', eu: '36.7', us: '5.5', in: '9.0 in', cm: '22.9 cm' },
                          { brand: '5', uk: '5 UK', eu: '38.0', us: '6.5', in: '9.3 in', cm: '23.7 cm' },
                          { brand: '6', uk: '6 UK', eu: '39.3', us: '7.5', in: '9.7 in', cm: '24.6 cm' },
                          { brand: '7', uk: '7 UK', eu: '40.7', us: '8.5', in: '10.0 in', cm: '25.4 cm' },
                          { brand: '8', uk: '8 UK', eu: '42.0', us: '9.5', in: '10.3 in', cm: '26.2 cm' },
                        ]
                      : [
                          { brand: '6', uk: '6 UK', eu: '40.0', us: '7.0', in: '9.8 in', cm: '25.0 cm' },
                          { brand: '7', uk: '7 UK', eu: '41.0', us: '8.0', in: '10.2 in', cm: '26.0 cm' },
                          { brand: '8', uk: '8 UK', eu: '42.0', us: '9.0', in: '10.6 in', cm: '27.0 cm' },
                          { brand: '9', uk: '9 UK', eu: '43.0', us: '10.0', in: '11.0 in', cm: '28.0 cm' },
                          { brand: '10', uk: '10 UK', eu: '44.5', us: '11.0', in: '11.4 in', cm: '29.0 cm' },
                          { brand: '11', uk: '11 UK', eu: '46.0', us: '12.0', in: '11.8 in', cm: '30.0 cm' },
                          { brand: '12', uk: '12 UK', eu: '47.0', us: '13.0', in: '12.2 in', cm: '31.0 cm' },
                        ]
                    ).map((row, idx) => {
                      const matchedSize = (product.sizes || []).find(
                        (s) =>
                          s.size?.toLowerCase() === row.uk.toLowerCase() ||
                          s.size === row.brand ||
                          s.size?.startsWith(row.brand)
                      );
                      const isSelected =
                        selectedSize?.toLowerCase() === row.uk.toLowerCase() ||
                        selectedSize === row.brand ||
                        selectedSize?.startsWith(row.brand);
                      const isOffered = Boolean(matchedSize);
                      const isOutOfStock = matchedSize?.disabled;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-[#007185]/10 font-bold border-l-4 border-l-[#007185]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-[#0F1111]">{row.brand}</td>
                          <td className="py-3 px-4 font-extrabold text-[#007185]">{row.uk}</td>
                          <td className="py-3 px-4 text-[#565959]">{row.eu}</td>
                          <td className="py-3 px-4 text-[#565959]">{row.us}</td>
                          <td className="py-3 px-4 text-[#565959]">{row.in}</td>
                          <td className="py-3 px-4 text-[#565959]">{row.cm}</td>
                          <td className="py-3 px-4">
                            {isOffered && !isOutOfStock ? (
                              <span className="text-[#067D62] font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> In Stock
                              </span>
                            ) : isOffered && isOutOfStock ? (
                              <span className="text-rose-600 font-semibold">Out of Stock</span>
                            ) : (
                              <span className="text-stone-400 font-normal">Not Offered</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* How to measure foot length tip */}
              <div className="p-3 bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl text-xs text-[#565959] flex items-start gap-2 max-w-3xl">
                <Info className="w-4 h-4 text-[#007185] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#0F1111] font-semibold">Footwear Sizing Tip:</strong>{' '}
                  Stand on a blank sheet of paper wearing your usual socks. Mark the tip of your longest toe and the back edge of your heel. Measure the distance in inches or centimeters to select your ideal UK/India shoe size.
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-[#D5D9D9] rounded-xl overflow-x-auto max-w-3xl shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8F8] border-b border-[#D5D9D9] text-[#565959] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Standard Size</th>
                    <th className="py-3 px-4 font-bold">Chest (Inches)</th>
                    <th className="py-3 px-4 font-bold">Waist (Inches)</th>
                    <th className="py-3 px-4 font-bold">Length (Inches)</th>
                    <th className="py-3 px-4 font-bold">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5D9D9]">
                  {[
                    { size: 'S', chest: '38 in', waist: '32 in', length: '40 in', stock: 'In Stock' },
                    { size: 'M', chest: '40 in', waist: '34 in', length: '41 in', stock: 'In Stock' },
                    { size: 'L', chest: '42 in', waist: '36 in', length: '42 in', stock: 'In Stock' },
                    { size: 'XL', chest: '44 in', waist: '38 in', length: '43 in', stock: 'Limited' },
                    { size: 'Free Size', chest: '40-44 in', waist: 'Adjustable', length: 'Standard', stock: 'In Stock' },
                  ].map((row, idx) => (
                    <tr key={idx} className={selectedSize === row.size ? 'bg-[#007185]/5 font-bold' : ''}>
                      <td className="py-3 px-4 text-[#0F1111]">{row.size}</td>
                      <td className="py-3 px-4 text-[#565959]">{row.chest}</td>
                      <td className="py-3 px-4 text-[#565959]">{row.waist}</td>
                      <td className="py-3 px-4 text-[#565959]">{row.length}</td>
                      <td className="py-3 px-4 text-[#067D62] font-semibold">{row.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* 4. Customer Reviews & Ratings */}
        <ProductReviewsSection product={product} />

        {/* 5. Related Products Carousel / Grid */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#D5D9D9]">
            <h2 className="text-xl font-headline font-bold text-[#0F1111]">
              {isLaptopOrComputer
                ? 'Similar Laptops & Computing Gear'
                : isAudioOrHeadphones
                ? 'Similar Headphones & Audio Gear'
                : isAppliance
                ? 'Similar Home Appliances'
                : isBook
                ? 'Recommended Books & Literature'
                : isMobileOrElectronic
                ? 'Similar Smartphones & Recommendations'
                : 'Related Artisanal Recommendations'}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {product.relatedProducts.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug}`}
                  className="group bg-white rounded-xl border border-[#D5D9D9] hover:border-[#007185] p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#F7F8F8] mb-2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#565959] uppercase">{item.brand}</span>
                    <h4 className="text-xs font-bold text-[#0F1111] line-clamp-2 group-hover:text-[#007185] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs font-extrabold text-[#0F1111] mt-1">
                      {formatINR(item.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* MOBILE / STICKY BOTTOM QUICK ACTION BAR                               */}
      {/* ===================================================================== */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D5D9D9] shadow-2xl py-2.5 px-4 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-12 rounded overflow-hidden bg-[#F7F8F8] border border-[#D5D9D9] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeImage.src} alt="Thumb" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#0F1111] truncate">{product.title}</h4>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono font-extrabold text-[#0F1111]">
                    {formatINR(currentPrice)}
                  </span>
                  <span className="text-[10px] text-[#067D62] font-semibold">
                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="px-4 py-2 rounded-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] text-xs font-bold shadow-sm transition-all border border-[#FCD200]"
              >
                Add to Cart
              </button>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="px-4 py-2 rounded-full bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] text-xs font-bold shadow-sm transition-all border border-[#FF8F00] hidden sm:block"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
