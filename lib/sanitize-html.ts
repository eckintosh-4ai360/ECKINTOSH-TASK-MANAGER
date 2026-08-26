import sanitizeHtml from "sanitize-html"

/**
 * Note bodies are stored as HTML (TipTap writes it, and aiCreateNote runs
 * LLM-produced markdown through marked). Both paths end up in
 * dangerouslySetInnerHTML, so both have to be sanitized — model output is
 * untrusted input like any other.
 *
 * Using `sanitize-html` ensures fast, reliable server-side & SSR execution
 * without depending on `jsdom` or ESM-incompatible modules on Vercel.
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

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "class"],
  table: ["class"],
  th: ["colspan", "rowspan", "class"],
  td: ["colspan", "rowspan", "class"],
  div: ["class"],
  span: ["class"],
  p: ["class"],
  code: ["class"],
  pre: ["class"],
}

export function sanitizeNoteHtml(html: string): string {
  if (!html) return ""

  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          return {
            tagName: "a",
            attribs: {
              ...attribs,
              rel: "noopener noreferrer",
            },
          }
        }
        return { tagName, attribs }
      },
    },
  })

  return clean
}

/** Plain-text preview, e.g. for note list snippets. */
export function stripHtml(html: string): string {
  if (!html) return ""
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim()
}
