import { json } from '@/lib/api';
import { hasValidSession } from '@/lib/auth';

export async function GET() {
  return json({ authenticated: await hasValidSession() });
}
