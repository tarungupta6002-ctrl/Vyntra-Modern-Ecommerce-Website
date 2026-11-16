'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BagsLuggageMegaMenuProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onItemClick: () => void;
}

export function BagsLuggageMegaMenu({
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
}: BagsLuggageMegaMenuProps) {
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
            {/* Column 1: BAGS & BACKPACKS + LUGGAGE */}
            {/* ================================================================= */}
            <div className="col-span-3 space-y-5">
              {/* BAGS & BACKPACKS */}
              <div>
                <Link
                  href="/category/bags-backpacks"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  BAGS &amp; BACKPACKS
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=backpacks"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Backpacks
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=laptop-bags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Laptop Bags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=briefcases"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Briefcases
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=messenger-bags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Messenger Bags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=rucksacks"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Rucksacks
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/bags-backpacks?sub=school-bags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      School Bags
                    </Link>
                  </li>
                </ul>
              </div>

              {/* LUGGAGE */}
              <div className="pt-2 border-t border-[#F0F0F0]">
                <Link
                  href="/category/luggage"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  LUGGAGE
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/luggage?sub=suitcases"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Suitcases &amp; Trolley Bags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/luggage?sub=duffles"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Travel Duffles
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/luggage?sub=accessories"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Travel Accessories
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* ================================================================= */}
            {/* Column 2: HANDBAGS & CLUTCHES + WALLETS */}
            {/* ================================================================= */}
            <div className="col-span-3 space-y-5">
              {/* HANDBAGS & CLUTCHES */}
              <div>
                <Link
                  href="/category/handbags-clutches"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  HANDBAGS &amp; CLUTCHES
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=handbags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Handbags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=clutches"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Clutches
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=totes"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Totes
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=sling-bags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Sling Bags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=shoulder-bags"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Hobos and Shoulder Bags
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/category/handbags-clutches?sub=satchels"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Satchels
                    </Link>
                  </li>
                </ul>
              </div>

              {/* WALLETS */}
              <div className="pt-2 border-t border-[#F0F0F0]">
                <Link
                  href="/category/mens-wallets"
                  onClick={onItemClick}
                  className="text-[12px] font-bold uppercase tracking-wide text-[#0F1111] hover:text-[#007185] hover:underline mb-2 block"
                >
                  WALLETS
                </Link>
                <ul className="space-y-1.5 text-[13px] text-[#0F1111]">
                  <li>
                    <Link
                      href="/category/mens-wallets"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed font-medium"
                    >
                      Men&apos;s Wallets
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products?category=wallets&gender=women"
                      onClick={onItemClick}
                      className="hover:text-[#007185] hover:underline block leading-relaxed"
                    >
                      Women&apos;s Wallets
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* ================================================================= */}
            {/* Column 3: 3 PROMOTIONAL VISUAL CARDS */}
            {/* ================================================================= */}
            <div className="col-span-6 grid grid-cols-3 gap-4 pl-6 border-l border-[#E7E7E7]">
              {/* Card 1: Handbags */}
              <Link
                href="/category/handbags-clutches"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src="/images/bags-luggage/card-handbags.png"
                    alt="Handbags - 40%-70% off"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  Handbags
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  40%-70% off
                </span>
              </Link>

              {/* Card 2: Backpacks */}
              <Link
                href="/category/bags-backpacks"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src="/images/bags-luggage/card-backpacks.png"
                    alt="Backpacks - 40%-70% off"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  Backpacks
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  40%-70% off
                </span>
              </Link>

              {/* Card 3: New Arrivals */}
              <Link
                href="/category/luggage"
                onClick={onItemClick}
                className="group flex flex-col text-left"
              >
                <div className="relative aspect-[127/166] w-full overflow-hidden rounded-md bg-[#f8f8f8] mb-2 shadow-xs group-hover:shadow transition-shadow">
                  <Image
                    src="/images/bags-luggage/card-luggage.png"
                    alt="New Arrivals - Bags and Luggage"
                    fill
                    unoptimized
                    priority
                    className="object-cover object-center group-hover:scale-104 transition-transform duration-300"
                    sizes="220px"
                  />
                </div>
                <span className="text-[13px] font-bold text-[#0F1111] group-hover:text-[#007185] transition-colors leading-tight">
                  New Arrivals
                </span>
                <span className="text-[12px] text-[#565959] mt-0.5">
                  Bags and Luggage
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
