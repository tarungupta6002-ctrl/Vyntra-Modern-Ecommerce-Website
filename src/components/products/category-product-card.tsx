'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, Check, ShoppingCart } from 'lucide-react';
import { CategoryProductItem } from '@/hooks/use-category-products';

interface CategoryProductCardProps {
  product: CategoryProductItem;
  isSaved: boolean;
  isAdded?: boolean;
  onToggleWishlist: (product: CategoryProductItem) => void;
  onAddToCart: (product: CategoryProductItem) => void;
  imageAspectRatio?: 'portrait' | 'square';
  fulfillmentBadge?: string;
  titleClamp?: '2' | '3' | '4';
}

export function CategoryProductCard({
  product,
  isSaved,
  isAdded,
  onToggleWishlist,
  onAddToCart,
  imageAspectRatio = 'portrait',
  fulfillmentBadge,
  titleClamp = '3',
}: CategoryProductCardProps) {
  const isSquare = imageAspectRatio === 'square';
  const clampClass =
    titleClamp === '4'
      ? 'line-clamp-4'
      : titleClamp === '2'
      ? 'line-clamp-2'
      : 'line-clamp-3';

  const formattedPrice =
    typeof product.price === 'number'
      ? product.price.toLocaleString('en-IN')
      : String(product.price);
  const formattedOriginalPrice =
    typeof product.originalPrice === 'number'
      ? product.originalPrice.toLocaleString('en-IN')
      : String(product.originalPrice);

  return (
    <div className="group bg-white rounded-xl border border-[#E7E7E7] hover:border-[#FF9900] hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden p-3.5 sm:p-4 relative">
      {/* Wishlist Heart Icon */}
      <button
        type="button"
        onClick={() => onToggleWishlist(product)}
        className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full bg-white/90 shadow-xs hover:bg-white hover:scale-110 active:scale-95 transition-all"
        title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
        aria-label={isSaved ? `Remove ${product.title} from Wishlist` : `Add ${product.title} to Wishlist`}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400 hover:text-[#E01A22]'
          }`}
        />
      </button>

      <div>
        {/* Product Image */}
        <Link href={`/products/${product.slug}`} className="block">
          <div
            className={`relative w-full rounded-lg overflow-hidden mb-3 transition-colors ${
              isSquare
                ? 'aspect-square bg-white border border-stone-100 p-3 flex items-center justify-center'
                : 'aspect-[3/4] bg-[#F7F7F7]'
            }`}
          >
            <Image
              src={product.image}
              alt={product.title}
              fill
              unoptimized
              className={`transition-transform duration-300 group-hover:scale-104 ${
                isSquare ? 'object-contain p-2' : 'object-cover object-top'
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Best Seller / Choice Ribbon */}
            {product.isBestSeller && (product.reviews || 0) > 0 && (
              <span className="absolute top-2 left-2 bg-[#E67A00] text-white text-[10px] font-black px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                Best Seller
              </span>
            )}
            {product.badge === 'New Launch' && (
              <span className="absolute top-2 left-2 bg-[#007185] text-white text-[10px] font-black px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                New Launch
              </span>
            )}
            {product.isAmazonChoice && (
              <span className="absolute top-2 left-2 bg-[#232F3E] text-white text-[10px] font-black px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                Vyntra&apos;s Choice
              </span>
            )}
          </div>
        </Link>

        {/* Brand & Title */}
        <span className="text-[11px] sm:text-[12px] font-bold text-[#565959] uppercase block mb-1 tracking-wide">
          {product.brand}
        </span>
        <Link
          href={`/products/${product.slug}`}
          className={`text-[13px] sm:text-[14px] font-medium text-[#0F1111] hover:text-[#007185] hover:underline ${clampClass} leading-relaxed block mb-2 transition-colors`}
          title={product.title}
        >
          {product.title}
        </Link>

        {/* Rating Stars & Count */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {(product.reviews || 0) > 0 ? (
            <>
              <div className="flex items-center text-[#FFA41C]">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.floor(product.rating)
                        ? 'fill-[#FFA41C] text-[#FFA41C]'
                        : 'text-stone-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[12px] text-[#007185] hover:underline cursor-pointer font-medium">
                {product.reviews.toLocaleString('en-IN')}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-[#565959]">No reviews yet</span>
          )}
        </div>

        {/* Limited Time Deal Badge */}
        {product.isLimitedDeal && (
          <span className="inline-block bg-[#CC0C39] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs mb-1.5">
            Limited time deal
          </span>
        )}

        {/* Price Section */}
        <div className="flex items-baseline gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[12px] text-[#0F1111] font-semibold">&#8377;</span>
          <span className="text-[21px] sm:text-[23px] font-bold text-[#0F1111] leading-none">
            {formattedPrice}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <>
              <span className="text-[11px] sm:text-[12px] text-[#565959] ml-1">
                M.R.P:{' '}
                <span className="line-through">&#8377;{formattedOriginalPrice}</span>
              </span>
              <span className="text-[12px] text-[#CC0C39] font-bold">
                ({product.discount})
              </span>
            </>
          )}
        </div>

        {/* Fulfillment: only what the product data actually says (no invented delivery dates). */}
        <div className="space-y-0.5 text-[11px] text-[#565959] mb-3">
          {fulfillmentBadge ? (
            <span className="font-extrabold text-[#007185] text-xs tracking-tight flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00A8E8]" />
              {fulfillmentBadge}
            </span>
          ) : product.isPrime ? (
            <span className="font-extrabold text-[#007185] text-xs tracking-tight flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00A8E8]" />
              Vyntra Express
            </span>
          ) : null}
          {product.inStock === false && (
            <span className="block text-[#B12704] font-semibold">Currently out of stock</span>
          )}
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          disabled={product.inStock === false}
          className={`w-full py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-98 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:border-stone-200 disabled:shadow-none disabled:active:scale-100 ${
            isAdded
              ? 'bg-[#007600] text-white'
              : 'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200]'
          }`}
        >
          {product.inStock === false ? (
            <span>Out of stock</span>
          ) : isAdded ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Added to Cart</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
