import { redirect } from 'next/navigation';

// next.config sends this URL to the same place; this page covers it if that rule is removed.
export default function Page() {
  redirect('/fashion/bags-luggage');
}
