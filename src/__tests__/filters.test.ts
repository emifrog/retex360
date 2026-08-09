import { quoteFilterValue, orIlike, isUuid } from '@/lib/supabase/filters';

describe('quoteFilterValue', () => {
  it('wraps the value in double quotes', () => {
    expect(quoteFilterValue('hello')).toBe('"hello"');
  });

  it('neutralises the PostgREST condition separator', () => {
    expect(quoteFilterValue('a,b')).toBe('"a,b"');
  });

  it('neutralises the operator separator and group delimiters', () => {
    expect(quoteFilterValue('a.b(c)')).toBe('"a.b(c)"');
  });

  it('escapes embedded double quotes', () => {
    expect(quoteFilterValue('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes backslashes before quotes so the escape cannot be broken out of', () => {
    // A trailing backslash would otherwise escape the closing quote.
    expect(quoteFilterValue('end\\')).toBe('"end\\\\"');
  });

  it('handles the empty string', () => {
    expect(quoteFilterValue('')).toBe('""');
  });
});

describe('orIlike', () => {
  it('builds one ilike condition per column', () => {
    expect(orIlike(['title', 'description'], 'feu')).toBe(
      'title.ilike."%feu%",description.ilike."%feu%"'
    );
  });

  it('keeps an injected condition inside the quoted value', () => {
    // Unescaped, `,status.eq.draft` would become a second OR condition.
    const result = orIlike(['title'], 'x,status.eq.draft');
    expect(result).toBe('title.ilike."%x,status.eq.draft%"');
    // Exactly one condition: the only unquoted `.` separators are title/ilike.
    expect(result.split('",').length).toBe(1);
  });

  it('keeps an injected group terminator inside the quoted value', () => {
    expect(orIlike(['title'], 'x)')).toBe('title.ilike."%x)%"');
  });

  it('escapes a quote used to close the value early', () => {
    expect(orIlike(['title'], '"')).toBe('title.ilike."%\\"%"');
  });
});

describe('isUuid', () => {
  it('accepts a canonical UUID', () => {
    expect(isUuid('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(true);
  });

  it('accepts uppercase', () => {
    expect(isUuid('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(true);
  });

  it('rejects a value carrying an `in.()` list separator', () => {
    expect(isUuid('3f2504e0-4f89-11d3-9a0c-0305e82c3301,evil')).toBe(false);
  });

  it('rejects malformed and non-string values', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
