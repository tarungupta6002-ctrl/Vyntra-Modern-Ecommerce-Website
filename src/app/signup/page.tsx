import { redirect } from 'next/navigation';

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const dest = searchParams?.redirect
    ? `/login?mode=signup&redirect=${encodeURIComponent(searchParams.redirect)}`
    : '/login?mode=signup';
  redirect(dest);
}
