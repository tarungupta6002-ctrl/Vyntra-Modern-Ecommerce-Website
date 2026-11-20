# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary**: Everyday Indian online shoppers (both value-conscious and quality-conscious) looking for convenience, product variety, competitive pricing, and a trustworthy shopping experience across multiple retail categories.
- **Secondary (Vendors)**: Independent Indian sellers, brands, and businesses managing product listings, pricing, inventories, order fulfillment, and customer returns through a dedicated Vendor portal.
- **Internal (Admin)**: Marketplace operations and compliance team overseeing platform health, vendor verifications, catalog integrity, and shipment logistics.

## Product Purpose

Vyntra is an India-focused multi-vendor, multi-category e-commerce marketplace built to help everyday Indian consumers discover, compare, and purchase quality goods across diverse categories—including fashion, electronics, home, beauty, lifestyle, and more. Success means delivering a seamless, dependable end-to-end shopping journey with transparent pricing, genuine product information, secure payments, dependable fulfillment tracking, and accessible customer support.

## Positioning

Combines the breadth, competitive pricing, and multi-seller variety of a large-scale e-commerce marketplace with genuine trust and transparency:
- Supports independent sellers and brands while ensuring customers receive honest product specifications, verified reviews, and upfront pricing.
- Balances value and quality across all categories without degrading into hyper-discount bargain gimmicks or locking the brand into an exclusive single-category or luxury-only niche.
- Provides a consistent, dependable purchasing and post-purchase experience across every department.

## Operating Context

- **Three Distinct Marketplace Surfaces**:
  1. *Customer Storefront & Account*: Homepage discovery, multi-level category navigation, faceted search, product comparison, multi-seller offer selection, cart drawer, multi-address checkout, Razorpay payments, live tracking, order cancellation, and return requests.
  2. *Vendor Portal*: Vendor onboarding, comprehensive product management with tax/commission calculation, order dispatch, and dispute handling.
  3. *Admin Portal*: Marketplace-level oversight, vendor onboarding approvals, shipment status monitoring, and audit trails.
- **Indian Retail Environment**: Mobile-first usage patterns, Indian Standard Time (IST) deadlines, INR (₹) transactions, local 6-digit postal pincode delivery checks, and India-specific payment methods (UPI, cards, net banking).

## Capabilities and Constraints

- **Multi-Category Breadth**: Design and layouts must gracefully accommodate fashion, electronics, home essentials, beauty, and lifestyle products without skewing the site into a fashion-only boutique.
- **Technical Architecture**: Next.js 14.2.15 (App Router), React 18.3.1, TypeScript 5.6.3, Tailwind CSS, Prisma 5.22, Supabase SSR Auth, and Razorpay SDK integration.
- **Working Functionality Preservation**: Existing working features, API contracts, database schemas, and payment logic must remain intact.
- **Component Reuse**: Consistent reuse of established UI components, design patterns, and responsive layouts across all routes.

## Brand Commitments

- **Name**: Vyntra.
- **Brand Identity**: Preserve the existing Vyntra logo, approved typography, and brand theme.
- **Color Constraint**: Under no circumstances introduce purple as a primary brand color.
- **Improvement Approach**: Enhance through thoughtful critique, clarity, and precision refinement. Avoid gratuitous full redesigns or copying unrelated marketplace clones.

## Evidence on Hand

- Production-grade codebase with active Customer, Vendor, and Admin route trees (`src/app/`, `src/components/`, `src/store/`).
- Real category taxonomy, product specifications, and Indian postal pincode dataset (`src/data/`, `src/store/address-store.ts`).
- Comprehensive policy verification suites enforcing IST calendar arithmetic, 7-day return deadlines, and commission calculations (`scripts/test-return-policy-suite.cjs`).

## Product Principles

1. **India-First Reliability**: Tailor all pricing, address fields, delivery timelines, payment options, and legal disclosures directly to Indian consumer habits and regulatory standards.
2. **Multi-Category Versatility**: Keep visual containers, cards, and metadata neutral and adaptable so electronics, home goods, and apparel look equally cohesive and credible.
3. **Transparency over Gimmicks**: Give customers clear, unmanipulated information—accurate stock counts, transparent seller identity, verified customer reviews, and clear return policies without deceptive badges or false scarcity.
4. **Familiar Usability & Seamless Ergonomics**: Provide fast, frictionless search, filtering, and checkout flows that feel natural and responsive on both mobile touchscreens and desktop screens.
5. **Respect Incumbent Truth**: Refine, elevate, and strengthen existing features and design patterns rather than discarding working code or altering established user mental models.

## Accessibility & Inclusion

- Target WCAG AA compliance across all customer and merchant dashboards.
- Ensure minimum 44×44px interactive tap targets on mobile, accessible name labels for all icon controls, visible focus rings, and proper keyboard focus management for dialogs and drawers.
