import { sanitizeHtml } from '@/lib/sanitize';

describe('HTML sanitization', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('allows headings', () => {
    const input = '<h1>Title</h1><h2>Subtitle</h2>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('allows lists', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('allows links with href', () => {
    const input = '<a href="https://example.com">Link</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it('allows images with src and alt', () => {
    const input = '<img src="photo.jpg" alt="A photo">';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="photo.jpg"');
    expect(result).toContain('alt="A photo"');
  });

  it('allows tables', () => {
    const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  // XSS prevention tests
  it('strips script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('strips onclick handlers', () => {
    const input = '<p onclick="alert(\'xss\')">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('strips onerror handlers on images', () => {
    const input = '<img src="x" onerror="alert(\'xss\')">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('strips javascript: URLs', () => {
    const input = '<a href="javascript:alert(\'xss\')">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('strips data attributes', () => {
    const input = '<p data-evil="payload">Text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('data-evil');
  });

  it('strips iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
  });

  it('strips form tags', () => {
    const input = '<form action="/steal"><input type="text"></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<form');
  });

  it('strips SVG with embedded scripts', () => {
    const input = '<svg onload="alert(1)"><circle r="10"></circle></svg>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('<svg');
  });

  it('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles plain text (no HTML)', () => {
    expect(sanitizeHtml('Just plain text')).toBe('Just plain text');
  });
});
