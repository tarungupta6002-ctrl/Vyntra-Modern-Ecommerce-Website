/**
 * Vyntra Marketplace - Return, Refund, Replacement & Dispute Policy Configuration
 * 
 * Centralized business policy invariants for India-focused luxury & artisanal marketplace.
 */

export const DEFAULT_RETURN_WINDOW_DAYS = 7;
export const DEFAULT_DISPUTE_WINDOW_DAYS = 5;

/**
 * Categories strictly non-returnable for customer preference/change of mind.
 * Note: Statutory seller-fault remedies (damaged, defective, wrong item) remain available.
 */
export const NON_RETURNABLE_CATEGORY_SLUGS = new Set<string>([
  'innerwear',
  'mens-innerwear',
  'womens-innerwear',
  'swimwear',
  'womens-swimwear',
  'pierced-jewellery',
  'pierced-jewelry', // Canonical alias
  'perfumery',
  'customized-apparel',
  'opened-personal-hygiene',
  'personal-hygiene',
  'opened-cosmetics',
  'cosmetics',
  'fresh-food',
  'perishable-food',
  'food-grocery',
  'opened-supplements',
  'supplements',
  'digital-products',
  'gift-cards',
]);

/**
 * Reasons indicating seller / transit / catalog fault.
 * Eligible for: Product Refund + Pro-rata/Full Shipping & Packaging Refund OR Replacement.
 * Reverse shipping liability: Seller bears 100%.
 */
export const SELLER_FAULT_REASONS = new Set<string>([
  'DAMAGED_ON_ARRIVAL',
  'DEFECTIVE',
  'WRONG_ITEM',
  'NOT_AS_DESCRIBED',
]);

/**
 * Reasons indicating customer change of mind, fit, or preference.
 * Eligible for: Exchange Only on eligible categories. Non-returnable on restricted categories.
 * No cash refund on ordinary change of mind.
 * Reverse shipping liability: Seller bears 100% (customer is never charged reverse logistics fee).
 */
export const PREFERENCE_REASONS = new Set<string>([
  'SIZE_FIT_ISSUE',
  'BUYER_REMORSE',
  'QUALITY_NOT_EXPECTED',
]);

/**
 * Checks whether a category slug (or alias) is non-returnable for preference reasons.
 */
export function isNonReturnableCategory(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const cleanSlug = slug.toLowerCase().trim();
  
  // Direct match in canonical set
  if (NON_RETURNABLE_CATEGORY_SLUGS.has(cleanSlug)) return true;
  
  // Check exact pierced jewellery variants (ensure non-pierced is NOT falsely matched)
  if (cleanSlug.includes('non-pierced')) return false;
  if (cleanSlug.includes('pierced-jewel')) return true;
  if (cleanSlug.includes('innerwear')) return true;
  if (cleanSlug.includes('swimwear')) return true;
  if (cleanSlug.includes('perfum')) return true;
  if (cleanSlug.includes('customized')) return true;

  return false;
}

/**
 * Recursively inspects a category hierarchy (direct slug + all parents).
 */
export function isHierarchyNonReturnable(category: {
  slug: string;
  parent?: { slug: string; parent?: any } | null;
} | null | undefined): boolean {
  let curr = category;
  while (curr) {
    if (isNonReturnableCategory(curr.slug)) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

export interface EligibilityResult {
  isEligible: boolean;
  remedyAllowed: 'EXCHANGE_ONLY' | 'REFUND_OR_REPLACEMENT' | 'NONE';
  policyBadge: '7_DAY_RETURN' | 'EXCHANGE_ONLY' | 'NON_RETURNABLE' | 'MADE_TO_ORDER';
  reasonCode?: string;
  userMessage?: string;
}

/**
 * Comprehensive evaluator for return eligibility.
 */
export function evaluateItemReturnEligibility(params: {
  isCustomized: boolean;
  category: { slug: string; parent?: any } | null | undefined;
  deliveredAt: Date | null | undefined;
  currentDate?: Date;
  reason?: string;
}): EligibilityResult {
  const { isCustomized, category, deliveredAt, reason } = params;

  // 1. Customized / Made-to-order check
  if (isCustomized) {
    if (reason && SELLER_FAULT_REASONS.has(reason)) {
      return {
        isEligible: true,
        remedyAllowed: 'REFUND_OR_REPLACEMENT',
        policyBadge: 'MADE_TO_ORDER',
        userMessage: 'Customized / Made-to-Order product. Eligible for remedy due to verified seller/transit fault.',
      };
    }
    return {
      isEligible: false,
      remedyAllowed: 'NONE',
      policyBadge: 'MADE_TO_ORDER',
      reasonCode: 'CUSTOMIZED_PRODUCT_NON_RETURNABLE',
      userMessage: 'This is a bespoke or made-to-order item and cannot be returned or exchanged for change of mind.',
    };
  }

  // 2. Non-returnable category check
  const isRestrictedCategory = isHierarchyNonReturnable(category);
  if (isRestrictedCategory) {
    if (reason && SELLER_FAULT_REASONS.has(reason)) {
      return {
        isEligible: true,
        remedyAllowed: 'REFUND_OR_REPLACEMENT',
        policyBadge: 'NON_RETURNABLE',
        userMessage: 'Intimate/hygiene item eligible for statutory remedy due to verified seller/transit fault.',
      };
    }
    return {
      isEligible: false,
      remedyAllowed: 'NONE',
      policyBadge: 'NON_RETURNABLE',
      reasonCode: 'CATEGORY_NON_RETURNABLE',
      userMessage: 'This category is strictly non-returnable for change of mind or personal preference.',
    };
  }

  // 3. Delivered timestamp verification
  if (!deliveredAt) {
    return {
      isEligible: false,
      remedyAllowed: 'NONE',
      policyBadge: '7_DAY_RETURN',
      reasonCode: 'DELIVERY_TIMESTAMP_UNVERIFIED',
      userMessage: 'We could not confirm the delivery date for this item. Please contact Customer Service from Help & Support.',
    };
  }

  // 4. Standard Eligible Fashion/Marketplace item
  if (reason && PREFERENCE_REASONS.has(reason)) {
    return {
      isEligible: true,
      remedyAllowed: 'EXCHANGE_ONLY',
      policyBadge: 'EXCHANGE_ONLY',
      userMessage: 'Standard eligible item. Size or preference change is eligible for exchange only.',
    };
  }

  return {
    isEligible: true,
    remedyAllowed: 'REFUND_OR_REPLACEMENT',
    policyBadge: '7_DAY_RETURN',
    userMessage: 'Eligible for return, refund, or exchange within 7 calendar days of delivery.',
  };
}
