import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Real catalog data for the homepage: published products (newest first) and the departments
 * that actually have stock. Nothing here is invented; empty departments are simply left out.
 */

export interface HomeProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  image: string | null;
  inStock: boolean;
  departmentKey: string | null;
  createdAt: string;
}

export interface HomeDepartment {
  key: string;
  name: string;
  href: string;
  count: number;
  image: string | null;
}

/** Departments in the order shoppers scan them; `match` reads the category path (root first). */
const DEPARTMENTS: { key: string; name: string; href: string; match: (path: string[]) => boolean }[] = [
  { key: 'mobiles', name: 'Mobiles', href: '/mobiles', match: (p) => p.includes('mobiles') },
  { key: 'laptops', name: 'Laptops', href: '/electronics', match: (p) => p.includes('laptops') },
  { key: 'electronics', name: 'Electronics', href: '/electronics', match: (p) => p[0] === 'electronics' },
  { key: 'appliances', name: 'Home appliances', href: '/appliances', match: (p) => p[0] === 'appliances' },
  { key: 'sarees', name: 'Sarees and ethnic wear', href: '/category/sarees', match: (p) => p.some((s) => s.includes('ethnic') || s.includes('saree')) },
  { key: 'women', name: "Women's clothing", href: '/category/womens-western-wear', match: (p) => p.includes('womens-clothing') },
  { key: 'men', name: "Men's clothing", href: '/category/mens-clothing', match: (p) => p.includes('mens-clothing') },
  { key: 'shoes', name: 'Shoes', href: '/category/shoes', match: (p) => p.some((s) => s.includes('shoes')) },
  { key: 'watches', name: 'Watches', href: '/category/watches', match: (p) => p.some((s) => s.includes('watches')) },
  { key: 'books', name: 'Books', href: '/books', match: (p) => p[0] === 'books' },
];

function categoryPath(category: any): string[] {
  const path: string[] = [];
  let node = category;
  while (node && path.length < 6) {
    if (node.slug) path.unshift(node.slug);
    node = node.parent;
  }
  return path;
}

async function loadHomeCatalog() {
  const rows = await prisma.product.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      slug: true,
      title: true,
      brand: true,
      basePrice: true,
      discountPrice: true,
      createdAt: true,
      category: {
        select: { slug: true, parent: { select: { slug: true, parent: { select: { slug: true, parent: { select: { slug: true } } } } } } },
      },
      images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
      inventories: { select: { quantity: true, reservedQuantity: true } },
    },
  });

  const products: HomeProduct[] = rows.map((r) => {
    const base = Number(r.basePrice || 0);
    const disc = r.discountPrice ? Number(r.discountPrice) : null;
    const price = disc && disc > 0 ? Math.min(base, disc) : base;
    const mrp = disc && disc > 0 ? Math.max(base, disc) : base;
    const path = categoryPath(r.category);
    const dept = DEPARTMENTS.find((d) => d.match(path));
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      brand: r.brand,
      price,
      mrp,
      image: r.images[0]?.url || null,
      inStock: r.inventories.reduce((n, i) => n + Math.max(0, i.quantity - i.reservedQuantity), 0) > 0,
      departmentKey: dept?.key ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  const departments: HomeDepartment[] = DEPARTMENTS.map((d) => {
    const items = products.filter((p) => p.departmentKey === d.key);
    return { key: d.key, name: d.name, href: d.href, count: items.length, image: items.find((p) => p.image)?.image ?? null };
  }).filter((d) => d.count > 0);

  const totalProducts = await prisma.product.count({ where: { isPublished: true } });
  return { products, departments, totalProducts };
}

export const getHomeCatalog = unstable_cache(loadHomeCatalog, ['home-catalog-v1'], {
  revalidate: 300,
  tags: ['products'],
});
