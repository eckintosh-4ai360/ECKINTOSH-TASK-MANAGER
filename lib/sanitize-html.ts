import DOMPurify from "isomorphic-dompurify"

/**
 * Note bodies are stored as HTML (TipTap writes it, and aiCreateNote runs
 * LLM-produced markdown through marked). Both paths end up in
 * dangerouslySetInnerHTML, so both have to be sanitized — model output is
 * untrusted input like any other.
 *
 * Sanitizing on write keeps bad markup out of the database; sanitizing again on
 * render covers rows written before this existed.
 */

const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "img",
]

const ALLOWED_ATTR = ["href", "title", "target", "rel", "src", "alt", "width", "height", "class", "colspan", "rowspan"]

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // Block javascript:, vbscript:, and data: URLs; allow http(s), mailto, and
  // inline base64 images only.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "svg"],
  // on* handlers, and anything that could pull in remote code.
  FORBID_ATTR: ["style", "srcset", "formaction", "form", "ping"],
  ALLOW_DATA_ATTR: false,
}

export function sanitizeNoteHtml(html: string): string {
  if (!html) return ""

  const clean = DOMPurify.sanitize(html, CONFIG) as unknown as string

  // Any link that survived should not be able to reach back through
  // window.opener when opened in a new tab.
  return clean.replace(/<a\s+([^>]*?)>/gi, (match, attrs: string) => {
    if (/\btarget\s*=/i.test(attrs) && !/\brel\s*=/i.test(attrs)) {
      return `<a ${attrs} rel="noopener noreferrer">`
    }
    return match
  })
}

/** Plain-text preview, e.g. for note list snippets. */
export function stripHtml(html: string): string {
  return (DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string).trim()
}
