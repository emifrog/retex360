/**
 * @jest-environment node
 *
 * Runs in the Node environment: the `jsdom` package (used by the server
 * sanitizer) needs globals like TextEncoder that jest's jsdom env omits. This
 * also matches the real runtime (Node serverless), not the browser.
 */
import { sanitizeHtmlServer, sanitizeRexHtmlFields } from '@/lib/sanitize-server';

describe('sanitizeHtmlServer', () => {
  it('removes <script> tags', () => {
    const out = sanitizeHtmlServer('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('alert(1)');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeHtmlServer('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('drops the style attribute (CSS injection surface)', () => {
    const out = sanitizeHtmlServer('<p style="position:fixed">x</p>');
    expect(out).not.toContain('style');
  });

  it('forces rel="noopener noreferrer" on links', () => {
    const out = sanitizeHtmlServer('<a href="https://example.com" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('keeps allowed formatting tags', () => {
    const html = '<p><strong>bold</strong> <em>italic</em></p><ul><li>item</li></ul>';
    expect(sanitizeHtmlServer(html)).toBe(html);
  });
});

describe('sanitizeRexHtmlFields', () => {
  it('sanitizes known HTML fields and leaves other fields untouched', () => {
    const body = {
      title: 'My title <script>x</script>',
      description: '<p>desc</p><script>alert(1)</script>',
      context: '<img src=x onerror=alert(1)>',
      tags: ['a', 'b'],
      key_figures: { sp: 10 },
    };
    const clean = sanitizeRexHtmlFields(body);

    // HTML fields are sanitized
    expect(clean.description).not.toContain('<script>');
    expect(clean.context).not.toContain('onerror');
    // Non-HTML fields pass through unchanged
    expect(clean.title).toBe(body.title);
    expect(clean.tags).toEqual(['a', 'b']);
    expect(clean.key_figures).toEqual({ sp: 10 });
  });

  it('leaves null / non-string values untouched', () => {
    const body = { description: null, context: undefined, sitac: 42 };
    const clean = sanitizeRexHtmlFields(body as Record<string, unknown>);
    expect(clean.description).toBeNull();
    expect(clean.context).toBeUndefined();
    expect(clean.sitac).toBe(42);
  });
});
