# Notifications Prototype

This project is a vanilla JS + Vite prototype for an in-app notification system, built on top of a mock Synapse project page. The page itself is decorative; the notification work is the focus.

## Stack

- Vanilla JS, no frameworks
- Vite for HMR
- All styles in `src/style.css`; all markup and logic in `index.html`

---

## Notification anatomy

Each notification is a `.notif` div with three children:

```
.notif
  .notif-icon       — 24×24 SVG icon, flex-shrink: 0, aligned to top (align-self: flex-start, padding-top: 2px)
  .notif-body       — flex: 1, min-width: 0; cursor: pointer only on .notif-expandable cards
    .notif-heading  — 14px bold white, margin-bottom: 2px
    .notif-desc     — 13.5px, color #c8cdd6, line-height 1.45, max-height 1.45em, overflow hidden
  .notif-actions    — flex, gap: 20px, align-self: center, flex-shrink: 0
    button.notif-action-btn — 13.5px bold white, no border/background, random label from ACTION_LABELS
    button.notif-close      — 30×30px circle, border: 1.5px solid rgba(255,255,255,0.18)
```

`.notif` layout: `display: flex; align-items: center; gap: 24px; padding: 16px 18px`.

Notifications are prepended into `#notif-stack` (fixed, `top: 20px; right: 20px`, `min-width: 480px; max-width: 720px`, flex column) so the newest always appears at the top. Spacing between cards is `margin-bottom: 10px` on `.notif` — not `gap` — so it can be animated to zero during dismissal.

---

## Four notification types

| Type    | Icon color | Icon shape                       |
|---------|------------|----------------------------------|
| error   | `#F04248`  | Seal/badge with exclamation mark |
| warning | `#FFD21E`  | Filled circle with exclamation   |
| success | `#00DF80`  | Sparkle / magic wand             |
| info    | `#017FA5`  | Speech bubble with dot           |

The icon SVGs are stored in the `ICONS` object in the inline `<script>`. Each is a 24×24 Material-style SVG. The notification background is always `#1c1f26`; the icon is the only type indicator.

Each notification sets `--notif-color` on its root element (matching its icon color). This is consumed by `.notif-progress`.

---

## Spawning notifications

`spawnNotif(type)` — `type` is `'error'`, `'warning'`, `'info'`, `'success'`, or `'random'`.

- `'random'` resolves to one of the four real types via `pick(TYPES)` before anything else.
- `autoDismiss = Math.random() < 0.5` — decided immediately after type resolution. Any notification from any button can be either persistent or auto-dismissing.
- Heading and description are each picked at random from `CONTENT[type].headings` / `.descs`.
- Action button label is picked at random from `ACTION_LABELS` (12 options).

---

## Behaviours

### Description truncation + disclosure

`.notif-desc` is clamped to one line via `max-height: 1.45em; overflow: hidden`. `max-height` (unlike `-webkit-line-clamp`) does not suppress `scrollHeight`, making truncation detectable via `scrollHeight > clientHeight`.

**Detection** runs in a `requestAnimationFrame` after `prepend()`, so layout is complete:

```js
requestAnimationFrame(() => {
  if (descEl.scrollHeight > descEl.clientHeight) {
    el.classList.add('notif-expandable');
    el.querySelector('.notif-body').addEventListener('click', () => {
      descEl.classList.toggle('notif-desc-expanded');
    });
  }
});
```

**If truncated** (`.notif-expandable` on the card):
- `::after` on `.notif-desc` renders `… More` — `position: absolute; bottom: 0; right: 0`. Background is `linear-gradient(to right, transparent, #1c1f26 40%)` with `padding-left: 24px` to mask text behind it. Color `#8b92a5`, `font-style: italic`, `font-weight: normal` — visually distinct from the bold action button. `pointer-events: none`.
- `.notif-expandable .notif-body` gets `cursor: pointer`.
- Clicking `.notif-body` toggles `.notif-desc-expanded` on `.notif-desc`, which sets `max-height: none; overflow: visible`, revealing the full text. `… More` disappears via `:not(.notif-desc-expanded)` selector.

**If not truncated**: no class added, no click handler, default cursor.

### Auto-dismiss and countdown bar

When `autoDismiss` is true:
- A `.notif-progress` div is `prepend`-ed inside `.notif` — `position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--notif-color); transform-origin: left center`.
- `@keyframes notif-progress` animates `scaleX` from `1` to `0` over **5000ms linear**, providing a visual countdown.
- `setTimeout(() => dismissNotif(el), 5000)` fires the dismissal.

**Pause on click:** a one-time `click` listener on `el` calls `clearTimeout(timer)` and sets `progressEl.style.animationPlayState = 'paused'`. The close button (`e.target.closest('.notif-close')`) is excluded. Once paused, the card is permanent until manually closed.

### Dismiss (`dismissNotif`)

All programmatic and button-triggered dismissals go through `dismissNotif(el)`. Guard at top: `if (el.classList.contains('notif-dismissing')) return` prevents double-firing.

**Phase 1 — slide out:** adds `.notif-dismissing` → `@keyframes notif-out` plays:
```
from: current position
to:   translateX(calc(100% + 40px)), opacity: 0
duration: 0.2s ease-in, fill-mode: forwards
pointer-events: none (on .notif-dismissing)
```

**Phase 2 — height collapse** (on `animationend`, `{ once: true }`):
1. Read current computed values: `el.offsetHeight`, `cs.paddingTop`, `cs.paddingBottom`, `cs.marginBottom` — lock them as inline styles.
2. `el.offsetHeight` — force reflow so the browser registers the locked values before transitioning.
3. Set `transition: height 0.2s ease, padding-top 0.2s ease, padding-bottom 0.2s ease, margin-bottom 0.2s ease`.
4. Set all four to `0` — card collapses vertically, cards below slide up smoothly.
5. On `transitionend` (`{ once: true }`): `el.remove()`.

Total dismiss wall-clock: **~0.4s** (0.2s slide + 0.2s collapse, sequential).

### Swipe to dismiss (mobile)

Touch listeners are attached inline in `spawnNotif`. All are `{ passive: true }`.

**`touchstart`:** records `swipeStartX/Y`, resets `swipeDx = 0`, `swipeIsHoriz = null`. Sets `el.style.transition = 'none'` so the card tracks the finger with zero lag.

**`touchmove`:** waits for **5px** of movement before committing to a direction (`swipeIsHoriz = Math.abs(dx) > Math.abs(dy)`). Once committed to vertical, ignores all further movement (lets the page scroll normally). For horizontal: `swipeDx = Math.max(0, dx)` (right-only). Sets:
- `el.style.transform = translateX(${swipeDx}px)`
- `el.style.opacity = max(0, 1 - swipeDx / 200)` — fully transparent at 200px

**`touchend`:** threshold is **80px**.
- **≥ 80px:** adds `notif-dismissing` (guards against timer double-fire), then:
  - `transition: transform 0.2s ease-out, opacity 0.2s ease-out`
  - Animates to `translateX(calc(100% + 40px))`, opacity `0`
  - On `transitionend` (`{ once: true }`): runs the same height-collapse sequence as Phase 2 of `dismissNotif` (lock → reflow → transition to 0 → remove)
- **< 80px (snap back):**
  - `transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease`
  - Clears `transform` and `opacity` inline styles — card springs back to resting position
  - On `transitionend` (`{ once: true }`): clears `transition` inline style

---

## Animations — timing reference

| Animation | Trigger | Duration | Easing | Notes |
|-----------|---------|----------|--------|-------|
| Entry slide-in | `spawnNotif` | 0.35s | `cubic-bezier(0.22, 1, 0.36, 1)` | Spring-like overshoot feel |
| Exit slide-out | `dismissNotif` / close btn | 0.2s | `ease-in` | Phase 1 of dismiss |
| Height collapse | After slide-out | 0.2s | `ease` | Phase 2; height + padding + margin-bottom |
| Swipe commit slide-out | Touch ≥ 80px | 0.2s | `ease-out` | Then triggers same height collapse |
| Swipe snap-back | Touch < 80px | 0.35s | `cubic-bezier(0.22, 1, 0.36, 1)` | Same easing as entry |
| Countdown bar | Auto-dismiss | 5s | `linear` | scaleX 1→0 on `.notif-progress` |

---

## Debug panel

Fixed, `bottom: 20px; left: 76px` (clears the sidebar). Five buttons:

- **Error / Warning / Info / Success** — spawn a notification of that type (50% auto-dismiss)
- **Random** — spawn a notification of a random type (50% auto-dismiss)

Styled `#1c1f26` with colour-coded buttons at low opacity matching each type's icon color.

---

## Responsive layout

- **`≤ 600px`**: `.notif-stack` goes edge-to-edge (`left: 12px; right: 12px`), `min-width`/`max-width` removed.
- **`≤ 480px`**: `.notif` gets `flex-wrap: wrap`; `.notif-actions` drops to a second line with `margin-left: calc(24px + 24px)` (icon width + gap) to align under the body text.

---

## What is not yet implemented

- Deduplication / key-based coalescing
- Stacking limit (no cap on simultaneous notifications)
- Accessibility (ARIA live region, focus management)
