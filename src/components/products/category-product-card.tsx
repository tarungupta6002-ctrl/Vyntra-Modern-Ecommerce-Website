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
}

export function CategoryProductCard({
  product,
  isSaved,
  isAdded,
  onToggleWishlist,
  onAddToCart,
}: CategoryProductCardProps) {
  return (
    <div className="group bg-white rounded-lg border border-[#E7E7E7] hover:border-[#FF9900] hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden p-3 relative">
      {/* Wishlist Heart Icon */}
      <button
        type="button"
        onClick={() => onToggleWishlist(product)}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/90 shadow-xs hover:bg-white transition-colors"
        title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
        aria-label={isSaved ? `Remove ${product.title} from Wishlist` : `Add ${product.title} to Wishlist`}
      >
        <Heart
          className={`h-4 w-4 ${
            isSaved ? 'fill-[#E01A22] text-[#E01A22]' : 'text-stone-400 hover:text-[#E01A22]'
          }`}
        />
      </button>

      <div>
        {/* Product Image */}
        <Link href={`/products/${product.slug}`}>
          <div className="relative aspect-[3/4] w-full rounded-md bg-[#F7F7F7] overflow-hidden mb-2.5">
            <Image
              src={product.image}
              alt={product.title}
              fill
              unoptimized
              className="object-cover object-top group-hover:scale-104 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Best Seller / Choice Ribbon */}
            {product.isBestSeller && (
              <span className="absolute top-2 left-2 bg-[#E67A00] text-white text-[10px] font-black px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                Best Seller
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
        <span className="text-[12px] font-bold text-[#565959] uppercase block mb-0.5">
          {product.brand}
        </span>
        <Link
          href={`/products/${product.slug}`}
          className="text-[13px] font-normal text-[#0F1111] hover:text-[#007185] hover:underline line-clamp-2 leading-snug block mb-1.5"
          title={product.title}
        >
          {product.title}
        </Link>

        {/* Rating Stars & Count */}
        <div className="flex items-center gap-1.5 mb-1.5">
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
          <span className="text-[12px] text-[#007185] hover:underline cursor-pointer">
            {product.reviews.toLocaleString()}
          </span>
        </div>

        {/* Limited Time Deal Badge */}
        {product.isLimitedDeal && (
          <span className="inline-block bg-[#CC0C39] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs mb-1">
            Limited time deal
          </span>
        )}

        {/* Price Section */}
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-[11px] text-[#0F1111] self-start font-medium">&#8377;</span>
          <span className="text-[20px] font-bold text-[#0F1111] leading-none">
            {product.price}
          </span>
          <span className="text-[11px] text-[#565959] ml-1">
            M.R.P:{' '}
            <span className="line-through">&#8377;{product.originalPrice}</span>
          </span>
          <span className="text-[12px] text-[#CC0C39] font-bold">
            ({product.discount})
          </span>
        </div>

        {/* Prime & Delivery */}
        <div className="space-y-0.5 text-[11px] text-[#565959] pt-1">
          {product.isPrime && (
            <span className="font-black text-[#007185] italic text-xs tracking-tight block">
              &#10003;prime
            </span>
          )}
          <span className="block text-[#0F1111] font-medium">
            FREE Delivery <span className="font-bold">{product.deliveryDate}</span>
          </span>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className={`w-full py-1.5 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-98 ${
            isAdded
              ? 'bg-[#007600] text-white'
              : 'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200]'
          }`}
        >
          {isAdded ? (
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
