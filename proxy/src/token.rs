//! HMAC-SHA256 token verification.
//!
//! Mirrors the exact format produced by Next.js `lib/streamProxy.js`:
//!
//!   token = base64url(JSON{ url, referer, exp }) + "." + HMAC-SHA256(payload, secret)
//!
//! The shared secret is read from `STREAM_PROXY_SECRET` (same env var as Next.js).

use anyhow::{bail, Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Deserialize)]
pub struct TokenPayload {
    pub url:     String,
    pub referer: String,
    /// Expiry — milliseconds since Unix epoch (JS `Date.now()` style)
    pub exp:     u64,
}

fn secret() -> String {
    std::env::var("STREAM_PROXY_SECRET")
        .unwrap_or_else(|_| "mugiwara-stream-proxy".into())
}

fn sign(payload_b64: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret().as_bytes())
        .expect("HMAC can take keys of any size");
    mac.update(payload_b64.as_bytes());
    // Next.js uses base64url for the signature too
    URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes())
}

/// Verify the token and return the decoded payload.
///
/// Returns an error if:
///   - token is malformed
///   - HMAC signature does not match
///   - token has expired
///   - url does not start with http(s)://
pub fn verify(token: &str) -> Result<TokenPayload> {
    let dot = token
        .rfind('.')
        .context("token missing '.' separator")?;

    let payload_b64 = &token[..dot];
    let sig         = &token[dot + 1..];

    if sig != sign(payload_b64) {
        bail!("token signature mismatch");
    }

    let json_bytes = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .context("token payload is not valid base64url")?;

    let payload: TokenPayload =
        serde_json::from_slice(&json_bytes).context("token payload is not valid JSON")?;

    // exp is in milliseconds
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before epoch")
        .as_millis() as u64;

    if now_ms > payload.exp {
        bail!("token expired");
    }

    if !payload.url.starts_with("http://") && !payload.url.starts_with("https://") {
        bail!("token url must be http(s)");
    }

    Ok(payload)
}

/// Produce a new signed token — used when rewriting m3u8 segment URLs.
pub fn encode(url: &str, referer: &str, ttl_ms: u64) -> String {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before epoch")
        .as_millis() as u64;

    let payload_json = serde_json::json!({
        "url":     url,
        "referer": referer,
        "exp":     now_ms + ttl_ms,
    })
    .to_string();

    let payload_b64 = URL_SAFE_NO_PAD.encode(payload_json.as_bytes());
    let sig         = sign(&payload_b64);
    format!("{payload_b64}.{sig}")
}
