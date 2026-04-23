/**
 * Strip HTML tags and decode common HTML entities.
 * Paragraph + line breaks become newlines (preserved for whitespace-pre-line);
 * all other tags become spaces to avoid word merging.
 */
export function stripHtml(html: string): string {
  return html
    // Convert block-structural tags to newlines BEFORE stripping all tags,
    // so that long spell descriptions keep paragraph breaks under
    // whitespace-pre-line. Without this, sentences run together into one
    // monolithic block (Prismatic Spray, Charm, etc.).
    .replace(/<\/?(?:p|div|br|li|h[1-6]|hr)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ') // misc unrecognized entities → space
    // Collapse horizontal whitespace (but keep newlines) so that the raw
    // attribute-laden source HTML doesn't leave 10-space runs.
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ *\n */g, '\n')
    .trim()
}
