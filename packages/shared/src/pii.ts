const DEFAULT_PATTERNS: Array<{ key: string; regex: RegExp; replacement: string }> = [
  {
    key: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  {
    key: 'phone',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  {
    key: 'address',
    regex: /\b(?:street|st\.|avenue|ave\.|road|rd\.|calle|av\.?)\s+[a-zA-Z0-9\s#-]{4,}\b/gi,
    replacement: '[REDACTED_ADDRESS]',
  },
  {
    key: 'national_id',
    regex: /\b\d{7,8}\b/g,
    replacement: '[REDACTED_ID]',
  },
  {
    key: 'long_number',
    regex: /\b\d{12,19}\b/g,
    replacement: '[REDACTED_LONG_NUMBER]',
  },
];

export type PIIScrubOptions = {
  extraPatterns?: string[];
};

export const redactPII = (value: string, options?: PIIScrubOptions): string => {
  let result = value;

  for (const pattern of DEFAULT_PATTERNS) {
    result = result.replace(pattern.regex, pattern.replacement);
  }

  for (const pattern of options?.extraPatterns ?? []) {
    const regex = new RegExp(pattern, 'gi');
    result = result.replace(regex, '[REDACTED_CUSTOM]');
  }

  return result;
};

export const containsPII = (value: string): boolean =>
  DEFAULT_PATTERNS.some((pattern) => new RegExp(pattern.regex.source, pattern.regex.flags).test(value));
