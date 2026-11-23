import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getAllProductSlugs } from '@/data/products';
import { getAllMobileProductSlugs } from '@/data/mobiles-fallback';
import { getAllElectronicsProductSlugs } from '@/data/electronics-fallback';
import { getDetailedProductBySlug } from '@/lib/catalog';
import { prisma } from '@/lib/prisma';
import ProductDetailView from './product-detail-view';

interface PageProps {
  params: {
    slug: string;
  };
}

export const dynamicParams = true;
export const revalidate = 300;

// Generate static params for all catalog products
export async function generateStaticParams() {
  try {
    const dbProducts = await prisma.product.findMany({
      where: { isPublished: true, vendor: { status: 'APPROVED' } },
      select: { slug: true },
    });
    if (dbProducts.length > 0) {
      return dbProducts.map((p) => ({ slug: p.slug }));
    }
  } catch (err) {
    // Fallback if DB is not reachable during build
  }
  const slugs = Array.from(
    new Set([
      ...getAllProductSlugs(),
      ...getAllMobileProductSlugs(),
      ...getAllElectronicsProductSlugs(),
    ])
  );
  return slugs.map((slug) => ({ slug }));
}

// Dynamic SEO metadata based on current product
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product } = await getDetailedProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Product Not Found | Vyntra',
      description: 'The requested product could not be found on Vyntra.',
    };
  }

  return {
    title: `${product.title} | Vyntra`,
    description: product.subtitle,
    openGraph: {
      title: `${product.title} - ${product.brand} | Vyntra`,
      description: product.subtitle,
      images: product.images[0]?.src ? [{ url: product.images[0].src }] : [],
    },
  };
}

// Dynamic Product Detail Page
export default async function ProductDetailPage({ params }: PageProps) {
  const { product } = await getDetailedProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailView product={product} />;
}
