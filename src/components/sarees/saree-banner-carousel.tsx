'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface SareeSlide {
  id: string;
  title: string;
  image: string;
  href: string;
}

export const SAREE_HERO_SLIDES: SareeSlide[] = [
  {
    id: 'saree-slide-1',
    title: 'Premiume Sarees Min. 70% Off',
    image: '/images/sarees-carousel/banner-1-premiume-sarees.jpg',
    href: '/category/sarees?discount=70',
  },
  {
    id: 'saree-slide-2',
    title: 'Sarees Widest Collection Under 299',
    image: '/images/sarees-carousel/banner-2-widest-collection.jpg',
    href: '/category/sarees?price=under-299',
  },
  {
    id: 'saree-slide-3',
    title: 'Right out of GRAM #InstaReadyStyles',
    image: '/images/sarees-carousel/banner-3-instareadystyles.jpg',
    href: '/category/sarees?tag=insta-ready',
  },
  {
    id: 'saree-slide-4',
    title: 'sareemall The Latest Festive Selection Min. 70% Off',
    image: '/images/sarees-carousel/banner-4-sareemall-festive.jpg',
    href: '/category/sarees?brand=sareemall',
  },
];

// Tripled list for infinite loop with zero white space
const INFINITE_SLIDES = [
  ...SAREE_HERO_SLIDES,
  ...SAREE_HERO_SLIDES,
  ...SAREE_HERO_SLIDES,
];

export function SareeBannerCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const totalOriginal = SAREE_HERO_SLIDES.length;

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
      const card = el.querySelector('.saree-carousel-card-item') as HTMLElement;
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

    const card = el.querySelector('.saree-carousel-card-item') as HTMLElement;
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

      const card = el.querySelector('.saree-carousel-card-item') as HTMLElement;
      if (!card) return;

      const cardWidth = card.offsetWidth + 16;
      el.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }, 3500);

    return () => clearInterval(timer);
  }, [isHovered]);

  // Mouse Drag handlers - ONLY activates when mouse button is clicked and held down
  const onMouseDown = (e: React.MouseEvent) => {
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
    if (!isMouseDownRef.current || e.buttons !== 1) {
      isMouseDownRef.current = false;
      isDraggingRef.current = false;
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;

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

  const scrollToSlide = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const card = el.querySelector('.saree-carousel-card-item') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 16;
    el.scrollTo({
      left: cardWidth * (totalOriginal + index),
      behavior: 'smooth',
    });
    setActiveIndex(index);
  };

  return (
    <div
      className="relative w-full py-4 select-none overflow-hidden bg-[#FFFFFF]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isMouseDownRef.current = false;
        isDraggingRef.current = false;
      }}
    >
      {/* Scrollable Container with Drag Support & Hidden Scrollbar */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="flex gap-4 overflow-x-auto cursor-grab active:cursor-grabbing px-4 sm:px-6 lg:px-8 no-scrollbar scroll-smooth"
      >
        {INFINITE_SLIDES.map((slide, idx) => (
          <div
            key={`${slide.id}-${idx}`}
            className="saree-carousel-card-item shrink-0 w-[300px] sm:w-[420px] md:w-[480px] lg:w-[540px] xl:w-[580px] aspect-[16/10] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative bg-stone-100"
          >
            <Link
              href={slide.href}
              onClick={(e) => {
                if (dragDistanceRef.current > 8) {
                  e.preventDefault();
                }
              }}
              className="block w-full h-full relative"
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                unoptimized
                priority={idx < 4}
                className="object-cover object-center pointer-events-none"
                sizes="(max-width: 640px) 300px, (max-width: 1024px) 480px, 580px"
              />
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {SAREE_HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSlide(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              activeIndex === idx
                ? 'w-6 h-1.5 bg-[#2874F0]'
                : 'w-1.5 h-1.5 bg-[#D1D5DB] hover:bg-stone-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
