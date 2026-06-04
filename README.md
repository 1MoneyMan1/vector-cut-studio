# Vector Cut Studio

A 100% client-side, static web app that replaces the **design** side of Cricut
Design Space. Design here -> export a clean, cut-ready **SVG** -> open that SVG in
the official Cricut app and use it purely as a "printer driver" to cut.

No backend. Hostable on GitHub Pages.

## Run locally
    npm install
    npm run dev

## Deploy to GitHub Pages
1. In vite.config.js, set `base` to '/<your-repo-name>/' (or set VITE_BASE env var).
2. npm run build
3. npm run deploy   # publishes ./dist via gh-pages

## Known limitations (by design)
- Boolean ops and Offset operate on vector paths. Convert text/images to paths first.
- Raster trace detects solid OUTER contours; interior holes are ignored.
- Curve text is a "bake": set the curve slider back to 0 to edit the words again.
- Export uses 96 DPI for the inches mapping (1152px mat = 12in).
