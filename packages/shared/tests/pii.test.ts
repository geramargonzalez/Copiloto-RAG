import { describe, expect, it } from 'vitest';

import { containsPII, redactPII } from '../src/pii.js';

describe('PII scrubber', () => {
  it('redacts common PII tokens', () => {
    const raw = 'Contacto: ana.perez@corp.com, +54 11 5555-1212, calle falsa 1234';
    const redacted = redactPII(raw);

    expect(redacted).not.toContain('ana.perez@corp.com');
    expect(redacted).toContain('[REDACTED_EMAIL]');
    expect(redacted).toContain('[REDACTED_PHONE]');
    expect(redacted).toContain('[REDACTED_ADDRESS]');
  });

  it('detects PII presence', () => {
    expect(containsPII('Mi mail es pedro@empresa.com')).toBe(true);
    expect(containsPII('Procedimiento de devoluciones corporativas')).toBe(false);
  });
});

