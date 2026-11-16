import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saved Delivery Addresses & Preferences — VYNTRA',
  description: 'Manage your delivery locations and doorstep instructions on Vyntra.',
};

export default function AddressesPage() {
  redirect('/account?tab=addresses');
}
