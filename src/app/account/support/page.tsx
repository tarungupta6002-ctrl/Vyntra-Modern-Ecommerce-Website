import { redirect } from 'next/navigation';

export default function AccountSupportPage() {
  redirect('/account?tab=support');
}
