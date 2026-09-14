import { EMPTY_CONTACT, hasErrors, validateContactForm } from '../../features/about/contactForm';

/**
 * The rules that decide whether someone's message can be sent.
 *
 * Worth testing directly rather than through the screen: getting these wrong
 * is silent. A rule that is too strict turns a farmer away with a valid address
 * and no way to report the problem, which is exactly the failure nobody hears
 * about.
 */
const VALID = {
  name: 'Kofi Mensah',
  email: 'kofi@example.com',
  phone: '',
  subject: 'Rainfall forecast for Yendi',
  message: 'When are the rains expected to start this season?',
};

describe('validateContactForm', () => {
  it('accepts a filled-in form', () => {
    expect(validateContactForm(VALID)).toEqual({});
    expect(hasErrors(validateContactForm(VALID))).toBe(false);
  });

  it('reports every empty required field at once, not one at a time', () => {
    const errors = validateContactForm(EMPTY_CONTACT);

    // A form that reveals its problems one submit at a time is a form people
    // give up on.
    expect(Object.keys(errors).sort()).toEqual(['contact', 'message', 'name', 'subject']);
  });

  it('takes either an email or a phone, and does not demand both', () => {
    expect(validateContactForm({ ...VALID, phone: '', email: 'kofi@example.com' })).toEqual({});
    expect(validateContactForm({ ...VALID, email: '', phone: '024 123 4567' })).toEqual({});
  });

  it('blames the pair, not a field, when no reply channel is given', () => {
    const errors = validateContactForm({ ...VALID, email: '', phone: '' });

    expect(errors.contact).toMatch(/email address or a phone number/i);
    // Neither field is individually wrong — the person may have deliberately
    // left one blank, and reddening both would say otherwise.
    expect(errors.email).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });

  it.each([
    'kofi@example.com',
    'kofi.mensah@meteo.gov.gh',
    'kofi+advisory@example.co.uk',
    'k@e.io',
  ])('accepts %s, because a false rejection means nobody can write in', (email) => {
    expect(validateContactForm({ ...VALID, email }).email).toBeUndefined();
  });

  it.each(['kofi', 'kofi@', '@example.com', 'kofi @example.com', 'kofi@example'])(
    'rejects %s',
    (email) => {
      expect(validateContactForm({ ...VALID, email }).email).toBeDefined();
    },
  );

  /* Every one of these is the same Ghanaian number written the way someone
     actually types it. Rejecting any of them turns a real person away. */
  it.each(['024 123 4567', '+233 24 123 4567', '0241234567', '(024) 123-4567', '024-123-4567'])(
    'accepts %s as a phone number',
    (phone) => {
      expect(validateContactForm({ ...VALID, email: '', phone }).phone).toBeUndefined();
    },
  );

  it.each(['12345', 'not a phone', '024-abc-4567', '+233+24', '0241234567890123456'])(
    'rejects %s as a phone number',
    (phone) => {
      expect(validateContactForm({ ...VALID, email: '', phone }).phone).toBeDefined();
    },
  );

  it('asks for more than a couple of characters in the message', () => {
    expect(validateContactForm({ ...VALID, message: 'hi' }).message).toMatch(/more detail/i);
    expect(validateContactForm({ ...VALID, message: 'Rain in Yendi?' }).message).toBeUndefined();
  });

  it('treats whitespace as empty rather than as an answer', () => {
    const errors = validateContactForm({ ...VALID, name: '   ', subject: '\n', message: '    ' });

    expect(errors.name).toBeDefined();
    expect(errors.subject).toBeDefined();
    expect(errors.message).toBeDefined();
  });
});
