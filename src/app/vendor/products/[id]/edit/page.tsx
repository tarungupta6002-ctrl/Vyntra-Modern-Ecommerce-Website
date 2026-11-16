'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ProductForm } from '@/components/vendor/product-form';

export default function VendorProductEditPage({ params }: { params: { id: string } }) {
  const productId = params.id;
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProduct() {
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/vendor/products/${encodeURIComponent(productId)}`);
        const json = await res.json();

        if (res.ok && json.success && json.data) {
          if (isMounted) {
            setProduct(json.data);
            setIsLoading(false);
          }
        } else {
          if (isMounted) {
            setErrorStatus(res.status);
            setErrorMessage(json.error?.message || 'Unable to retrieve product details.');
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorStatus(500);
          setErrorMessage('Network error while loading product details.');
          setIsLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#007185] mx-auto" />
        <p className="text-xs font-semibold text-[#565959]">Loading product architecture for editing...</p>
      </div>
    );
  }

  if (errorStatus || !product) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-[#0F1111]">Product Not Found or Unauthorized</h2>
        <p className="text-xs text-[#565959]">
          {errorMessage || 'You do not have permission to edit this product or it does not exist.'}
        </p>
        <Link
          href="/vendor/products"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#007185] text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <ProductForm mode="edit" productId={productId} initialData={product} />
    </div>
  );
}
