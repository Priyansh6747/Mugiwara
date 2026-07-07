//! Core proxy handler.
//!
//! GET /api/proxy?t=<signed-token>
//!
//! 1. Verify HMAC token  → 403 on failure
//! 2. Fetch upstream URL with spoofed Referer + User-Agent
//! 3. If response is m3u8 → rewrite all segment/key URLs → return text
//! 4. Otherwise → zero-copy stream upstream bytes → response body

use axum::{
    body::Body,
    extract::{Query, Request},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
};
use reqwest::Client;
use serde::Deserialize;
use std::sync::OnceLock;

use crate::{m3u8, token};

const AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";

/// Shared reqwest client — connection pool is reused across requests.
fn client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        Client::builder()
            .user_agent(AGENT)
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
            .expect("failed to build reqwest client")
    })
}

/// Derive the proxy's own public base URL from the incoming request headers.
///
/// nginx sets `X-Forwarded-Proto` (https) and the `Host` header is always
/// present, so this works with zero env var configuration on the VPS.
///
/// e.g.  https://your-vps.com
fn proxy_self_from_request(req: &Request) -> String {
    let headers = req.headers();

    let scheme = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("http");

    let host = headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost");

    format!("{scheme}://{host}")
}

#[derive(Deserialize)]
pub struct Params {
    pub t: Option<String>,
}

fn cors_headers() -> HeaderMap {
    let mut h = HeaderMap::new();
    h.insert("Access-Control-Allow-Origin",  HeaderValue::from_static("*"));
    h.insert("Access-Control-Allow-Methods", HeaderValue::from_static("GET, HEAD, OPTIONS"));
    h.insert("Access-Control-Allow-Headers", HeaderValue::from_static("Range, Content-Type"));
    h.insert(
        "Access-Control-Expose-Headers",
        HeaderValue::from_static("Content-Length, Content-Range, Accept-Ranges, Content-Type"),
    );
    h
}

fn err(status: StatusCode, msg: &'static str) -> Response {
    let mut headers = cors_headers();
    headers.insert("Content-Type", HeaderValue::from_static("application/json"));
    let body = format!(r#"{{"error":"{msg}"}}"#);
    (status, headers, body).into_response()
}

fn is_m3u8(content_type: &str, url: &str) -> bool {
    content_type.contains("mpegurl")
        || content_type.contains("m3u8")
        || url.contains(".m3u8")
}

pub async fn handle(Query(params): Query<Params>, req: Request) -> Response {
    // ── Derive self URL from live request (no env var needed) ─────────────────
    let proxy_self = proxy_self_from_request(&req);

    // ── 1. Verify token ───────────────────────────────────────────────────────
    let raw_token = match params.t {
        Some(t) if !t.is_empty() => t,
        _ => return err(StatusCode::BAD_REQUEST, "missing ?t= token"),
    };

    let target = match token::verify(&raw_token) {
        Ok(t) => t,
        Err(e) => {
            tracing::warn!("token rejected: {e}");
            return err(StatusCode::FORBIDDEN, "invalid or expired token");
        }
    };

    tracing::debug!("proxying {} (self={})", target.url, proxy_self);

    // ── 2. Fetch upstream ─────────────────────────────────────────────────────
    let upstream_res = match client()
        .get(&target.url)
        .header("Referer", &target.referer)
        .header("Origin",  &target.referer)
        .send()
        .await
    {
        Ok(r)  => r,
        Err(e) => {
            tracing::error!("upstream fetch failed: {e}");
            return err(StatusCode::BAD_GATEWAY, "upstream fetch failed");
        }
    };

    let status       = upstream_res.status();
    let content_type = upstream_res
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();

    let accept_ranges  = upstream_res.headers().get("accept-ranges").cloned();
    let content_length = upstream_res.headers().get("content-length").cloned();
    let content_range  = upstream_res.headers().get("content-range").cloned();

    // ── 3. m3u8 — buffer, rewrite, return ────────────────────────────────────
    if is_m3u8(&content_type, &target.url) {
        let text = match upstream_res.text().await {
            Ok(t)  => t,
            Err(e) => {
                tracing::error!("reading m3u8 body: {e}");
                return err(StatusCode::BAD_GATEWAY, "failed to read m3u8 body");
            }
        };

        let rewritten = m3u8::rewrite(&text, &target.url, &target.referer, &proxy_self);

        let mut headers = cors_headers();
        headers.insert(
            "Content-Type",
            HeaderValue::from_static("application/vnd.apple.mpegurl"),
        );
        headers.insert("Cache-Control", HeaderValue::from_static("no-store"));

        return (StatusCode::OK, headers, rewritten).into_response();
    }

    // ── 4. Binary/mp4 segment — zero-copy stream ──────────────────────────────
    //
    // upstream_res.bytes_stream() gives us a Stream<Item = Result<Bytes>>.
    // axum's Body::from_stream() wraps it and writes chunks directly to the
    // TCP socket as they arrive from the CDN — nothing is buffered in Rust heap.
    let byte_stream = upstream_res.bytes_stream();
    let body        = Body::from_stream(byte_stream);

    let mut headers = cors_headers();

    if let Ok(ct) = HeaderValue::from_str(&content_type) {
        headers.insert("Content-Type", ct);
    }
    if let Some(v) = accept_ranges  { headers.insert("Accept-Ranges",  v); }
    if let Some(v) = content_length { headers.insert("Content-Length", v); }
    if let Some(v) = content_range  { headers.insert("Content-Range",  v); }
    headers.insert("Cache-Control", HeaderValue::from_static("no-store"));

    let http_status = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK);
    (http_status, headers, body).into_response()
}
