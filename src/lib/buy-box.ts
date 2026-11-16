import { SellerOfferItem, BuyBoxResult } from '@/types/multiseller';

/**
 * Calculates a balanced, normalized Buy Box score for an offer.
 * Lower score = higher priority / better rank (Amazon-style multi-objective optimization).
 * 
 * Objectives:
 * 1. Price Delta (50% weight): Normalized percentage markup over the lowest market price.
 * 2. Delivery SLA (30% weight): Normalized dispatch & transit time relative to the fastest available delivery.
 * 3. Seller Rating (20% weight): Quality penalty for ratings below 5.0 stars (1.0 to 5.0 normalized scale).
 * 4. Verification Bonus: -5 score discount (boost) for verified artisan vendors.
 * 5. Out-of-Stock: Score = Infinity (strictly ineligible for winning the Buy Box).
 */
export function calculateBuyBoxScore(
  offer: SellerOfferItem,
  minPrice: number,
  minDeliveryDays: number
): number {
  if (offer.stock <= 0) {
    return Infinity; // Out-of-stock offers can never win the Buy Box
  }

  // 1. Price factor (0 - 50 points penalty):
  // 0 penalty if matching lowest market price; scales proportionally with markup
  const priceDeltaRatio = minPrice > 0 ? (offer.sellingPrice - minPrice) / minPrice : 0;
  const priceScore = Math.min(100, Math.max(0, priceDeltaRatio * 50));

  // 2. Delivery SLA factor (0 - 30 points penalty):
  // 0 penalty if matching the fastest available delivery; scales with extra days
  const deliveryDays = offer.estimatedDeliveryDays ?? (offer.handlingDays !== undefined ? offer.handlingDays + 2 : 3);
  const deliveryDeltaRatio = minDeliveryDays > 0 ? (deliveryDays - minDeliveryDays) / minDeliveryDays : 0;
  const deliveryScore = Math.min(30, Math.max(0, deliveryDeltaRatio * 30));

  // 3. Seller rating factor (0 - 20 points penalty):
  // 5.0 stars = 0 penalty; 4.0 stars = 5 penalty; 1.0 star = 20 penalty
  const sellerRating = Math.max(1.0, Math.min(5.0, offer.vendor.rating ?? 5.0));
  const ratingPenalty = ((5.0 - sellerRating) / 4.0) * 20;

  // 4. Verification bonus: -5 points discount (lower score is better, so subtraction rewards verified vendors)
  const verificationBonus = offer.vendor.isVerified ? -5.0 : 0.0;

  return priceScore + deliveryScore + ratingPenalty + verificationBonus;
}

/**
 * Deterministic multi-stage comparator for tie-breaking Buy Box scores.
 * Guarantees zero order-dependent jitter across re-renders.
 */
export function compareBuyBoxOffers(a: SellerOfferItem, b: SellerOfferItem): number {
  const scoreA = a.score ?? Infinity;
  const scoreB = b.score ?? Infinity;

  // Primary: Lowest Buy Box score
  if (Math.abs(scoreA - scoreB) > 0.0001) {
    return scoreA - scoreB;
  }

  // Tie-breaker 1: Lower selling price
  if (a.sellingPrice !== b.sellingPrice) {
    return a.sellingPrice - b.sellingPrice;
  }

  // Tie-breaker 2: Higher seller rating
  const ratingA = a.vendor.rating ?? 0;
  const ratingB = b.vendor.rating ?? 0;
  if (Math.abs(ratingA - ratingB) > 0.001) {
    return ratingB - ratingA;
  }

  // Tie-breaker 3: Faster estimated delivery
  const delA = a.estimatedDeliveryDays ?? (a.handlingDays !== undefined ? a.handlingDays + 2 : 3);
  const delB = b.estimatedDeliveryDays ?? (b.handlingDays !== undefined ? b.handlingDays + 2 : 3);
  if (delA !== delB) {
    return delA - delB;
  }

  // Tie-breaker 4: Verified vendor priority
  if (Boolean(a.vendor.isVerified) !== Boolean(b.vendor.isVerified)) {
    return a.vendor.isVerified ? -1 : 1;
  }

  // Tie-breaker 5: Deterministic lexicographical ID
  return a.id.localeCompare(b.id);
}

/**
 * Resolves the Buy Box winner and ranked alternative seller offers.
 */
export function resolveBuyBox(offers: SellerOfferItem[]): BuyBoxResult | null {
  if (!offers || offers.length === 0) {
    return null;
  }

  const allPrices = offers.map((o) => o.sellingPrice);
  const lowestPrice = Math.min(...allPrices);
  const highestPrice = Math.max(...allPrices);

  // In-stock pool vs all offers fallback
  const inStockOffers = offers.filter((o) => o.stock > 0);
  const eligiblePool = inStockOffers.length > 0 ? inStockOffers : offers;

  // Calculate minimums across the eligible pool
  const minEligiblePrice = Math.min(...eligiblePool.map((o) => o.sellingPrice));
  const minDeliveryDays = Math.min(
    ...eligiblePool.map((o) => o.estimatedDeliveryDays ?? (o.handlingDays !== undefined ? o.handlingDays + 2 : 3))
  );

  // Score each offer
  const scoredOffers = offers.map((offer) => ({
    ...offer,
    score: calculateBuyBoxScore(offer, minEligiblePrice, minDeliveryDays),
  }));

  // Sort by deterministic comparator
  scoredOffers.sort(compareBuyBoxOffers);

  const winner = { ...scoredOffers[0], isBuyBoxWinner: scoredOffers[0].stock > 0 };

  // Other offers sorted by price ascending for clear comparison
  const otherOffers = scoredOffers.slice(1).map((o) => ({
    ...o,
    isBuyBoxWinner: false,
  }));
  otherOffers.sort((a, b) => {
    if (a.sellingPrice !== b.sellingPrice) {
      return a.sellingPrice - b.sellingPrice;
    }
    return (b.vendor.rating ?? 0) - (a.vendor.rating ?? 0);
  });

  return {
    winner,
    otherOffers,
    totalOffersCount: offers.length,
    lowestPrice,
    highestPrice,
  };
}
