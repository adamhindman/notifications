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
  .notif-icon       — 24×24 SVG icon, aligned to the top of the card
  .notif-body       — heading + description
    .notif-heading  — bold title text
    .notif-desc     — description, clamped to 1 line by default
  .notif-actions    — right-aligned action button + close button
    button.notif-action-btn — optional CTA (text label, no border)
    button.notif-close      — circular × button
```

Notifications are prepended into `#notif-stack` (fixed top-right, flex column, gap 10px) so the newest always appears at the top.

---

## Four notification types

| Type    | Icon color | Icon shape                        |
|---------|------------|-----------------------------------|
| error   | `#F04248`  | Seal/badge with exclamation mark  |
| warning | `#FFD21E`  | Filled circle with exclamation    |
| success | `#00DF80`  | Sparkle / magic wand              |
| info    | `#017FA5`  | Speech bubble with dot            |

The icon SVGs are stored in the `ICONS` object in the inline `<script>`. Each is a 24×24 Material-style SVG. The notification background is always `#1c1f26` (dark) regardless of type — the icon is the only type indicator.

---

## Spawning notifications

All notifications are created dynamically by `spawnNotif(type)`, where `type` is `'error'`, `'warning'`, `'info'`, `'success'`, or `'random'`.

```js
spawnNotif('error')   // permanent until dismissed
spawnNotif('random')  // auto-dismisses after 5 seconds
```

The `CONTENT` object holds arrays of `headings` and `descs` per type. Each call picks one of each at random. Descriptions intentionally vary in length — some are short (one line), some are long (multi-line) — to exercise the truncation and disclosure behaviour.

---

## Behaviours

### Description truncation + disclosure

`.notif-desc` is clamped to 1 line via `-webkit-line-clamp: 1`. After the element is inserted into the DOM, truncation detection is deferred with `requestAnimationFrame` so layout is complete before measuring.

**Detection method:** temporarily override the element's inline styles to remove the clamp (`display:block; -webkit-line-clamp:unset; overflow:visible`), read `offsetHeight` (forces reflow), then restore by clearing the inline style. Compare the natural height against `1.5 × computedLineHeight`. This threshold cleanly separates 1-line content (~20px) from 2+-line content (~40px) without being tripped up by sub-pixel rounding differences.

- If `naturalH > lineH * 1.5` → text is truncated; add `.notif-expandable` to the card
- If `naturalH <= lineH * 1.5` → text fits; no action needed

**Disclosure:** clicking anywhere on a `.notif-expandable` card toggles `.notif-desc-expanded` on `.notif-desc`, which overrides the clamp with `display: block`. Clicks on `.notif-action-btn` or `.notif-close` are excluded via `e.target.closest()` so those buttons work normally. `.notif-expandable .notif-body` gets `cursor: pointer` to indicate the body is clickable.

**Why not `scrollHeight > clientHeight`?** Browsers cap `scrollHeight` to the clamped height when `-webkit-line-clamp` is active in some versions, and sub-pixel rounding makes the values differ by 1px even for single-line content — causing false positives either way.

### Auto-dismiss

Notifications spawned via `'random'` are given a 5-second `setTimeout` that calls `el.remove()`. The type is resolved to one of the four real types before content is selected, so a random notification looks identical to an explicit one — the only difference is the timer.

### Pause on click

For auto-dismiss notifications only: a one-time `click` listener on the notification element calls `clearTimeout(timer)`. Once clicked anywhere, the timer is cancelled permanently and the notification stays until the close button is used.

### Close button

`.notif-close` calls `el.remove()` directly. No animation on exit (not yet implemented).

---

## Entry animation

Notifications slide in from the right:

```css
@keyframes notif-in {
  from { transform: translateX(calc(100% + 40px)); opacity: 0; }
  to   { transform: translateX(0);                 opacity: 1; }
}
.notif {
  animation: notif-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
```

Exit animation is not yet implemented.

---

## Debug panel

A fixed panel at the bottom-left (`left: 76px` to clear the sidebar) with five buttons:

- **Error / Warning / Info / Success** — spawn a permanent notification of that type
- **Random** — spawn a notification of a randomly chosen type that auto-dismisses after 5 seconds

The panel is styled dark (`#1c1f26`) with colour-coded buttons matching each type's icon colour at low opacity.

---

## What is not yet implemented

- Exit / dismiss animation
- A progress bar or visual countdown for auto-dismiss notifications
- Stacking limit (no cap on how many can appear simultaneously)
- Accessibility (ARIA live region, focus management)
