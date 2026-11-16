import { redirect } from 'next/navigation';

export default function VendorProductDetailPage({ params }: { params: { id: string } }) {
  redirect(`/vendor/products/${params.id}/edit`);
}
