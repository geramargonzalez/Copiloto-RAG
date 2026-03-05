import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { ChatClient } from '../../components/chat-client';
import { authOptions } from '../../lib/auth';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  return <ChatClient apiToken={session.apiToken} userId={session.user.id} role={session.user.role} />;
}
