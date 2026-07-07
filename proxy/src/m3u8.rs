//! m3u8 playlist URL rewriter.
//!
//! Every absolute or relative URL found in a playlist (segment lines and
//! URI="…" attribute values) is re-encoded as a signed proxy token so the
//! browser never talks to the upstream CDN directly.

use crate::token;
use percent_encoding::percent_decode_str;

/// 4-hour token TTL (matches Next.js TOKEN_TTL_MS)
const TTL_MS: u64 = 4 * 60 * 60 * 1_000;

/// Resolve a possibly-relative URL against the m3u8's own URL.
fn resolve(base: &str, href: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        return href.to_owned();
    }
    // strip query/fragment from base, then join
    let base_dir = base
        .rfind('/')
        .map(|i| &base[..=i])
        .unwrap_or(base);
    format!("{base_dir}{href}")
}

/// Build a proxy URL for a given upstream URL.
fn proxy_url(proxy_self: &str, upstream_url: &str, referer: &str) -> String {
    let tok = token::encode(upstream_url, referer, TTL_MS);
    // percent-encode the token so it survives being embedded in a URI="…" value
    let encoded = percent_encoding::utf8_percent_encode(&tok, percent_encoding::NON_ALPHANUMERIC);
    format!("{proxy_self}/api/proxy?t={encoded}")
}

/// Rewrite every URL in an m3u8 playlist to go through the proxy.
///
/// * `text`       — raw playlist text
/// * `m3u8_url`   — the URL we fetched this playlist from (used to resolve relative refs)
/// * `referer`    — the Referer header that AllAnime expects
/// * `proxy_self` — base URL of this proxy, e.g. `http://localhost:4001`
pub fn rewrite(text: &str, m3u8_url: &str, referer: &str, proxy_self: &str) -> String {
    text.lines()
        .map(|line| {
            // ── Rewrite URI="…" attributes (EXT-X-KEY, EXT-X-MAP, etc.) ─────
            let line = rewrite_uri_attrs(line, m3u8_url, referer, proxy_self);

            let trimmed = line.trim();

            // Skip blank lines and pure directive lines (no URL payload)
            if trimmed.is_empty() || !is_segment_or_uri(trimmed) {
                return line;
            }

            // ── Rewrite bare segment/playlist URLs ────────────────────────────
            let abs = resolve(m3u8_url, trimmed);
            proxy_url(proxy_self, &abs, referer)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Replace `URI="…"` occurrences inside a tag line.
fn rewrite_uri_attrs(line: &str, base: &str, referer: &str, proxy_self: &str) -> String {
    // Fast path: no URI attribute
    if !line.contains("URI=\"") {
        return line.to_owned();
    }

    let mut out = String::with_capacity(line.len() * 2);
    let mut rest = line;

    while let Some(start) = rest.find("URI=\"") {
        out.push_str(&rest[..start + 5]); // include `URI="`
        rest = &rest[start + 5..];

        if let Some(end) = rest.find('"') {
            let raw_uri = &rest[..end];
            let uri     = percent_decode_str(raw_uri).decode_utf8_lossy().into_owned();
            let abs     = resolve(base, &uri);
            out.push_str(&proxy_url(proxy_self, &abs, referer));
            out.push('"');
            rest = &rest[end + 1..];
        }
    }
    out.push_str(rest);
    out
}

/// Return true if the line is a segment URL or a sub-playlist URL
/// (i.e. not a blank line and not a pure `#` directive without a URL payload).
fn is_segment_or_uri(s: &str) -> bool {
    if !s.starts_with('#') {
        // bare URL line
        return true;
    }
    // Some tags carry a URI inline on the same line, e.g.:
    // #EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=86000,URI="low/iframe.m3u8"
    // Those are handled by rewrite_uri_attrs, so return false here
    // to avoid double-rewriting the whole line.
    false
}
