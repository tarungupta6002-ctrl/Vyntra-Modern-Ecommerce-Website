'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface WomenMegaMenuProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
  card1Image?: string;
  card2Image?: string;
  card3Image?: string;
}

export function WomenMegaMenu({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
  card1Image = 'https://m.media-amazon.com/images/I/7156yifeGyL._SY879_.jpg',
  card2Image = '/images/mega-menu/silver-jewellery.jpg',
  card3Image = '/images/mega-menu/max-launched.jpg',
}: WomenMegaMenuProps) {
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
            {/* Column 1: CLOTHING */}
            <div className="col-span-2 space-y-1">
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] mb-2.5">
                Clothing
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/category/western-wear" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    All Western Wear
                  </Link>
                </li>
                <li>
                  <Link href="/category/western-wear" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Shirts, Tops &amp; Tees
                  </Link>
                </li>
                <li>
                  <Link href="/category/western-wear" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Dresses
                  </Link>
                </li>
                <li>
                  <Link href="/category/western-wear" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Jeans &amp; Jeggings
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-ethnic-wear" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    All Ethnic Wear
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-ethnic-wear?sub=kurtas" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Kurtas
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-ethnic-wear?sub=salwarsuits" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Salwar Suits
                  </Link>
                </li>
                <li>
                  <Link href="/category/sarees" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Sarees
                  </Link>
                </li>
                <li>
                  <Link href="/category/lingerie-sleep-lounge" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Lingerie, Sleep &amp; Lounge
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: SHOES & EYEWEAR */}
            <div className="col-span-2 space-y-1">
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] mb-2.5">
                Shoes
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/category/womens-shoes?sub=sandals" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Fashion Sandals
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=pumps" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Pumps &amp; Peeptoes
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=flip-flops" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Casual Slippers
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=sneakers" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Casual Shoes
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=boots" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Boots
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=sports-shoes" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Sports Shoes
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=flip-flops" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Flip-Flops
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=ballet-flats" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Ballet Flats
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=ethnic" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Ethnic Footwear
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-shoes?sub=loafers" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Formal Shoes
                  </Link>
                </li>
              </ul>

              <Link
                href="/category/womens-eyewear"
                onClick={onItemClick}
                className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] pt-4 mb-2.5 block hover:text-[#007185]"
              >
                Eyewear
              </Link>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/category/womens-eyewear?sub=sunglasses" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Sunglasses
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-eyewear?sub=eyewear-frames" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Spectacle Frames
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-eyewear?sub=reading-glasses" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Reading Glasses
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-eyewear?sub=glasses-cases" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Cases &amp; Accessories
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: WATCHES, JEWELLERY & HANDBAGS */}
            <div className="col-span-2 space-y-1">
              <Link
                href="/category/womens-watches"
                onClick={onItemClick}
                className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] mb-2.5 block hover:text-[#007185]"
              >
                Watches
              </Link>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/category/womens-watches?sub=wrist-watches" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Gold &amp; rose-gold
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-watches?sub=wrist-watches" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Stainless steel
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-watches?sub=wrist-watches" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Leather
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-watches?sub=smartwatches" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Smartwatches
                  </Link>
                </li>
              </ul>

              <Link
                href="/category/womens-jewellery"
                onClick={onItemClick}
                className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] pt-4 mb-2.5 block hover:text-[#007185]"
              >
                Jewellery
              </Link>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/category/womens-jewellery?sub=gold-diamond" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Gold &amp; Diamond Jewellery
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-jewellery?sub=traditional-kundan" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Traditional Imitation
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-jewellery?sub=jewelry-sets" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Fashion Jewellery
                  </Link>
                </li>
                <li>
                  <Link href="/category/womens-jewellery?sub=silver-jewellery" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Silver Jewellery
                  </Link>
                </li>
              </ul>

              <h4 className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] pt-4 mb-2.5">
                Handbags &amp; Clutches
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                <li>
                  <Link href="/products?category=bags" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Handbags
                  </Link>
                </li>
                <li>
                  <Link href="/products?category=bags" onClick={onItemClick} className="hover:text-[#007185] hover:underline block leading-relaxed">
                    Wallets
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: 3 VISUAL CARDS (Amazon Screenshot Exact Match) */}
            <div className="col-span-6 grid grid-cols-3 gap-5 pl-4">
              {/* Card 1: Women's Clothing */}
              <Link
                href="/category/womens-ethnic-wear"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7]">
                  <Image
                    src={card1Image}
                    alt="Women's Clothing"
                    fill
                    unoptimized
                    className="object-cover object-top group-hover:scale-102 transition-transform duration-300"
                    sizes="(max-width: 1200px) 200px, 280px"
                  />
                </div>
                <div className="pt-2.5 text-center">
                  <span className="text-[13px] font-bold text-[#0F1111] block group-hover:text-[#007185] transition-colors leading-snug">
                    Women&apos;s Clothing
                  </span>
                  <span className="text-[12px] text-[#007185] block mt-0.5 group-hover:underline">
                    Explore Store
                  </span>
                </div>
              </Link>

              {/* Card 2: Silver Jewellery */}
              <Link
                href="/category/womens-jewellery?sub=silver-jewellery"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7]">
                  <Image
                    src={card2Image}
                    alt="Silver Jewellery"
                    fill
                    unoptimized
                    className="object-cover object-center group-hover:scale-102 transition-transform duration-300"
                    sizes="(max-width: 1200px) 200px, 280px"
                  />
                </div>
                <div className="pt-2.5 text-center">
                  <span className="text-[13px] font-bold text-[#0F1111] block group-hover:text-[#007185] transition-colors leading-snug">
                    Silver Jewellery
                  </span>
                  <span className="text-[12px] text-[#007185] block mt-0.5 group-hover:underline">
                    Explore Store
                  </span>
                </div>
              </Link>

              {/* Card 3: MAX | Just Launched */}
              <Link
                href="/products?sort=newest"
                onClick={onItemClick}
                className="group flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f7f7f7]">
                  <Image
                    src={card3Image}
                    alt="MAX | Just Launched"
                    fill
                    unoptimized
                    className="object-cover object-top group-hover:scale-102 transition-transform duration-300"
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
