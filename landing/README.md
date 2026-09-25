# PathMaid Landing

Standalone static landing page for PathMaid distribution. It has Russian (`/`) and English (`/en/`) pages, one shared stylesheet and script, and no build step or npm dependencies. Artwork lives in `assets/`; replace files there when final illustrations are ready.

Open `index.html` directly, or serve the folder with any static host.

## Release Links

Download buttons resolve assets from the latest GitHub release at runtime. If the GitHub API is temporarily unavailable, buttons fall back to the latest release page.

Supported downloads: Windows, macOS, Linux, and Android ARM64 APK (manual installation). HTML links also lead to the release page when JavaScript is unavailable.

## Production Domain and Search

The canonical Russian URL is `https://www.pathmaid.site/`; the English URL is `https://www.pathmaid.site/en/`. The domain `pathmaid.site` is registered with hoster.by; `www` is a subdomain and does not require a separate purchase.

1. Verify ownership of `pathmaid.site` in the GitHub account's Pages settings using the TXT record supplied by GitHub.
2. In `kirylyaskou/PathMaid` → Settings → Pages, set **Custom domain** to `www.pathmaid.site`. This repository deploys through GitHub Actions: a `CNAME` file in the artifact does not configure the domain.
3. At the DNS provider, set `www` to a CNAME targeting `kirylyaskou.github.io` (no repository path). Configure the apex `@` with these four A records so `pathmaid.site` redirects to `www.pathmaid.site`:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
   The domain's delegated name servers must first serve a DNS zone for `pathmaid.site`. If public resolvers return `SERVFAIL` with a "name servers refused query" or "lame delegation" message, enable the zone with the provider or ask its support to repair the delegation before checking these records.
4. Wait for DNS and the GitHub certificate, then enable **Enforce HTTPS**. Verify the homepage, `/robots.txt`, `/sitemap.xml`, and the apex-to-www redirect over HTTPS.
5. Verify a `pathmaid.site` domain property in Google Search Console using its DNS TXT record. Submit `https://www.pathmaid.site/sitemap.xml`, inspect both page URLs, and request indexing.
6. Verify `/auth-confirmed/` and any authentication redirect configuration when switching domains. Keep its existing `noindex` directive; it is intentionally excluded from the sitemap and remains crawlable so search engines can see `noindex`.

The Pages workflow uploads this directory unchanged, including `robots.txt` and `sitemap.xml`. The sitemap lists both public language pages. Each has its own canonical URL and reciprocal `hreflang` links; section anchors are not separate pages. Update the sitemap when adding public pages. Search Console reports indexing progress; neither a sitemap nor a request guarantees indexing or ranking for a query.

References: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [Google sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Asset Sizes

Use these generation targets:

| File | Size | Use |
| --- | ---: | --- |
| `pathmaid-icon-128.png` | 128 x 128 | Current app icon used as favicon. |
| `hero-character.png` | 1106 x 1422 current, target 1080 x 1320+ | Main mascot art for the first screen. Current file is wired into the hero. |
| `intro-tilta-mage.png` | 1448 x 1086 | Tilta and the wizard in the introduction section. |
| `cloud-sync-guide.png` | 1254 x 1254 current, target 1200 x 1200+ | Cloud sync section art. Current file is wired into the page. |
| `feature-wide.png` | 1774 x 887 current, target 2:1 | Wide transformation banner for the middle showcase. Current file is wired into the page. |
| `auth-confirmed-success.png` | 1448 x 1086 current | Email confirmation success page background. |
| `reference-bestiary.png`, `reference-spells.png`, `reference-items.png`, `reference-hazards.png` | About 1520 x 876 each | Switchable reference UI screenshots. |
| `reference-reaction.png` | 1254 x 1254 | The two foreground characters framing the reference UI. |
| `combat-ui.png` | 1644 x 1004 | Combat tracker UI revealed between shatter transitions. |
| `combat-meme.png` | 1617 x 973 | Foreground meme that breaks apart and reassembles over the combat UI. |
| `service-card-pathbuilder.png` | 1448 x 1086 current, target 720 x 500+ | Tilta in the Pathbuilder delivery van. |
| `service-card-custom.png` | 1462 x 1076 current, target 720 x 500+ | Custom creature section illustration. |
| `service-card-campaign.png` | 1436 x 1096 current, target 720 x 500+ | Campaign section illustration. |
| `og-image.png` | 1200 x 630 | Future social sharing image. Not wired yet. |

The remaining illustrations stay wired into the light design as temporary assets. Keep their filenames when replacing them with final artwork so both language pages update together. The wide artwork appears between the five feature stories and cloud sync.
