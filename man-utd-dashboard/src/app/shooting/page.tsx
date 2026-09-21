import { redirect } from 'next/navigation';

export default function ShootingPage() {
  redirect('/attack?view=shooting');
}
