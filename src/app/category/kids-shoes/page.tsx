import { redirect } from 'next/navigation';

export default function KidsShoesPage() {
  redirect('/category/shoes?subcategory=kids-shoes');
}
