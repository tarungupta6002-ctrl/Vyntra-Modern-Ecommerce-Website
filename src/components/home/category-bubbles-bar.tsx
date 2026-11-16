'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CategoryBubble {
  id: string;
  name: string;
  image: string;
  href: string;
  categorySlug?: string;
  searchQuery?: string;
}

export const AMAZON_BUBBLES: CategoryBubble[] = [
  {
    id: 'b1-ethnic-women',
    name: 'Ethnic wear',
    image: 'https://m.media-amazon.com/images/G/31/img24/Fashion/AF/4.0/BAU/SubHalo/ClothingApril/Ethnicwear_WA._SS400_QL85_FMpng_.png',
    href: '/category/womens-ethnic-wear',
    categorySlug: 'kurtas-suits',
  },
  {
    id: 'b2-shirts-polos',
    name: 'T-shirts, shirts &\npolos',
    image: 'https://m.media-amazon.com/images/G/31/img22/Meghana/Doss/tshi_400x400._SS400_QL85_.jpg',
    href: '/products?category=mens-shirts-trousers',
    categorySlug: 'mens-shirts-trousers',
  },
  {
    id: 'b3-western-wear',
    name: 'Western wear',
    image: '/images/categories/western-wear.png',
    href: '/products?category=womens-western-fusion',
    categorySlug: 'womens-western-fusion',
  },
  {
    id: 'b4-kids-clothing',
    name: 'Kids clothing',
    image: '/images/categories/kids-clothing.png',
    href: '/products?category=kids',
    categorySlug: 'kids',
  },
  {
    id: 'b5-ethnic-men',
    name: 'Ethnic wear',
    image: 'https://m.media-amazon.com/images/G/31/img22/ma/ssap/1/ma_ethnic_400x400._SS400_QL85_FMpng_.png',
    href: '/products?category=mens-kurtas-sherwanis',
    categorySlug: 'mens-kurtas-sherwanis',
  },
  {
    id: 'b6-mens-jeans',
    name: "Men's jeans",
    image: 'https://m.media-amazon.com/images/G/31/MA2026/denum_MA_400x400._SS400_QL85_.jpg',
    href: '/products?category=mens-shirts-trousers',
    categorySlug: 'mens-shirts-trousers',
  },
  {
    id: 'b7-sunglasses',
    name: 'Sunglasses & frames',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80',
    href: '/products?search=sunglasses',
    searchQuery: 'sunglasses',
  },
];

interface CategoryBubblesBarProps {
  onSelectCategory?: (categorySlug?: string, searchQuery?: string) => void;
}

export function CategoryBubblesBar({ onSelectCategory }: CategoryBubblesBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full max-w-[1500px] mx-auto px-2 sm:px-6 py-4 relative group">
      <div className="bg-white border-y sm:border border-[#E7E7E7] sm:rounded-xl p-3 sm:p-5 relative shadow-2xs">
        {/* Amazon-style Left Scroll Arrow Paddle */}
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Scroll left"
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 w-8 h-12 sm:w-9 sm:h-16 rounded-r bg-white/95 text-[#0F1111] shadow-md border border-l-0 border-[#D5D9D9] flex items-center justify-center hover:bg-white transition-all z-20 cursor-pointer opacity-85 hover:opacity-100"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-[#565959] hover:text-[#0F1111]" />
        </button>

        {/* 7 Circular Bubbles Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-start justify-between gap-4 sm:gap-6 overflow-x-auto scrollbar-none scroll-smooth px-8 sm:px-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {AMAZON_BUBBLES.map((bubble) => (
            <div
              key={bubble.id}
              className="flex-1 min-w-[105px] max-w-[160px] shrink-0 text-center"
            >
              <Link
                href={bubble.href}
                onClick={(e) => {
                  if (onSelectCategory) {
                    e.preventDefault();
                    onSelectCategory(bubble.categorySlug, bubble.searchQuery);
                  }
                }}
                className="group flex flex-col items-center select-none no-underline hover:no-underline focus:no-underline"
              >
                {/* Perfect Round Circle matching Amazon */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-[#E7E7E7] shadow-2xs group-hover:shadow-sm transition-all duration-300 bg-white">
                  <Image
                    src={bubble.image}
                    alt={bubble.name.replace('\n', ' ')}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="112px"
                  />
                </div>

                {/* Bubble Title Centered Below (Amazon Ember font style: 14.3px, #424242, no blue, no underline) */}
                <span className="mt-2 text-[14px] font-normal text-[#424242] group-hover:text-[#424242] leading-[1.2] whitespace-pre-line text-center no-underline hover:no-underline group-hover:no-underline select-none">
                  {bubble.name}
                </span>
              </Link>
            </div>
          ))}
        </div>

        {/* Amazon-style Right Scroll Arrow Paddle */}
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Scroll right"
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 w-8 h-12 sm:w-9 sm:h-16 rounded-l bg-white/95 text-[#0F1111] shadow-md border border-r-0 border-[#D5D9D9] flex items-center justify-center hover:bg-white transition-all z-20 cursor-pointer opacity-85 hover:opacity-100"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-[#565959] hover:text-[#0F1111]" />
        </button>
      </div>
    </section>
  );
}
