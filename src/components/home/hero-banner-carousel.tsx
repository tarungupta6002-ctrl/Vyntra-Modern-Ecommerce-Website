'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface BannerSlide {
  id: string;
  brandBadges: string[];
  title: string;
  discount: string;
  href: string;
  image: string;
  bgColor?: string;
}

export const HERO_SLIDES: BannerSlide[] = [
  {
    id: 'slide-uspolo',
    brandBadges: ['PUMA', 'U.S. POLO ASSN.'],
    title: 'Jackets, sweatshirts...',
    discount: 'Min. 50% Off',
    href: '/products?brand=U.S.+POLO+ASSN.',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80',
    bgColor: '#FAF7F0',
  },
  {
    id: 'slide-dresses',
    brandBadges: ['Latin Quarters', 'FableStreet'],
    title: 'Dresses, tops...',
    discount: 'Min. 50% Off',
    href: '/products?category=western-casual',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=80',
    bgColor: '#F5F5ED',
  },
  {
    id: 'slide-safari',
    brandBadges: ['safari', 'ARISTOCRAT'],
    title: 'Trolley bags...',
    discount: 'Min. 75% Off',
    href: '/products?category=bags',
    image: 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=700&q=80',
    bgColor: '#F9F6F0',
  },
  {
    id: 'slide-puma',
    brandBadges: ['PUMA', 'Reebok'],
    title: 'Sports shoes...',
    discount: 'Min. 65% Off',
    href: '/products?category=footwear',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=80',
    bgColor: '#F4F6F0',
  },
  {
    id: 'slide-heels',
    brandBadges: ['METRO', 'MOCHI'],
    title: 'Heels, sandals...',
    discount: 'Min. 55% Off',
    href: '/products?category=footwear',
    image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80',
    bgColor: '#FAF5EE',
  },
  {
    id: 'slide-jewels',
    brandBadges: ['ATELIER GOLD', 'POLKI'],
    title: 'Demi-fine jewellery...',
    discount: 'Min. 50% Off',
    href: '/products?category=jewelry-accessories',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=700&q=80',
    bgColor: '#F7F3EE',
  },
];

// Tripled list for infinite loop with zero white space
const INFINITE_SLIDES = [...HERO_SLIDES, ...HERO_SLIDES, ...HERO_SLIDES];

export function HeroBannerCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalOriginal = HERO_SLIDES.length;

  // Strict drag-to-scroll state
  const isMouseDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);

  // Initialize scroll position in the middle set on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const setupInitialPosition = () => {
      const card = el.querySelector('.carousel-card-item') as HTMLElement;
      if (card) {
        const cardWidth = card.offsetWidth + 16;
        el.scrollLeft = cardWidth * totalOriginal;
      }
    };

    setupInitialPosition();
    window.addEventListener('resize', setupInitialPosition);
    return () => window.removeEventListener('resize', setupInitialPosition);
  }, [totalOriginal]);

  // Window-level mouseup listener to guarantee drag never gets stuck
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setTimeout(() => {
          isDraggingRef.current = false;
          dragDistanceRef.current = 0;
        }, 50);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Handle infinite loop boundary checks & pagination dots
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const card = el.querySelector('.carousel-card-item') as HTMLElement;
    if (!card) return;

    const cardWidth = card.offsetWidth + 16;
    const singleSetWidth = cardWidth * totalOriginal;

    // Seamless loop: when scrolling past end of middle set, jump back to middle set
    if (el.scrollLeft >= singleSetWidth * 2) {
      el.scrollLeft -= singleSetWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += singleSetWidth;
    }

    // Calculate current active dot
    const current = Math.round(el.scrollLeft / cardWidth) % totalOriginal;
    setActiveIndex(current >= 0 ? current : 0);
  }, [totalOriginal]);

  // Auto-scroll every 3.5 seconds ONLY when user is not hovering and not dragging
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      const el = containerRef.current;
      if (!el || isMouseDownRef.current || isDraggingRef.current) return;

      const card = el.querySelector('.carousel-card-item') as HTMLElement;
      if (!card) return;

      const cardWidth = card.offsetWidth + 16;
      el.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }, 3500);

    return () => clearInterval(timer);
  }, [isHovered]);

  // Mouse Drag handlers - ONLY activates when mouse button is clicked and held down
  const onMouseDown = (e: React.MouseEvent) => {
    // Only respond to main left click (button === 0)
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    isMouseDownRef.current = true;
    isDraggingRef.current = false;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // If mouse button is NOT actively held down, do absolutely nothing!
    if (!isMouseDownRef.current || e.buttons !== 1) {
      isMouseDownRef.current = false;
      isDraggingRef.current = false;
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;

    // Only start dragging after a 4px threshold so accidental clicks don't drag
    if (Math.abs(walk) > 4) {
      isDraggingRef.current = true;
      dragDistanceRef.current = Math.abs(walk);
      el.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const onMouseUp = () => {
    isMouseDownRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
      dragDistanceRef.current = 0;
    }, 50);
  };

  // Touch Swipe handlers for mobile
  const touchStartXRef = useRef(0);
  const touchScrollLeftRef = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    touchStartXRef.current = e.touches[0].pageX - el.offsetLeft;
    touchScrollLeftRef.current = el.scrollLeft;
    setIsHovered(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const x = e.touches[0].pageX - el.offsetLeft;
    const walk = (x - touchStartXRef.current) * 1.2;
    el.scrollLeft = touchScrollLeftRef.current - walk;
  };

  const onTouchEnd = () => {
    setIsHovered(false);
  };

  // Scroll to dot
  const scrollToSlide = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;

    const card = el.querySelector('.carousel-card-item') as HTMLElement;
    if (!card) return;

    const cardWidth = card.offsetWidth + 16;
    el.scrollTo({
      left: (totalOriginal + idx) * cardWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section
      className="w-full max-w-[1500px] mx-auto px-3 sm:px-6 py-3 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isMouseDownRef.current = false;
        isDraggingRef.current = false;
      }}
    >
      {/* Scrollable Container with Drag & Swipe - Scrollbar completely hidden on all browsers */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex overflow-x-auto select-none cursor-grab active:cursor-grabbing pb-1 -mx-2 px-2 no-scrollbar [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {INFINITE_SLIDES.map((slide, index) => (
          <div
            key={`${slide.id}-${index}`}
            className="carousel-card-item w-[85%] sm:w-[48%] lg:w-[38.4%] shrink-0 px-2 select-none"
          >
            <Link
              href={slide.href}
              draggable={false}
              onClick={(e) => {
                // If user dragged more than 5px, don't trigger link navigation
                if (dragDistanceRef.current > 5) {
                  e.preventDefault();
                }
              }}
              className="block relative rounded-2xl overflow-hidden border-[6px] sm:border-[8px] border-[#92402e]/85 shadow-md hover:shadow-xl transition-all duration-300 group/card bg-[#FAF7F0] aspect-[16/9] sm:aspect-[16/9.5]"
              style={{ backgroundColor: slide.bgColor }}
            >
              {/* Card Content Grid */}
              <div className="relative z-10 w-full h-full flex items-center justify-between p-3 sm:p-5">
                {/* Left Column: Brand badge, title, discount */}
                <div className="w-[52%] sm:w-[55%] flex flex-col justify-between h-full pr-1">
                  <div>
                    {/* Brand Badges Pill */}
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded bg-white shadow-xs border border-stone-200 text-[10px] sm:text-xs font-bold text-stone-900 uppercase tracking-tight">
                      {slide.brandBadges.map((badge, idx) => (
                        <React.Fragment key={badge}>
                          <span>{badge}</span>
                          {idx < slide.brandBadges.length - 1 && (
                            <span className="text-stone-300">|</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Main Title */}
                    <h3 className="font-serif text-base sm:text-lg md:text-xl font-bold text-[#3B1D11] leading-tight mt-2 sm:mt-3 line-clamp-2">
                      {slide.title}
                    </h3>

                    {/* Offer Discount */}
                    <p className="text-sm sm:text-base md:text-lg font-headline font-extrabold text-[#92402e] mt-1 sm:mt-1.5">
                      {slide.discount}
                    </p>
                  </div>

                  {/* Explore Collection Link */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#92402e] opacity-90 group-hover/card:underline">
                    <span>Explore Collection &rarr;</span>
                  </div>
                </div>

                {/* Right Column: Clean Model Image */}
                <div className="w-[48%] sm:w-[45%] h-full relative overflow-hidden rounded-xl bg-stone-100 shadow-inner">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    draggable={false}
                    className="object-cover object-top group-hover/card:scale-105 transition-transform duration-500 pointer-events-none select-none"
                    sizes="(max-width: 640px) 240px, 380px"
                  />
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-3">
        {HERO_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => scrollToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              activeIndex === idx
                ? 'w-6 bg-[#92402e]'
                : 'w-1.5 bg-stone-300 hover:bg-stone-400'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
