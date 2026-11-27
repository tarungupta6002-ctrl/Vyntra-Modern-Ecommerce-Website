'use client';

import React, { Suspense } from 'react';
import { Lightbulb, TrendingUp, BookOpen, Feather, GraduationCap, Smile, BookMarked } from 'lucide-react';
import { DepartmentListing, type DepartmentConfig } from '@/components/catalog/department-listing';
import { DEPARTMENT_WORDS } from '@/lib/search';

const BOOKS: DepartmentConfig = {
  departmentSlug: 'books',
  basePath: '/books',
  title: 'Books',
  description:
    'Fiction, self-help, business, Indian literature, exam prep and children’s books from verified sellers. Filter by format and language.',
  noun: { one: 'book', many: 'books' },
  allLabel: 'All books',
  types: [
    { slug: 'self-help-books', name: 'Self-help', icon: Lightbulb, match: /\b(self[- ]help|habits?|mindset|productivity)\b/ },
    { slug: 'business-finance-books', name: 'Business & finance', icon: TrendingUp, match: /\b(business|finance|investing|money)\b/ },
    { slug: 'fiction-literature-books', name: 'Fiction', icon: BookOpen, match: /\b(fiction|novel|thriller|mystery|fantasy)\b/ },
    { slug: 'indian-literature-books', name: 'Indian authors', icon: Feather, match: /\b(mythology|hindi|sahitya)\b/ },
    { slug: 'exam-prep-books', name: 'Exam prep', icon: GraduationCap, match: /\b(upsc|jee|neet|ncert|exam)\b/ },
    { slug: 'comics-manga-books', name: 'Children & comics', icon: Smile, match: /\b(comics?|manga|children|kids)\b/ },
  ],
  brandLabel: 'Author',
  brandIcon: BookMarked,
  // Every book uses the same template, so format / language filters show straight away.
  facetsForAll: true,
  searchStopWords: DEPARTMENT_WORDS.books,
  priceBuckets: [
    { id: 'under-250', label: 'Under ₹250', min: 0, max: 250 },
    { id: '250-500', label: '₹250 – ₹500', min: 250, max: 500 },
    { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
    { id: '1000-plus', label: 'Over ₹1,000', min: 1000, max: Infinity },
  ],
};

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F6F7]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007185]" />
        </div>
      }
    >
      <DepartmentListing config={BOOKS} />
    </Suspense>
  );
}
