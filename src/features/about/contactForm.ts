/**
 * Validation for the Contact form.
 *
 * A pure function, separate from the screen, so the rules have one tested home
 * — the same split `scaleTypeScale` and `reminderSchedule` use. The server
 * validates independently (`ContactMessageRequest` in `backend/app/schemas.py`);
 * this exists to answer someone before they wait on a round trip.
 */

export type ContactFields = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactFields | 'contact', string>>;

export const EMPTY_CONTACT: ContactFields = { name: '', email: '', phone: '', subject: '', message: '' };

/**
 * Deliberately permissive: one `@` with something either side and no spaces.
 *
 * A stricter pattern rejects addresses that are perfectly valid — plus tags,
 * long TLDs, non-ASCII local parts — and the cost of a false rejection here is
 * that someone cannot report a problem at all. The server does the real check.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Digits plus the punctuation people actually type, and at least 9 digits.
 *
 * Deliberately loose about shape and strict only about substance. Ghanaian
 * numbers get written `024 123 4567`, `+233 24 123 4567`, `(024) 123-4567` and
 * `024-123-4567`, and every one of those is the same number. The count of digits
 * is the only thing that distinguishes a phone number from a typo — an earlier
 * version of this anchored the first character and silently rejected the
 * bracketed form, which is the kind of false rejection nobody reports because
 * the person simply gives up.
 */
function looksLikePhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  // A leading + is fine; one anywhere else is not a phone number.
  if (value.slice(1).includes('+')) return false;

  const digits = value.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15; // E.164 caps at 15.
}

export function validateContactForm(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {};

  if (!fields.name.trim()) errors.name = 'Tell us who you are.';
  if (!fields.subject.trim()) errors.subject = 'Give your message a subject.';

  const message = fields.message.trim();
  if (!message) {
    errors.message = 'Write your message.';
  } else if (message.length < 10) {
    // Short enough to be an accident. Not a hard rule — 10 characters is a
    // sentence fragment, and anything longer is allowed through.
    errors.message = 'Add a little more detail so we can help.';
  }

  const email = fields.email.trim();
  const phone = fields.phone.trim();

  if (email && !EMAIL.test(email)) errors.email = 'Check this email address.';
  if (phone && !looksLikePhone(phone)) errors.phone = 'Check this phone number.';

  // One of the two is required, but neither field is individually at fault —
  // so the message goes on the pair rather than reddening a field the person
  // deliberately left blank.
  if (!email && !phone) {
    errors.contact = 'Add an email address or a phone number so we can reply.';
  }

  return errors;
}

export function hasErrors(errors: ContactErrors): boolean {
  return Object.keys(errors).length > 0;
}
