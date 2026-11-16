'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface KidsMegaMenuProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
  card1Image?: string;
  card2Image?: string;
  card3Image?: string;
}

export function KidsMegaMenu({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
  card1Image = '/images/mega-menu/kids/max-launched.jpg',
  card2Image = '/images/mega-menu/kids/boys-clothing.jpg',
  card3Image = '/images/mega-menu/kids/girls-clothing.jpg',
}: KidsMegaMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Dimmed Background Overlay (Amazon-style backdrop) */}
      <div
        className="fixed inset-0 top-[148px] bg-black/40 z-40 transition-opacity duration-200"
        onClick={onItemClick}
      />

      {/* Full-width Mega Menu Dropdown */}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="absolute top-full left-0 w-full bg-white text-[#0F1111] shadow-[0_10px_25px_rgba(0,0,0,0.15)] border-t border-[#E7E7E7] z-50 transition-all duration-150 animate-in fade-in-50 slide-in-from-top-1"
      >
        <div className="w-full max-w-[1450px] mx-auto px-8 py-6">
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* ================================================================= */}
            {/* Column 1: GIRLS */}
            {/* ================================================================= */}
            <div className="col-span-3 space-y-4">
              <div>
                <Link
                  href="/category/girls-clothing"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-1 block"
                >
                  GIRLS
                </Link>
                <Link
                  href="/category/girls-clothing"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  ALL CLOTHING
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=tops-tshirts"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Tops &amp; Tees
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=dresses"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Dresses
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=jeans"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Jeans
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=pants"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Pants
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=sets"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Clothing Sets
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/girls-clothing?sub=all"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Baby Girl
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Girls Shoes */}
              <div className="pt-2 border-t border-[#F0F0F0]">
                <Link
                  href="/category/womens-shoes?sub=kids-shoes"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline block"
                >
                  SHOES
                </Link>
              </div>
            </div>

            {/* ================================================================= */}
            {/* Column 2: BOYS */}
            {/* ================================================================= */}
            <div className="col-span-3 space-y-4">
              <div>
                <Link
                  href="/category/boys-clothing"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-1 block"
                >
                  BOYS
                </Link>
                <Link
                  href="/category/boys-clothing"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  ALL CLOTHING
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=t-shirts"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      T-Shirts
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=shirts"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Shirts
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=jeans"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Jeans
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=pants"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Pants
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=clothing-sets"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Clothing Sets
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/boys-clothing?sub=all"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Baby Boy
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Boys Shoes */}
              <div className="pt-2 border-t border-[#F0F0F0]">
                <Link
                  href="/category/mens-shoes?sub=kids-shoes"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline block"
                >
                  SHOES
                </Link>
              </div>
            </div>

            {/* ================================================================= */}
            {/* Column 3: 3 PROMOTIONAL VISUAL CARDS */}
            {/* ================================================================= */}
            <div className="col-span-6 grid grid-cols-3 gap-4 pl-6 border-l border-[#E7E7E7]">
              {/* Card 1: MAX | Just Launched */}
              <Link
                href="/products?category=kids&brand=max"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src={card1Image}
                    alt="MAX | Just Launched - Explore Store"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  MAX | Just Launched
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  Explore Store
                </span>
              </Link>

              {/* Card 2: Boys' Clothing */}
              <Link
                href="/category/boys-clothing"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src={card2Image}
                    alt="Boys' Clothing - 40% - 70% off"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  Boys&apos; Clothing
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  40% - 70% off
                </span>
              </Link>

              {/* Card 3: Girls' Clothing */}
              <Link
                href="/category/girls-clothing"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src={card3Image}
                    alt="Girls' Clothing - 40% - 70% off"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  Girls&apos; Clothing
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  40% - 70% off
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
