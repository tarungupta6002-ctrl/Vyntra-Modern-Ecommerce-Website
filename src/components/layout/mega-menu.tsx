'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ChevronRight } from 'lucide-react';

interface MegaMenuProps {
  activeTab: 'women' | 'men' | 'fashion' | 'footwear' | 'jewels' | null;
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
}

export function MegaMenu({
  activeTab,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
}: MegaMenuProps) {
  if (!isOpen || !activeTab) return null;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 w-full bg-white text-[#0F1111] shadow-2xl border-t border-[#D5D9D9] border-b-2 border-b-[#FF9900] z-50 transition-all duration-200 ease-out animate-in fade-in-50 slide-in-from-top-1"
    >
      <div className="max-w-[1500px] mx-auto px-6 py-6">
        {activeTab === 'women' || activeTab === 'fashion' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Column 1: CLOTHING */}
            <div className="col-span-2 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Clothing
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?sort=newest"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Top Verified Brands
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=womens-western-fusion"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    All Western Wear
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=womens-western-fusion"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Shirts, Tops &amp; Tees
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=womens-western-fusion"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Dresses &amp; Gowns
                  </Link>
                </li>
                {/* Special Amazon-style Category Hub link */}
                <li className="pt-1.5 border-t border-[#EFEFEF]">
                  <Link
                    href="/category/womens-ethnic-wear"
                    onClick={onItemClick}
                    className="font-bold text-[#800020] hover:text-[#007185] hover:underline flex items-center justify-between"
                  >
                    <span>All Ethnic Wear â†’</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">Hub</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/womens-ethnic-wear?sub=kurtas"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block pl-2 border-l border-amber-300"
                  >
                    Kurtas, Suits &amp; Anarkalis
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/sarees"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block pl-2 border-l border-amber-300"
                  >
                    Handloom &amp; Silk Sarees
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/womens-ethnic-wear?sub=salwarsuits"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block pl-2 border-l border-amber-300"
                  >
                    Lehenga Cholis &amp; Bridal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/category/womens-ethnic-wear?sub=dupatta"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block pl-2 border-l border-amber-300"
                  >
                    Dupattas, Shawls &amp; Stoles
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=ethnic"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block text-[#565959]"
                  >
                    Handlooms &amp; Handicrafts
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: SHOES */}
            <div className="col-span-2 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Shoes
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Hand-stitched Velvet Juttis
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Bespoke Kolhapuris &amp; Mojaris
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Fashion Sandals &amp; Flats
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Casual Comfort Slippers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Formal &amp; Evening Footwear
                  </Link>
                </li>
              </ul>

              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pt-3 pb-1 border-b border-[#0F1111]/20">
                Eyewear
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?search=sunglasses"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Polarized Sunglasses
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?search=frames"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Designer Spectacle Frames
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: JEWELLERY & WATCHES */}
            <div className="col-span-2 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Jewellery
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=jewelry-accessories"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Gold &amp; Polki Bridal Sets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=jewelry-accessories"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Kundan &amp; Jadau Chokers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=jewelry-accessories"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    925 Silver Temple Jewellery
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=jewelry-accessories"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Traditional Imitation Jewellery
                  </Link>
                </li>
              </ul>

              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pt-3 pb-1 border-b border-[#0F1111]/20">
                Watches &amp; Horology
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=watches"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Gold &amp; Rose-Gold Classics
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=watches"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Mechanical Automatic Watches
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=watches"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Heritage Leather Strap Watches
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: HANDBAGS & CLUTCHES */}
            <div className="col-span-2 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Handbags &amp; Clutches
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Full-grain Leather Totes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Hand-embroidered Silk Potlis
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Evening Box Clutches
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Everyday Shoulder Handbags
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Leather Wallets &amp; Pouches
                  </Link>
                </li>
              </ul>

              <div className="pt-4 mt-2 border-t border-[#EFEFEF]">
                <Link
                  href="/products?deals=festive"
                  onClick={onItemClick}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF9900] hover:text-[#B12704]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Festive Clearance Hub â†’</span>
                </Link>
              </div>
            </div>

            {/* Column 5: THREE VISUAL CARDS (Exact match to Amazon Screenshot 2) */}
            <div className="col-span-4 grid grid-cols-3 gap-3">
              {/* Visual Card 1: Women's Clothing */}
              <Link
                href="/category/womens-ethnic-wear"
                onClick={onItemClick}
                className="group flex flex-col rounded-lg overflow-hidden border border-[#D5D9D9] hover:border-[#FF9900] bg-[#FAFAFA] transition-all hover:shadow-md"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
                  <Image
                    src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
                    alt="Women's Ethnic Wear"
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    sizes="200px"
                  />
                </div>
                <div className="p-2.5 text-center">
                  <span className="text-xs font-bold text-[#0F1111] block group-hover:text-[#007185]">
                    Women&apos;s Clothing
                  </span>
                  <span className="text-[11px] text-[#007185] font-semibold flex items-center justify-center gap-0.5 mt-0.5 group-hover:underline">
                    Explore Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Visual Card 2: Silver & Temple Jewellery */}
              <Link
                href="/products?category=jewelry-accessories"
                onClick={onItemClick}
                className="group flex flex-col rounded-lg overflow-hidden border border-[#D5D9D9] hover:border-[#FF9900] bg-[#FAFAFA] transition-all hover:shadow-md"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
                  <Image
                    src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80"
                    alt="Silver Jewellery"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="200px"
                  />
                </div>
                <div className="p-2.5 text-center">
                  <span className="text-xs font-bold text-[#0F1111] block group-hover:text-[#007185]">
                    Silver Jewellery
                  </span>
                  <span className="text-[11px] text-[#007185] font-semibold flex items-center justify-center gap-0.5 mt-0.5 group-hover:underline">
                    Explore Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Visual Card 3: New Festive Launch */}
              <Link
                href="/products?sort=curated"
                onClick={onItemClick}
                className="group flex flex-col rounded-lg overflow-hidden border border-[#D5D9D9] hover:border-[#FF9900] bg-[#FAFAFA] transition-all hover:shadow-md"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
                  <Image
                    src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"
                    alt="Festive Launch"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="200px"
                  />
                </div>
                <div className="p-2.5 text-center">
                  <span className="text-xs font-bold text-[#0F1111] block group-hover:text-[#007185]">
                    Atelier | Just Launched
                  </span>
                  <span className="text-[11px] text-[#007185] font-semibold flex items-center justify-center gap-0.5 mt-0.5 group-hover:underline">
                    Explore Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        ) : activeTab === 'men' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Column 1: MEN'S CLOTHING */}
            <div className="col-span-3 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Men&apos;s Clothing
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=mens-shirts-trousers"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Formal &amp; Casual Cotton Shirts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=mens-kurtas-sherwanis"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block font-semibold text-[#800020]"
                  >
                    Silk Kurtas, Sherwanis &amp; Nehru Jackets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=mens-shirts-trousers"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Tailored Trousers &amp; Chinos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?search=polo"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block font-medium"
                  >
                    Polos &amp; Casual Tees
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?brand=U.S.+POLO+ASSN."
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block font-bold text-[#007185]"
                  >
                    U.S. POLO ASSN. Atelier Store â†—
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: MEN'S FOOTWEAR & LEATHER */}
            <div className="col-span-3 space-y-2 border-r border-[#E7E7E7] pr-4">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#0F1111] pb-1 border-b border-[#0F1111]/20">
                Men&apos;s Footwear &amp; Leather
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#333333]">
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Vegetable-Tanned Leather Loafers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=footwear"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Handcrafted Kolhapuri Chappals
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=bags"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Leather Laptop Messengers &amp; Bags
                  </Link>
                </li>
                <li>
                  <Link
                    href="/products?category=watches"
                    onClick={onItemClick}
                    className="hover:text-[#007185] hover:underline block"
                  >
                    Mechanical Automatic Watches
                  </Link>
                </li>
              </ul>
            </div>

            {/* Visual Cards for Men */}
            <div className="col-span-6 grid grid-cols-2 gap-4">
              <Link
                href="/products?category=mens-kurtas-sherwanis"
                onClick={onItemClick}
                className="group flex flex-col rounded-lg overflow-hidden border border-[#D5D9D9] hover:border-[#FF9900] bg-[#FAFAFA] transition-all hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                  <Image
                    src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"
                    alt="Men's Formal Couture"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="300px"
                  />
                </div>
                <div className="p-3 text-center">
                  <span className="text-xs font-bold text-[#0F1111] block group-hover:text-[#007185]">
                    Men&apos;s Royal Festive Edit
                  </span>
                  <span className="text-[11px] text-[#007185] font-semibold flex items-center justify-center gap-0.5 mt-0.5 group-hover:underline">
                    Explore Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>

              <Link
                href="/products?category=mens-shirts-trousers"
                onClick={onItemClick}
                className="group flex flex-col rounded-lg overflow-hidden border border-[#D5D9D9] hover:border-[#FF9900] bg-[#FAFAFA] transition-all hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                  <Image
                    src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80"
                    alt="Men's Shirts"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="300px"
                  />
                </div>
                <div className="p-3 text-center">
                  <span className="text-xs font-bold text-[#0F1111] block group-hover:text-[#007185]">
                    Tailored Cotton &amp; Linen Shirts
                  </span>
                  <span className="text-[11px] text-[#007185] font-semibold flex items-center justify-center gap-0.5 mt-0.5 group-hover:underline">
                    Explore Store <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
