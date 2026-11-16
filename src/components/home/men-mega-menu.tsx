'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface MenMegaMenuProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
  card1Image?: string;
  card2Image?: string;
  card3Image?: string;
}

export function MenMegaMenu({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
  card1Image = '/images/mega-menu/mens-clothing.jpg',
  card2Image = '/images/mega-menu/mens-running-shoes.jpg',
  card3Image = '/images/mega-menu/mens-max-launched.jpg',
}: MenMegaMenuProps) {
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
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Column 1: CLOTHING (Exact match to Amazon Screenshot) */}
            <div className="col-span-2 space-y-1">
              <Link
                href="/category/mens-clothing"
                onClick={onItemClick}
                className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2.5 block"
              >
                Clothing
              </Link>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link
                    href="/category/mens-clothing?sub=t-shirts"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    T-Shirts &amp; Polos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=shirts"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Shirts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=trousers"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Trousers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=denims"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Jeans
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=innerwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Innerwear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=sportswear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sportswear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=sleepwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sleep &amp; Lounge Wear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=ethnic"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Ethnic Wear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=accessories"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Ties, Socks &amp; Belts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=suits"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Suits &amp; Blazers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=winterwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sweaters
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-clothing?sub=winterwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Jackets &amp; Coats
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: SHOES (Exact match to Amazon Screenshot) */}
            <div className="col-span-2 space-y-1">
              <Link
                href="/category/mens-shoes"
                onClick={onItemClick}
                className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2.5 block"
              >
                Shoes
              </Link>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link
                    href="/category/mens-shoes?type=sports"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sports Shoes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=formal"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Formal Shoes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=casual"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Casual Shoes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=sneakers"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sneakers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=loafers"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Loafers &amp; Mocassins
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=flip-flops"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Flip-Flops
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=boots"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Boots
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=sandals"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Sandals &amp; Floaters
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=thong"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Thong Sandals
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/mens-shoes?type=casual"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block leading-relaxed"
                  >
                    Boat Shoes
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: WATCHES, JEWELLERY, EYEWEAR & WALLETS (Exact match) */}
            <div className="col-span-2 space-y-4">
              {/* WATCHES */}
              <div>
                <Link
                  href="/category/mens-watches"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2.5 block"
                >
                  Watches
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/mens-watches?sub=value-picks"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Metallic
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/mens-watches?sub=premium"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Chronographs
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/mens-watches?sub=classics"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Leather
                    </Link>
                  </li>
                </ul>
              </div>

              {/* JEWELLERY */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] mb-2.5">
                  Jewellery
                </h4>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/products?category=mens-jewellery&type=rings"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Rings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products?category=mens-jewellery&type=bracelets"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Bracelets
                    </Link>
                  </li>
                </ul>
              </div>

              {/* EYEWEAR */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] mb-2.5">
                  Eyewear
                </h4>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/products?category=mens-eyewear&type=sunglasses"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Sunglasses
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products?category=mens-eyewear&type=frames"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Spectacle Frames
                    </Link>
                  </li>
                </ul>
              </div>

              {/* WALLETS */}
              <div>
                <Link
                  href="/category/mens-wallets"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline block"
                >
                  Wallets
                </Link>
              </div>
            </div>

            {/* Column 4: 3 PROMOTIONAL VISUAL CARDS (Exact match to Amazon Screenshot) */}
            <div className="col-span-6 grid grid-cols-3 gap-4 pl-4 border-l border-[#E7E7E7]">
              {/* Card 1: Men's Clothing */}
              <Link
                href="/category/mens-clothing"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7] rounded-xs">
                  <Image
                    src={card1Image}
                    alt="Men's Clothing"
                    fill
                    unoptimized
                    className="object-cover object-center group-hover:scale-103 transition-transform duration-300"
                    sizes="(max-width: 1200px) 200px, 280px"
                  />
                </div>
                <div className="pt-2.5 text-center">
                  <span className="text-[13px] font-bold text-[#0F1111] block group-hover:text-[#007185] transition-colors leading-snug">
                    Men&apos;s Clothing
                  </span>
                  <span className="text-[12px] text-[#007185] block mt-0.5 group-hover:underline">
                    Explore Store
                  </span>
                </div>
              </Link>

              {/* Card 2: Running Shoes */}
              <Link
                href="/category/mens-shoes"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7] rounded-xs">
                  <Image
                    src={card2Image}
                    alt="Running Shoes"
                    fill
                    unoptimized
                    className="object-cover object-center group-hover:scale-103 transition-transform duration-300"
                    sizes="(max-width: 1200px) 200px, 280px"
                  />
                </div>
                <div className="pt-2.5 text-center">
                  <span className="text-[13px] font-bold text-[#0F1111] block group-hover:text-[#007185] transition-colors leading-snug">
                    Running Shoes
                  </span>
                  <span className="text-[12px] text-[#007185] block mt-0.5 group-hover:underline">
                    See More
                  </span>
                </div>
              </Link>

              {/* Card 3: MAX | Just Launched */}
              <Link
                href="/products?search=max+men"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7] rounded-xs">
                  <Image
                    src={card3Image}
                    alt="MAX | Just Launched"
                    fill
                    unoptimized
                    className="object-cover object-center group-hover:scale-103 transition-transform duration-300"
                    sizes="(max-width: 1200px) 200px, 280px"
                  />
                </div>
                <div className="pt-2.5 text-center">
                  <span className="text-[13px] font-bold text-[#0F1111] block group-hover:text-[#007185] transition-colors leading-snug">
                    MAX | Just Launched
                  </span>
                  <span className="text-[12px] text-[#007185] block mt-0.5 group-hover:underline">
                    Explore Store
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
