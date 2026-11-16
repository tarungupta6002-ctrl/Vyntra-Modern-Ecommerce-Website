'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { WomenMegaMenu } from '@/components/home/women-mega-menu';
import { MenMegaMenu } from '@/components/home/men-mega-menu';
import { KidsMegaMenu } from '@/components/home/kids-mega-menu';
import { BagsLuggageMegaMenu } from '@/components/home/bags-luggage-mega-menu';

interface FashionDepartmentSubNavProps {
  activeItem?: 'women' | 'men' | 'kids' | 'bags';
}

export function FashionDepartmentSubNav({ activeItem = 'women' }: FashionDepartmentSubNavProps) {
  const [womenDropdownOpen, setWomenDropdownOpen] = useState(false);
  const [menDropdownOpen, setMenDropdownOpen] = useState(false);
  const [kidsDropdownOpen, setKidsDropdownOpen] = useState(false);
  const [bagsDropdownOpen, setBagsDropdownOpen] = useState(false);
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const kidsDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bagsDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleWomenMouseEnter = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setMenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(false);
    setWomenDropdownOpen(true);
  };

  const handleWomenMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setWomenDropdownOpen(false);
    }, 250);
  };

  const handleMenMouseEnter = () => {
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(false);
    setMenDropdownOpen(true);
  };

  const handleMenMouseLeave = () => {
    menDropdownTimerRef.current = setTimeout(() => {
      setMenDropdownOpen(false);
    }, 250);
  };

  const handleKidsMouseEnter = () => {
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setMenDropdownOpen(false);
    setBagsDropdownOpen(false);
    setKidsDropdownOpen(true);
  };

  const handleKidsMouseLeave = () => {
    kidsDropdownTimerRef.current = setTimeout(() => {
      setKidsDropdownOpen(false);
    }, 250);
  };

  const handleBagsMouseEnter = () => {
    if (bagsDropdownTimerRef.current) clearTimeout(bagsDropdownTimerRef.current);
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    if (menDropdownTimerRef.current) clearTimeout(menDropdownTimerRef.current);
    if (kidsDropdownTimerRef.current) clearTimeout(kidsDropdownTimerRef.current);
    setWomenDropdownOpen(false);
    setMenDropdownOpen(false);
    setKidsDropdownOpen(false);
    setBagsDropdownOpen(true);
  };

  const handleBagsMouseLeave = () => {
    bagsDropdownTimerRef.current = setTimeout(() => {
      setBagsDropdownOpen(false);
    }, 250);
  };

  return (
    <div className="w-full bg-white border-b border-[#E7E7E7] shadow-2xs relative z-40">
      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-[48px] flex items-center justify-between overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/products?category=fashion"
            className="text-xl sm:text-2xl font-bold font-headline text-[#0F1111] tracking-tight mr-4 sm:mr-8 hover:text-[#007185] transition-colors"
          >
            Vyntra Fashion
          </Link>
        </div>

        <nav className="flex items-center justify-between flex-1 max-w-[950px] gap-4 sm:gap-6 text-xs sm:text-[13px] font-medium text-[#333333]">
          <button
            type="button"
            onMouseEnter={handleWomenMouseEnter}
            onMouseLeave={handleWomenMouseLeave}
            onClick={() => setWomenDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
              womenDropdownOpen || activeItem === 'women'
                ? 'text-[#007185] font-bold border-b-2 border-[#007185]'
                : ''
            }`}
          >
            <span>Women</span>
            <ChevronDown
              className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${
                womenDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'
              }`}
            />
          </button>

          <button
            type="button"
            onMouseEnter={handleMenMouseEnter}
            onMouseLeave={handleMenMouseLeave}
            onClick={() => setMenDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
              menDropdownOpen || activeItem === 'men'
                ? 'text-[#007185] font-bold border-b-2 border-[#007185]'
                : ''
            }`}
          >
            <span>Men</span>
            <ChevronDown
              className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${
                menDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'
              }`}
            />
          </button>

          <button
            type="button"
            onMouseEnter={handleKidsMouseEnter}
            onMouseLeave={handleKidsMouseLeave}
            onClick={() => setKidsDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
              kidsDropdownOpen || activeItem === 'kids'
                ? 'text-[#007185] font-bold border-b-2 border-[#007185]'
                : ''
            }`}
          >
            <span>Kids</span>
            <ChevronDown
              className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${
                kidsDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'
              }`}
            />
          </button>

          <button
            type="button"
            onMouseEnter={handleBagsMouseEnter}
            onMouseLeave={handleBagsMouseLeave}
            onClick={() => setBagsDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 hover:text-[#007185] hover:underline cursor-pointer group py-1.5 transition-colors ${
              bagsDropdownOpen || activeItem === 'bags'
                ? 'text-[#007185] font-bold border-b-2 border-[#007185]'
                : ''
            }`}
          >
            <span>Bags &amp; Luggage</span>
            <ChevronDown
              className={`h-3 w-3 text-[#565959] group-hover:text-[#007185] transition-transform ${
                bagsDropdownOpen ? 'rotate-180 text-[#007185]' : 'group-hover:translate-y-0.5'
              }`}
            />
          </button>
        </nav>
      </div>

      {/* Amazon-style Full-Width Women Mega Menu Dropdown */}
      <WomenMegaMenu
        isOpen={womenDropdownOpen}
        onMouseEnter={handleWomenMouseEnter}
        onMouseLeave={handleWomenMouseLeave}
        onItemClick={() => setWomenDropdownOpen(false)}
      />

      {/* Amazon-style Full-Width Men Mega Menu Dropdown */}
      <MenMegaMenu
        isOpen={menDropdownOpen}
        onMouseEnter={handleMenMouseEnter}
        onMouseLeave={handleMenMouseLeave}
        onItemClick={() => setMenDropdownOpen(false)}
      />

      {/* Amazon-style Full-Width Kids Mega Menu Dropdown */}
      <KidsMegaMenu
        isOpen={kidsDropdownOpen}
        onMouseEnter={handleKidsMouseEnter}
        onMouseLeave={handleKidsMouseLeave}
        onItemClick={() => setKidsDropdownOpen(false)}
      />

      {/* Amazon-style Full-Width Bags & Luggage Mega Menu Dropdown */}
      <BagsLuggageMegaMenu
        isOpen={bagsDropdownOpen}
        onMouseEnter={handleBagsMouseEnter}
        onMouseLeave={handleBagsMouseLeave}
        onItemClick={() => setBagsDropdownOpen(false)}
      />
    </div>
  );
}
