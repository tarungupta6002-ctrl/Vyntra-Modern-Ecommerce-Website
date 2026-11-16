/**
 * ==============================================================================
 * VYNTRA COURIER TRACKING UTILITY
 * ==============================================================================
 *
 * Safely generates authentic tracking URLs for recognized Indian logistics partners.
 * Avoids fake tracking data, mock events, or fabricated URLs.
 * Returns null if tracking details are missing or the carrier is unrecognized.
 */

export interface CourierInfo {
  name: string;
  trackingUrl: string | null;
  isRecognized: boolean;
}

export function getCourierTrackingUrl(
  courierName?: string | null,
  trackingNumber?: string | null
): string | null {
  if (!trackingNumber || typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
    return null;
  }
  if (!courierName || typeof courierName !== 'string' || !courierName.trim()) {
    return null;
  }

  const cleanCourier = courierName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanAwb = encodeURIComponent(trackingNumber.trim());

  // 1. Delhivery
  if (cleanCourier.includes('delhivery')) {
    return `https://www.delhivery.com/track/package/${cleanAwb}`;
  }

  // 2. Blue Dart
  if (cleanCourier.includes('bluedart')) {
    return `https://www.bluedart.com/tracking?trackFor=0&trackNo=${cleanAwb}`;
  }

  // 3. DTDC
  if (cleanCourier.includes('dtdc')) {
    return `https://www.dtdc.in/tracking/shipment-tracking.asp?trType=awb&strCnno=${cleanAwb}`;
  }

  // 4. Xpressbees
  if (cleanCourier.includes('xpressbee')) {
    return `https://www.xpressbees.com/shipment/tracking?awbNo=${cleanAwb}`;
  }

  // 5. Shadowfax
  if (cleanCourier.includes('shadowfax')) {
    return `https://tracker.shadowfax.in/#/track?awb=${cleanAwb}`;
  }

  // 6. Ekart
  if (cleanCourier.includes('ekart')) {
    return `https://ekartlogistics.com/shipmenttrack/${cleanAwb}`;
  }

  // 7. India Post / Speed Post
  if (cleanCourier.includes('indiapost') || cleanCourier.includes('speedpost')) {
    return 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
  }

  // 8. Trackon
  if (cleanCourier.includes('trackon')) {
    return `https://trackon.in/tracking?awb=${cleanAwb}`;
  }

  return null;
}
