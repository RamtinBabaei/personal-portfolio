# Self-hosted typography

This release includes licensed, original font files from their publishers. No Dennis Sans file or other reference-site asset is included. Fonts are served from this project's own origin; no Google Fonts request occurs at runtime.

| File                                | Family / subset                    |  Bytes | License                                                   |
| ----------------------------------- | ---------------------------------- | -----: | --------------------------------------------------------- |
| public/fonts/manrope-latin.woff2    | Manrope variable, Latin            | 24,836 | SIL Open Font License 1.1, public/fonts/manrope-OFL.txt   |
| public/fonts/vazirmatn-arabic.woff2 | Vazirmatn variable, Arabic/Persian | 46,308 | SIL Open Font License 1.1, public/fonts/vazirmatn-OFL.txt |

Manrope is the English display and body family; Vazirmatn is selected for Persian glyphs. Regular through semibold weights are declared. Persian retains its own line-height and letter-spacing rules. The primary locale font is preloaded; font-display: swap keeps text readable while loading.

Publisher sources and licenses:

- https://github.com/google/fonts/tree/main/ofl/manrope
- https://github.com/google/fonts/tree/main/ofl/vazirmatn
- https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2
- https://fonts.gstatic.com/s/vazirmatn/v16/Dxxo8j6PP2D_kU2muijlGMWWMmk.woff2

The downloaded files are unmodified Google Fonts WOFF2 distributions. License text and copyright notices travel with the source export.

The active font URLs are /api/fonts/manrope-latin.woff2 and /api/fonts/vazirmatn-arabic.woff2. The hosted gateway returns generic MIME metadata for directly uploaded font assets and bypasses header overrides, so these read-only endpoints set font/woff2 explicitly, cache for one day and support ETag revalidation. They serve identical bytes from a server-only snapshot; no external request or database access is involved.

The original WOFF2 distributions and licenses remain in public/fonts. lib/server/font-data.json is generated deterministically from those two files. If changing a font, run pnpm fonts:generate and rebuild. Tests compare every served byte to the source distributions and verify MIME, cache and conditional-response behavior. The snapshot adds about 95 KB of encoded data to the server bundle, not the client JavaScript.
