# WhereIsIt — Project Context for Claude

## Role
Act as a **principal engineer with 20+ years of experience** on this project.
- Prioritise correctness and simplicity over cleverness
- Minimal diffs — fix/extend what exists, don't rewrite healthy code
- No speculative abstractions, no doc comments unless asked
- Know the full stack (Python + Lit/JS); own both sides of every feature

---

## What This App Is
**WhereIsIt** — a Home Assistant add-on for tracking physical items across storage units.

Hierarchy: `StorageUnit → Location → StorageBox → Item`

Categories are cross-cutting tags (comma-separated string in `Item.category` column).

Deployed as an HA ingress add-on, served at a dynamic base URL like `/api/hassio_ingress/<token>/`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Lit (Web Components) + Vite, Material Web Components (`@material/mwc-*`) |
| Router | Vaadin Router — `window.AppRouter` set in `where-is-it-app.js` |
| Backend | Python 3, FastAPI, SQLAlchemy (async), SQLite at `/data/whereisit.db` |
| Photos | Stored at `/data/photos/`, served at `/api/photos/<filename>` |
| Build | Vite bundles to `whereisit/frontend/dist/` |

---

## Key Patterns

### Navigation (Frontend)
Always import Router and use this pattern — **all views do this**:
```js
import { Router } from '@vaadin/router';

_goSomewhere(id) {
    const url = `/box/${id}`;
    const target = window.AppRouter
        ? window.AppRouter.urlForPath(url).replace(/([^:])\/\/+/g, '$1/')
        : url;
    try { Router.go(target); } catch (e) { window.location.href = target; }
}
```
`window.AppRouter.urlForPath()` prepends the HA ingress base. The double-slash replace is mandatory.

### Global Item Detail Dialog
`item-detail-dialog` lives in `where-is-it-app`'s shadow DOM (`#globalItemDetailDialog`).
Any view that wants to show item detail does:
```js
const app = document.querySelector('where-is-it-app');
const dialog = app.shadowRoot.getElementById('globalItemDetailDialog');
dialog.show({ ...item, box: this.box });
dialog.addEventListener('edit-item-requested', handler);
dialog.addEventListener('item-detail-closed', closeHandler);
```

### Categories (Multi-tag)
- Stored in DB as comma-separated string in `Item.category` (e.g. `"Electronics,Tools"`)
- No DB migration needed — same `VARCHAR` column
- `GET /api/categories` returns a deduplicated sorted list of individual tags (from both `Category` table and item values)
- Search filters use LIKE patterns to match a tag within a comma-separated string
- Frontend splits/joins on `,` — dialogs use chip UI to select multiple tags

### Lit Component State
- Use `static properties` with `state: true` for internal state (not reflected to attributes)
- `firstUpdated()` for initial data fetches in views
- `connectedCallback()` for data fetches in dialogs (called when element is connected)
- Parent views re-fetch data on child dialog events (`@item-added`, `@item-updated`, `@item-deleted`)

### API URL Construction
```js
const url = window.AppRouter
    ? window.AppRouter.urlForPath(`/api/boxes/${id}`)
    : `api/boxes/${id}`;
```

### Backend CRUD Pattern
- All CRUD in `crud.py`, all routes in `endpoints.py`
- `model_dump(exclude_unset=True)` for partial updates (PATCH semantics via PUT)
- Relationships loaded with `selectinload` — no lazy loading (async SQLAlchemy)

---

## HA Ingress Quirks
- Base URL is dynamic — never hardcode `/`
- Double slashes (`//`) crash navigation → always apply `.replace(/([^:])\/\/+/g, '$1/')`
- `window.AppRouter` may be null in rare edge cases — always guard with ternary
- `window.location.href` is the hard fallback when `Router.go` fails

---

## Current Version
`config.yaml` → `version: 0.6.2`

---

## What NOT to Do
- Don't use `window.Router` — always `import { Router } from '@vaadin/router'` in each file
- Don't add the setTimeout navigation check pattern — it caused the back-button bug; simple try/catch is enough
- Don't add new DB columns without a migration strategy (there is no auto-migrate; migrations are manual via `migrate.py`)
- Don't mock the DB in tests
- Don't use `document.querySelector` inside Lit components — use `this.shadowRoot.querySelector`
