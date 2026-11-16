import { redirect } from 'next/navigation';

export default function KidsShoesRedirectPage() {
  redirect('/category/womens-shoes?sub=kids-shoes');
}
