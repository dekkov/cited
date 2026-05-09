# Self-Host Referrer Policy Guidance

_Last updated: 2026-05-08_

## Why This Matters

Cited uses `<YouTubeEmbed>` (via `@next/third-parties/google`) to embed DOAC clips. YouTube's iframe player requires the embedding origin to send a `Referer` header. If your server strips or suppresses the `Referer` header, YouTube will refuse to play the video and the user sees a black box.

## Recommended Setting

Use `strict-origin-when-cross-origin` — this is the Next.js default and the recommended setting:

```
Referrer-Policy: strict-origin-when-cross-origin
```

This sends the origin (scheme + host) on cross-origin requests, which is what YouTube requires, while not leaking the full path.

## What NOT to Do

**Do NOT set `Referrer-Policy: no-referrer`.**

This strips the `Referer` header entirely on cross-origin requests. YouTube will refuse the embed and show a black box. This is a silent failure — no JavaScript error, just a broken player.

## Configuration by Reverse Proxy

### Next.js (default)

No action needed. Next.js sets `strict-origin-when-cross-origin` by default in `next.config.ts` headers. The `<YouTubeEmbed>` component from `@next/third-parties/google` works out of the box.

### Caddy

```caddyfile
header Referrer-Policy strict-origin-when-cross-origin
```

### nginx

```nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Cloudflare (Transform Rules)

In the Cloudflare dashboard, go to **Rules → Transform Rules → Modify Response Header**:

- Field: `Referrer-Policy`
- Value: `strict-origin-when-cross-origin`
- Action: Set

Note: If you have a Page Rule or Managed Rule that sets `Referrer-Policy: no-referrer`, disable or override it.

## Verifying the Setting

After deploying, open a habit page with an embedded clip. Right-click → Inspect → Network tab. Find the request to `youtube.com`. In the request headers, confirm `Referer: https://your-domain.com/` is present.

If the YouTube player shows a black box with "Video unavailable", check your `Referrer-Policy` header first.
