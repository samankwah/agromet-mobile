import { postJson } from './http';

export type ContactMessage = {
  name: string;
  subject: string;
  message: string;
  email?: string;
  phone?: string;
};

type ContactDto = { success?: boolean; message?: string; reference?: number };

/**
 * Sends a message from the Contact screen.
 *
 * The server validates this too (see `ContactMessageRequest` in
 * `backend/app/schemas.py`) — the client-side checks in `validateContactForm`
 * exist to tell someone what is wrong before they wait for a round trip, not
 * to be the only guard.
 */
export async function sendContactMessage(payload: ContactMessage): Promise<number | undefined> {
  const dto = await postJson<ContactDto>('/api/contact', {
    name: payload.name.trim(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
    // Omitted rather than sent empty: the server treats null as "no channel"
    // and '' would pass a presence check while being just as unusable.
    email: payload.email?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    source: 'mobile',
  });

  return dto?.reference;
}
