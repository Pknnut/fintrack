# FinTrack

A personal finance PWA (Thai baht ฿) for tracking transactions, goals, instalments,
budgets, and recurring items. Single-page, vanilla JS, no build step.

**Live app:** https://pknnut.github.io/

## Stack
- Frontend: vanilla HTML/CSS/JS, hosted on GitHub Pages
- Backend: Google Apps Script (`fintrack_appscript.gs`) connected to Google Sheets
- Storage: localStorage (offline-first), synced to Sheets on demand

## Files
| File | Purpose |
|---|---|
| `index.html` | Main app shell + markup |
| `style.css` | All styling (design tokens, components, dark mode) |
| `ui-kit.js` | Reusable UI engines — numeric keypad, EN/TH text keyboard, custom dropdowns |
| `app.js` | App logic — state, rendering, sync, all feature pages |
| `fintrack_appscript.gs` | Backend — doGet/doPost handlers for Sheets read/write |

## Local development
No build step. Just serve the folder:
```bash
npx serve .
# or: VSCode "Live Server" extension → Go Live
```
Avoid opening `index.html` directly via `file://` — some fetch/CORS behavior
differs from an actual HTTP server.

## Deploying
- **Frontend:** push to `main` → GitHub Pages rebuilds automatically (~1 min).
- **Backend:** edit `fintrack_appscript.gs` in this repo, then copy changes into
  the Apps Script editor and redeploy the Web App (or use `clasp push` if set up).

## Conventions
- Surgical edits only — no full-file rewrites. Diffs should be small and reviewable.
- Run `node --check <file>.js` before committing any JS change.
- All money values render through `fmt()` — never format ฿ amounts inline.
- Colors via CSS variables (`var(--slate-900)` etc.) — no hardcoded hex in new code.
- Inline SVG or emoji for icons (no icon-font dependency issues on some devices).
