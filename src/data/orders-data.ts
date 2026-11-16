export interface OrderItem {
  id: string;
  productId: string;
  title: string;
  brand: string;
  categoryTag: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  originalPrice: number;
  discount: string;
  image: string;
  sellerName: string;
  shippingMethod: string;
  status?: string;
  hasReviewed?: boolean;
  review?: {
    id: string;
    rating: number;
    status?: string;
  } | null;
  returnRequest?: {
    id: string;
    type: string;
    status: string;
    reason: string;
    createdAt: string;
    isDisputed?: boolean;
    disputeResolution?: string | null;
    rejectedAt?: string | null;
    qcCompletedAt?: string | null;
    vendorNotes?: string | null;
  } | null;
}

export interface TrackingCheckpoint {
  id: number;
  title: string;
  timestamp: string;
  location?: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  badge?: string;
}

export interface DeliveryAgent {
  name: string;
  initials: string;
  phone: string;
  rating: number;
  deliveriesCount: string;
  verified: boolean;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  cityStateZip: string;
  phone: string;
}

export interface LiveTransitCoordinates {
  vanLocation: string;
  progressPercent: number;
  startHub: string;
  remainingStops: string;
  destination: string;
}

export interface BillingBreakdown {
  mrpTotal: number;
  itemsTotal: number;
  courierFeeText: string;
  authenticityFeeText: string;
  totalPaid: number;
  paymentMode: string;
  paymentBadge: string;
}

export interface VendorShipment {
  id: string;
  sellerName: string;
  status: string;
  courier: string;
  awb: string;
  estimatedArrival: string;
  itemIds: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  datePlaced: string;
  placedTime?: string;
  totalAmount: number;
  totalItems: number;
  status: 'shipped' | 'processing' | 'delivered' | 'cancelled' | 'out_for_delivery';
  statusLabel: string;
  expectedDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  courierName?: string;
  courierPartner?: string;
  courierTier?: string;
  rawStatus?: string;
  subtotal?: number;
  discount?: number;
  awb?: string;
  latestScan?: string;
  stepperProgress?: number; // 0-100
  items: OrderItem[];
  customerRating?: number;
  returnWindowDaysLeft?: number;
  isReturnEligible?: boolean;
  cancellationReason?: string;
  refundStatus?: string;
  refundAmount?: number;
  refundedAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingFee?: number;
  tax?: number;
  refundMode?: string;
  refundRef?: string;
  refundTransactions?: Array<{
    id: string;
    amount: number;
    mode: string;
    referenceNumber?: string | null;
    status: string;
    processedAt?: string | null;
    createdAt?: string;
  }>;
  // Live Tracking Specific Fields (Google Stitch screen 1087263f59274f67b20050ae76c3aee3)
  otp?: string;
  deliveryAgent?: DeliveryAgent;
  shippingAddress?: ShippingAddress;
  liveCoordinates?: LiveTransitCoordinates;
  checkpoints?: TrackingCheckpoint[];
  billingBreakdown?: BillingBreakdown;
  authenticitySeal?: string;
  shipments?: VendorShipment[];
  vendorShipments?: Array<{
    id: string;
    shipmentNumber: string;
    status: string;
    courierPartner?: string | null;
    trackingNumber?: string | null;
    subtotal: number;
    shippingFee: number;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    vendor?: { id: string; storeName: string; storeSlug?: string };
    itemsCount?: number;
  }>;
}

/**
 * DEMO ORDER DATA
 * Note: These are frontend mock records reflecting Stitch Screen f7784c194e164a4cb5b394cae7120e1c
 * and Live Tracking Screen 1087263f59274f67b20050ae76c3aee3.
 * They are clearly isolated for future logistics APIs (BlueDart/Delhivery/Shiprocket) & ERP webhook integrations.
 */
export const DEMO_ORDERS: Order[] = [
  {
    id: 'VYN-ORD-91044',
    orderNumber: '#VYN-ORD-91044',
    datePlaced: '11 Nov 2025',
    placedTime: '03:42 PM',
    totalAmount: 6450,
    totalItems: 2,
    status: 'processing',
    statusLabel: 'Packing in Progress — Eligible for 1-Click Instant Cancellation',
    expectedDate: 'Tomorrow, 12 Nov 2025 by 2:00 PM',
    courierName: 'BlueDart Express Priority Air',
    courierTier: 'ROYAL AIR PRIORITY',
    trackingNumber: 'BLU-91044-EXP',
    awb: 'BLU-91044-EXP',
    latestScan: 'Bengaluru Central Fulfillment Atelier (Packaging)',
    stepperProgress: 35,
    otp: '5912',
    deliveryAgent: {
      name: 'Rajesh Kumar',
      initials: 'RK',
      phone: '+91 98765 00123',
      rating: 4.9,
      deliveriesCount: '1,850+ Deliveries',
      verified: true,
    },
    shippingAddress: {
      name: 'Arya Sharma',
      line1: 'Apartment #402, 4th Floor, Palm Grove Heights',
      line2: '12th Main Road, HAL 2nd Stage, Indiranagar',
      cityStateZip: 'Bengaluru, Karnataka — 560001',
      phone: '+91 99018 44291',
    },
    billingBreakdown: {
      mrpTotal: 10250,
      itemsTotal: 6450,
      courierFeeText: 'FREE (Complimentary Royal Air)',
      authenticityFeeText: 'Complimentary',
      totalPaid: 6450,
      paymentMode: 'HDFC Regalia Credit Card (Ending 4012)',
      paymentBadge: '100% PREPAID',
    },
    items: [
      {
        id: 'item-91044-1',
        productId: 'VYN-JKT-882',
        title: 'Raw Silk Nehru Jacket',
        brand: 'Vyntra Royal Atelier',
        categoryTag: 'Festive Couture',
        size: '40 (M)',
        color: 'Ivory & Antique Gold Handloom',
        quantity: 1,
        price: 5250,
        originalPrice: 8750,
        discount: '40% Off Festive',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBCLkYaIifxsgs__ep7vB4TvUMhhETr8oHAbzUYzGBBHLpVdshRndQgnGqnBOVzcAoRFxtxjv3WAhm1bRNyMncUlHgqOQtgk4mFLjMfx9aJExDtrEHTEtOjph0dD3w9OXfLZWslUp_5gx98G_aztiGufgbOo5JiN4iRQf0X06vhO9lpVvJrEtGkl3rhceWUhoPj9yvhCjPAnkfSilMw1NaqShew84LLJ-gXqquoH1M',
        sellerName: 'Vyntra Royal Atelier',
        shippingMethod: 'BlueDart Express Air',
      },
      {
        id: 'item-91044-2',
        productId: 'VYN-ACC-104',
        title: 'Handcrafted Pure Zari Pocket Square',
        brand: 'Benaras Weaves',
        categoryTag: 'Royal Accessories',
        size: 'Free Size',
        color: 'Royal Amber & Gold Brocade Weave',
        quantity: 1,
        price: 1200,
        originalPrice: 1500,
        discount: '20% OFF',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAadr1imOH6AoGrgZH5cA9IlqtyM0jnPHUqoQfM2iesPX0OO0vI4cMqUVExHzbPIq6NQgVjuPEVIvGoRHk0QMD6ZDGxl_8YySl7yHgzs_p5YdelHK7lbW8uVYMqXGWHjIeStE-2HHISL3_NGvcqNvs1qOPAIipinecUnrk7APgDdn7rqybXf17CskqrQHIGiIgdpwGk6v29tvkPfgBfRAJXM4KbnZ9U_21cGBGMbmk',
        sellerName: 'Benaras Artisan Guild',
        shippingMethod: 'BlueDart Express Air',
      },
    ],
  },
  {
    id: 'VYN-928410',
    orderNumber: '#VYN-928410',
    datePlaced: '22 Oct 2024',
    placedTime: '09:14 AM',
    totalAmount: 3559,
    totalItems: 2,
    status: 'shipped',
    statusLabel: 'Out for Delivery — Arriving Today by 2:00 PM',
    expectedDate: 'Today, 24 Oct 2024 by 2:00 PM',
    courierName: 'BlueDart Express Premium Air',
    courierTier: 'AIR PRIORITY TIER',
    trackingNumber: 'BLU-928410294BD',
    awb: 'BLU-928410294BD',
    latestScan: 'Indiranagar Hub, Bengaluru (Out for delivery)',
    stepperProgress: 84,
    otp: '4829',
    deliveryAgent: {
      name: 'Ramesh Kumar',
      initials: 'RK',
      phone: '+91 98450 92210',
      rating: 4.9,
      deliveriesCount: '1,420+ Deliveries',
      verified: true,
    },
    shippingAddress: {
      name: 'Valued Patron',
      line1: 'Apartment #402, 4th Floor, Palm Grove Heights',
      line2: '12th Main Road, HAL 2nd Stage, Indiranagar',
      cityStateZip: 'Bengaluru, Karnataka — 560001',
      phone: '+91 99018 44291',
    },
    liveCoordinates: {
      vanLocation: '100 Feet Rd (0.8 km away)',
      progressPercent: 84,
      startHub: 'Indiranagar Hub',
      remainingStops: '2 Stops Remaining',
      destination: 'Palm Grove Hts',
    },
    checkpoints: [
      {
        id: 7,
        title: '7. Parcel Delivered',
        timestamp: 'Estimated 02:00 PM',
        description: 'Package handed over to recipient with OTP confirmation.',
        status: 'upcoming',
      },
      {
        id: 6,
        title: '6. Out for Delivery',
        timestamp: 'Today, 08:35 AM',
        location: 'Indiranagar Delivery Hub',
        description:
          'Package out with courier executive Ramesh Kumar. Shipment loaded onto electric delivery vehicle #KA-03-EK-9102. Estimated drop off between 1:00 PM - 2:00 PM.',
        status: 'current',
        badge: 'Contactless delivery enabled',
      },
      {
        id: 5,
        title: '5. Dispatched to Local Delivery Center',
        timestamp: '24 Oct, 06:10 AM',
        location: 'Indiranagar Delivery Hub, Bengaluru',
        description: 'Bag unsealed, sorted for destination pin 560001 route run.',
        status: 'completed',
      },
      {
        id: 4,
        title: '4. Arrived at Regional Airport Hub',
        timestamp: '23 Oct, 09:40 PM',
        location: 'Bengaluru Central Air Hub, Devanahalli',
        description: 'Transferred from Cargo Flight BD-814 via automated airsort conveyor.',
        status: 'completed',
      },
      {
        id: 3,
        title: '3. Dispatched via BlueDart Express',
        timestamp: '23 Oct, 08:15 AM',
        location: 'Jaipur Sorting Center, Rajasthan',
        description: 'Air waybill BLU-928410294BD manifested and loaded into linehaul pallet.',
        status: 'completed',
      },
      {
        id: 2,
        title: '2. Crafted & Packed by Artisan',
        timestamp: '22 Oct, 04:30 PM',
        location: 'Vyntra Atelier, Sanganer Workshop, Jaipur',
        description: 'Quality inspected, scented lavender tissue wrap applied with tamper-evident seal #VT-4882.',
        status: 'completed',
      },
      {
        id: 1,
        title: '1. Order Placed & Confirmed',
        timestamp: '22 Oct, 09:14 AM',
        location: 'Payment Verified via UPI (Razorpay)',
        description: 'Order routed to master weavers and apparel craftsmen.',
        status: 'completed',
      },
    ],
    billingBreakdown: {
      mrpTotal: 6798,
      itemsTotal: 3559,
      courierFeeText: 'FREE (Express Air)',
      authenticityFeeText: 'Complimentary',
      totalPaid: 3559,
      paymentMode: 'Razorpay UPI (Axis Bank)',
      paymentBadge: '100% PREPAID',
    },
    authenticitySeal: '#RJ-VYN-928410',
    shipments: [
      {
        id: 'SHP-928410-1',
        sellerName: 'Vyntra Atelier (Jaipur)',
        status: 'Out for Delivery',
        courier: 'BlueDart Express Air',
        awb: 'BLU-928410294BD-A',
        estimatedArrival: 'Today by 2:00 PM',
        itemIds: ['item-928410-1'],
      },
      {
        id: 'SHP-928410-2',
        sellerName: 'Rooh Handicrafts',
        status: 'Out for Delivery',
        courier: 'BlueDart Express Air',
        awb: 'BLU-928410294BD-B',
        estimatedArrival: 'Today by 2:00 PM',
        itemIds: ['item-928410-2'],
      },
    ],
    items: [
      {
        id: 'item-928410-1',
        productId: 'VYN-LNN-8402',
        title: 'Handcrafted Premium Linen Kurta & Tapered Trouser Set',
        brand: 'Vyntra Atelier',
        categoryTag: 'Festive Couture',
        size: 'M',
        color: 'Sapphire Blue',
        quantity: 1,
        price: 1899,
        originalPrice: 3799,
        discount: '50% OFF',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAqIIeaIMaKSD_dbiOeeO-hfJYyMwZiOJkoLlZ1MlF8lEThAA5wBgHj-b7oGsQDi35W49dENtcO3gpf6CyrdDZ1oHeeBlyaaA3lk9SLNZ0ICfIgYGXlaiXDpLUU5EhDsnjWjK2WN3_7dD_L9y8oyd8GY1a-_3Wb-yz_PUaQ4fdYwFTOZ0Lgb318_jAX_NIZPIl38kuMi-67cfwuOjUFcY6SSCivtXb-NtRvnGOpBcg',
        sellerName: 'Vyntra Atelier (Jaipur)',
        shippingMethod: 'Express Air Courier',
      },
      {
        id: 'item-928410-2',
        productId: 'VYN-NIC-201',
        title: 'Chanderi Silk Indigo Overlay Tunic',
        brand: 'Rooh Handicrafts',
        categoryTag: 'Heritage Weaves',
        size: 'L',
        color: 'Indigo & Zari',
        quantity: 1,
        price: 1660,
        originalPrice: 2999,
        discount: '44% OFF',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBl2yG3a8zQx9Ey0o_rAncsx9xzmrPeLeqpx5Gq_vnIwRDrosPL8ZyWRf4VdpWbXoDsIv7_qz6llxfsZ6mJ1GBoBBy08tqZOXxS98SX2Uh9Dye2sD_NQnP5K26Ge6YO0rV2boTsf2aiglr4cddJ81agKvcnOk9VMMIt69f9pYGkpX2TmkhtyX_Lt_GrW5Bp50GFmORwatBZzAA3iqvfxnSTLEM3kUs1QwDFDgzCAyQ',
        sellerName: 'Rooh Handicrafts',
        shippingMethod: 'Express Air Courier',
      },
    ],
  },
  {
    id: 'VYN-881024',
    orderNumber: '#VYN-881024',
    datePlaced: '14 Oct 2024',
    placedTime: '11:20 AM',
    deliveredDate: '17 Oct 2024',
    totalAmount: 4198,
    totalItems: 1,
    status: 'delivered',
    statusLabel: 'Delivered on 17 Oct 2024',
    courierName: 'Express Courier Air',
    courierTier: 'STANDARD LUXURY TIER',
    trackingNumber: 'EXP-8810247712EX',
    awb: '8810247712EX',
    latestScan: 'Delivered at Indiranagar, Bengaluru',
    stepperProgress: 100,
    customerRating: 4.9,
    returnWindowDaysLeft: 3,
    shippingAddress: {
      name: 'Valued Patron',
      line1: 'Apartment #402, 4th Floor, Palm Grove Heights',
      line2: '12th Main Road, HAL 2nd Stage, Indiranagar',
      cityStateZip: 'Bengaluru, Karnataka — 560001',
      phone: '+91 99018 44291',
    },
    checkpoints: [
      {
        id: 4,
        title: '4. Parcel Delivered',
        timestamp: '17 Oct, 02:45 PM',
        location: 'Indiranagar, Bengaluru',
        description: 'Successfully handed over to resident with OTP verification.',
        status: 'completed',
      },
      {
        id: 3,
        title: '3. Out for Delivery',
        timestamp: '17 Oct, 09:10 AM',
        location: 'Bengaluru Central Hub',
        description: 'Assigned to delivery associate Suresh Patel.',
        status: 'completed',
      },
      {
        id: 2,
        title: '2. In Transit via Express Air',
        timestamp: '15 Oct, 07:30 PM',
        location: 'Mumbai Air Cargo Terminal',
        description: 'Direct flight transit to Bengaluru Devanahalli.',
        status: 'completed',
      },
      {
        id: 1,
        title: '1. Order Confirmed & Dispatched',
        timestamp: '14 Oct, 11:20 AM',
        location: 'Kolhapur Heritage Workshop',
        description: 'Artisanal footwear packed with certificates of authenticity.',
        status: 'completed',
      },
    ],
    billingBreakdown: {
      mrpTotal: 5999,
      itemsTotal: 4198,
      courierFeeText: 'FREE (Standard Air)',
      authenticityFeeText: 'Complimentary',
      totalPaid: 4198,
      paymentMode: 'HDFC Credit Card (Ending 4019)',
      paymentBadge: '100% PREPAID',
    },
    authenticitySeal: '#KL-VYN-881024',
    items: [
      {
        id: 'item-881024-1',
        productId: 'VYN-KOL-901',
        title: 'Hand-Braided Leather Kolhapuri Slippers & Raw Silk Stole',
        brand: 'Kolhapur Heritage & Benaras Weaves',
        categoryTag: 'Exclusive Artisanal Duo',
        size: 'EU 42 / Free Size',
        color: 'Tan Brown & Ivory',
        quantity: 1,
        price: 4198,
        originalPrice: 5999,
        discount: '30% OFF',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCJhvaeyjBiAqQ6uWFUtQuOw5vlYtqq7a-khcH9Vjk8YwzsaC_xKGe4LVIsXuZIC0s7W_49m0peR_jJn5PRIFurVPRW4CsPvAV0zUu3pdc_TBnSE7XWv79Ww2wNNCrtNT0EosNu6DV6nq1PFS7dI6GtI0lqQErBJcEO6EkKRwPFn224viNWzQ7qTDX16ijOhdcV0WTOzXJ49Fsnbj20i-IISMuvBlwerY7HQaTq61Q',
        sellerName: 'Kolhapur Heritage Collective',
        shippingMethod: 'Express Courier Air',
      },
    ],
  },
  {
    id: 'VYN-772910',
    orderNumber: '#VYN-772910',
    datePlaced: '02 Sep 2024',
    placedTime: '04:15 PM',
    totalAmount: 1299,
    totalItems: 1,
    status: 'cancelled',
    statusLabel: 'Cancelled by Customer — 100% Refunded',
    cancellationReason: 'Selected wrong size variant',
    refundStatus: 'Refund Completed',
    refundAmount: 1299,
    refundMode: 'UPI (GPay)',
    refundRef: 'VYN-RF-4412',
    stepperProgress: 0,
    checkpoints: [
      {
        id: 3,
        title: '3. Refund Successfully Credited',
        timestamp: '03 Sep, 10:15 AM',
        location: 'NPCI UPI Network',
        description: 'Amount ₹1,299 refunded back to source bank account via GPay UPI (Ref: VYN-RF-4412).',
        status: 'completed',
      },
      {
        id: 2,
        title: '2. Cancellation Approved',
        timestamp: '02 Sep, 05:40 PM',
        location: 'Vyntra Care Concierge',
        description: 'Customer requested order cancellation prior to consignment packing.',
        status: 'completed',
      },
      {
        id: 1,
        title: '1. Order Placed',
        timestamp: '02 Sep, 04:15 PM',
        location: 'Online Payment (Razorpay)',
        description: 'Order initiated for Organic Cotton Chanderi Dupatta.',
        status: 'completed',
      },
    ],
    billingBreakdown: {
      mrpTotal: 1999,
      itemsTotal: 1299,
      courierFeeText: 'FREE',
      authenticityFeeText: 'Complimentary',
      totalPaid: 1299,
      paymentMode: 'UPI (GPay)',
      paymentBadge: '100% REFUNDED',
    },
    items: [
      {
        id: 'item-772910-1',
        productId: 'VYN-DUP-301',
        title: 'Organic Cotton Chanderi Dupatta',
        brand: 'Chanderi Artisan Guild',
        categoryTag: 'Handloom Classic',
        size: '2.5m Length',
        color: 'Blush Crimson',
        quantity: 1,
        price: 1299,
        originalPrice: 1999,
        discount: '35% OFF',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDM89yD0nlQPBF1Pjrr6wy6wrFFIT8A5Nk_286ay2XH_G-IyC6d6tnUo1Kz_5xS0JEMDJSVbRQu8UFJrxY0yDDimXNwN1V87xbMQi0M8FnKZ6xZLdFHMlPIId-R7NGBbT4S73EdMapqXbDmvOpUNOmnipT4MEz4GOZS3tuocoSBl3imvr74nriSkFqrVdRQmpiFpqnyOljgF2Lu1WdVDkgZh_V1tsZFKyPweNYVfss',
        sellerName: 'Chanderi Handloom Guild',
        shippingMethod: 'Standard Ground',
      },
    ],
  },
];

/**
 * Lookup helper: finds an order by order ID, orderNumber, AWB, or trackingNumber.
 */
export function getOrderByTrackingOrId(identifier: string): Order | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toLowerCase().replace(/^#/, '');
  return DEMO_ORDERS.find((o) => {
    const idMatch = o.id.toLowerCase() === clean;
    const numMatch = o.orderNumber.toLowerCase().replace(/^#/, '') === clean;
    const awbMatch = o.awb?.toLowerCase() === clean;
    const trkMatch = o.trackingNumber?.toLowerCase() === clean;
    return idMatch || numMatch || awbMatch || trkMatch;
  });
}
