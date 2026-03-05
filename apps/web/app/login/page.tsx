import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { LoginForm } from '../../components/login-form';
import { authOptions } from '../../lib/auth';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/chat');
  }

  return (
    <main className="shell">
      <LoginForm />
    </main>
  );
}
