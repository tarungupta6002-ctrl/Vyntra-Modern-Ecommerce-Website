import React from 'react';
import Link from 'next/link';
import { RotateCcw, ShieldCheck, Store, Truck } from 'lucide-react';
import { getHomeCatalog, type HomeProduct } from '@/lib/home-catalog';
import { CopyCode, WishlistToggle } from '@/components/home/home-client';

export const dynamic = 'force-dynamic';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const savePct = (p: HomeProduct) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

/** A product shown as a shop price tag: what you pay, the printed MRP, and what you save. */
function PriceTag({ product, size = 'md' }: { product: HomeProduct; size?: 'md' | 'lg' }) {
  const pct = savePct(product);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-brand font-semibold tabular-nums text-[#0F1111] [font-stretch:85%] ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
        {inr(product.price)}
      </span>
      {pct > 0 && (
        <>
          <span className="text-xs text-[#565959]">
            MRP <s className="tabular-nums">{inr(product.mrp)}</s>
          </span>
          <span className="text-xs font-semibold text-[#B12704]">Save {inr(product.mrp - product.price)}</span>
        </>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: HomeProduct }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col rounded-xl bg-white p-3 ring-1 ring-[#E3E6E6] transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(15,17,17,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#F7F8F8]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" loading="lazy" className="h-full w-full object-contain p-3 mix-blend-multiply" />
        ) : null}
        <WishlistToggle product={product} />
        {!product.inStock && (
          <span className="absolute bottom-2 left-2 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-[#565959] ring-1 ring-[#D5D9D9]">
            Out of stock
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-[#565959]">{product.brand}</p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[#0F1111] group-hover:text-[#007185]">{product.title}</p>
      <div className="mt-auto pt-2">
        <PriceTag product={product} />
      </div>
    </Link>
  );
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-brand text-3xl font-semibold leading-none text-[#0F1111] [font-stretch:80%] sm:text-4xl">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-semibold text-[#007185] hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function HomePage() {
  const { products, departments, totalProducts } = await getHomeCatalog();

  const newest = products.slice(0, 10);
  const biggestDrops = [...products]
    .filter((p) => savePct(p) >= 10)
    .sort((a, b) => savePct(b) - savePct(a))
    .slice(0, 5);

  return (
    <div className="w-full bg-[#F3F4F2] text-[#0F1111]">
      {/* Hero: what Vyntra sells, and a live directory of departments */}
      <section className="bg-[#FFD814]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:py-14">
          <div className="flex flex-col justify-center">
            <h1 className="font-brand text-[3.4rem] font-bold leading-[0.88] tracking-[-0.01em] text-[#0F1111] [font-stretch:75%] sm:text-[5rem] lg:text-[6.2rem]">
              From sarees to smartphones.
            </h1>
            <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-[#2A2A1F] sm:text-lg">
              Fashion, mobiles, laptops, home appliances and books, sold by sellers across India and delivered to your door.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/products"
                className="inline-flex items-center rounded-full bg-[#131921] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F1111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#131921]"
              >
                Browse all {totalProducts} products
              </Link>
              <Link href="/become-seller" className="text-sm font-semibold text-[#0F1111] underline decoration-2 underline-offset-4 hover:decoration-[#007185]">
                Sell on Vyntra
              </Link>
            </div>
            <ul className="mt-9 grid max-w-xl grid-cols-1 gap-3 text-sm text-[#2A2A1F] sm:grid-cols-3">
              <li className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Free delivery, ₹49 packaging fee per order</span>
              </li>
              <li className="flex items-start gap-2">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
                <span>7-day returns on eligible items</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Pay with UPI, card or Cash on Delivery</span>
              </li>
            </ul>
          </div>

          {/* Directory board */}
          <nav aria-label="Departments" className="self-center rounded-2xl bg-[#131921] p-5 text-white shadow-[0_20px_50px_-24px_rgba(19,25,33,0.8)] sm:p-7">
            <p className="font-brand text-2xl font-semibold text-[#FFD814] [font-stretch:80%]">What&apos;s in store</p>
            <ul className="mt-4 divide-y divide-white/10">
              {departments.map((d, i) => (
                <li key={d.key} className="home-board-row" style={{ animationDelay: `${120 + i * 60}ms` }}>
                  <Link
                    href={d.href}
                    className="group flex items-baseline gap-2 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD814]"
                  >
                    <span className="font-brand text-xl font-medium [font-stretch:85%] group-hover:text-[#FFD814] sm:text-2xl">{d.name}</span>
                    <span aria-hidden className="mb-1.5 flex-1 border-b-2 border-dotted border-white/25" />
                    <span className="font-brand text-xl tabular-nums text-white/80 [font-stretch:85%] sm:text-2xl">
                      {d.count}
                      <span className="sr-only"> {d.count === 1 ? 'product' : 'products'}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li className="home-board-row" style={{ animationDelay: `${120 + departments.length * 60}ms` }}>
                <Link href="/products" className="group flex items-baseline gap-2 pt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD814]">
                  <span className="font-brand text-xl font-semibold text-[#FFD814] [font-stretch:85%] sm:text-2xl">Everything</span>
                  <span aria-hidden className="mb-1.5 flex-1 border-b-2 border-dotted border-[#FFD814]/40" />
                  <span className="font-brand text-xl font-semibold tabular-nums text-[#FFD814] [font-stretch:85%] sm:text-2xl">{totalProducts}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {/* Newest listings */}
        {newest.length > 0 && (
          <section aria-labelledby="just-in">
            <div id="just-in">
              <SectionTitle title="Just listed" href="/products" linkLabel="See all products" />
            </div>
            <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
              {newest.map((p) => (
                <li key={p.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Departments with a real photo from each */}
        {departments.length > 0 && (
          <section aria-labelledby="shop-by-department">
            <div id="shop-by-department">
              <SectionTitle title="Shop by department" />
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {departments.map((d) => (
                <li key={d.key}>
                  <Link
                    href={d.href}
                    className="group flex h-full flex-col overflow-hidden rounded-xl bg-white ring-1 ring-[#E3E6E6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F8F8]">
                      {d.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                      <span className="text-sm font-semibold group-hover:text-[#007185]">{d.name}</span>
                      <span className="text-xs tabular-nums text-[#565959]">{d.count}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ranked by real discount off MRP */}
        {biggestDrops.length > 0 && (
          <section aria-labelledby="price-drops" className="rounded-2xl bg-white p-5 ring-1 ring-[#E3E6E6] sm:p-8">
            <div id="price-drops">
              <SectionTitle title="Furthest below MRP" />
            </div>
            <p className="-mt-3 mb-5 text-sm text-[#565959]">Ranked by how far today&apos;s price is below the printed MRP.</p>
            <ol className="divide-y divide-[#E3E6E6]">
              {biggestDrops.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`} className="group grid grid-cols-[2.5rem_4rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[3rem_5rem_minmax(0,1fr)_auto] sm:gap-5">
                    <span className="font-brand text-3xl font-semibold tabular-nums text-[#D5D9D9] [font-stretch:75%]">{i + 1}</span>
                    <span className="aspect-square overflow-hidden rounded-lg bg-[#F7F8F8]">
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[#565959]">{p.brand}</span>
                      <span className="line-clamp-2 text-sm leading-snug group-hover:text-[#007185] sm:line-clamp-1">{p.title}</span>
                      <span className="mt-0.5 block text-sm">
                        <span className="font-semibold tabular-nums">{inr(p.price)}</span>{' '}
                        <s className="text-xs tabular-nums text-[#565959]">{inr(p.mrp)}</s>
                      </span>
                    </span>
                    <span className="font-brand text-3xl font-bold tabular-nums text-[#B12704] [font-stretch:75%] sm:text-4xl">
                      −{savePct(p)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* First order coupon and selling */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-6 ring-1 ring-[#E3E6E6] sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="font-brand text-3xl font-semibold leading-none [font-stretch:80%] sm:text-4xl">10% off your first order</h2>
              <p className="mt-2 max-w-md text-sm text-[#565959]">
                On orders of ₹1,499 or more, up to ₹1,000 off. Enter the code at checkout.
              </p>
            </div>
            <CopyCode code="VYNTRAFIRST" />
          </div>
          <Link
            href="/become-seller"
            className="group flex items-center gap-5 rounded-2xl bg-[#131921] p-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185] sm:p-8"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFD814] text-[#0F1111]">
              <Store className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-brand text-3xl font-semibold leading-none [font-stretch:80%] group-hover:text-[#FFD814]">Sell on Vyntra</span>
              <span className="mt-2 block text-sm text-white/75">List your products and reach shoppers across India.</span>
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
