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
  .notif-body       — heading + description (cursor: pointer on expandable cards)
    .notif-heading  — bold title text
    .notif-desc     — description, clamped to 1 line by default
  .notif-actions    — right-aligned action button + close button
    button.notif-action-btn — CTA with a random label from ACTION_LABELS
    button.notif-close      — circular × button
```

Notifications are prepended into `#notif-stack` (fixed top-right, flex column) so the newest always appears at the top. Spacing between cards is `margin-bottom: 10px` on `.notif` (not `gap`) so it can be animated during dismissal.

---

## Four notification types

| Type    | Icon color | Icon shape                        |
|---------|------------|-----------------------------------|
| error   | `#F04248`  | Seal/badge with exclamation mark  |
| warning | `#FFD21E`  | Filled circle with exclamation    |
| success | `#00DF80`  | Sparkle / magic wand              |
| info    | `#017FA5`  | Speech bubble with dot            |

The icon SVGs are stored in the `ICONS` object in the inline `<script>`. Each is a 24×24 Material-style SVG. The notification background is always `#1c1f26` (dark) regardless of type — the icon is the only type indicator.

Each notification sets a `--notif-color` CSS custom property (matching its icon color) used by the progress bar.

---

## Spawning notifications

All notifications are created dynamically by `spawnNotif(type)`, where `type` is `'error'`, `'warning'`, `'info'`, `'success'`, or `'random'`.

- If `type === 'random'`, it is resolved to one of the four real types first.
- After resolving the type, `Math.random() < 0.5` determines whether the notification auto-dismisses. Any spawned notification — regardless of which button triggered it — may or may not auto-dismiss.

The `CONTENT` object holds arrays of `headings` and `descs` per type. Each call picks one of each at random. Descriptions intentionally vary in length to exercise the truncation/disclosure behaviour.

The `ACTION_LABELS` array holds 12 generic CTA strings (e.g. "Learn more", "Retry", "Fix now"). Each notification picks one at random.

---

## Behaviours

### Description truncation + disclosure

`.notif-desc` is clamped to one line via `max-height: 1.45em; overflow: hidden`. This approach (rather than `-webkit-line-clamp`) makes truncation detectable via `scrollHeight > clientHeight`.

After the notification is inserted into the DOM, a `requestAnimationFrame` callback checks:

```js
if (descEl.scrollHeight > descEl.clientHeight) {
  el.classList.add('notif-expandable');
  // wire click handler
}
```

**If truncated** (`.notif-expandable`):
- A `… More` label appears at the bottom-right via `::after`, with a short left-to-right gradient masking the text behind it. Styled italic, muted (`#8b92a5`), normal weight — visually distinct from the bold action button.
- `.notif-body` gets `cursor: pointer`.
- Clicking `.notif-body` toggles `.notif-desc-expanded`, which overrides `max-height` with `none`.

**If not truncated**: no indicator, no click handler, default cursor.

### Auto-dismiss and countdown bar

When `autoDismiss` is true, a `.notif-progress` div is prepended inside the notification. It animates via `@keyframes notif-progress` (scaleX 1→0 over 5s, `transform-origin: left center`) using `--notif-color` as its color. A `setTimeout` fires `dismissNotif(el)` after 5000ms.

### Pause on click

For auto-dismiss notifications: a one-time `click` listener calls `clearTimeout(timer)` and sets `progressEl.style.animationPlayState = 'paused'`. Clicking the close button is excluded. Once paused, the notification stays until manually dismissed.

### Dismiss

All dismissals go through `dismissNotif(el)`:

1. Adds `.notif-dismissing` — plays `@keyframes notif-out` (slide right + fade, 0.2s ease-in).
2. On `animationend`: locks the element's current height, padding, and margin-bottom as inline styles, forces a reflow, then transitions them all to `0` over 0.2s. This collapses the vertical space and smoothly reflows remaining notifications.
3. On `transitionend`: calls `el.remove()`.

The guard `if (el.classList.contains('notif-dismissing')) return` prevents double-firing.

### Swipe to dismiss (mobile)

Each notification has `touchstart` / `touchmove` / `touchend` listeners:

- **`touchstart`**: records start position, clears inline transition.
- **`touchmove`**: waits for 5px of movement before deciding horizontal vs. vertical (avoids stealing scroll). Only tracks rightward swipes. Translates the card and fades opacity proportionally.
- **`touchend`**: if swipe distance > 80px, adds `notif-dismissing`, slides the card off-screen, then collapses height/padding/margin the same way as a normal dismiss. If under the threshold, springs back with the entry easing.

---

## Entry animation

```css
@keyframes notif-in {
  from { transform: translateX(calc(100% + 40px)); opacity: 0; }
  to   { transform: translateX(0);                 opacity: 1; }
}
.notif {
  animation: notif-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## Exit animation and reflow

```css
@keyframes notif-out {
  to { transform: translateX(calc(100% + 40px)); opacity: 0; }
}
.notif-dismissing {
  animation: notif-out 0.2s ease-in forwards;
  pointer-events: none;
}
```

After the slide-out completes, `dismissNotif` collapses height/padding/margin-bottom via CSS transition so remaining notifications slide up smoothly. `gap` cannot be animated, which is why spacing is `margin-bottom` on `.notif` rather than `gap` on `.notif-stack`.

---

## Debug panel

A fixed panel at the bottom-left (`left: 76px` to clear the sidebar) with five buttons:

- **Error / Warning / Info / Success** — spawn a notification of that type (50% chance of auto-dismiss)
- **Random** — spawn a notification of a randomly chosen type (50% chance of auto-dismiss)

The panel is styled dark (`#1c1f26`) with colour-coded buttons matching each type's icon colour at low opacity.

---

## Responsive layout

- `@media (max-width: 600px)`: `.notif-stack` stretches edge-to-edge (`left: 12px; right: 12px`), width constraints removed.
- `@media (max-width: 480px)`: `.notif` wraps (`flex-wrap: wrap`); `.notif-actions` drops to a second line, indented to align under the body text (`margin-left: calc(24px + 24px)`).

---

## What is not yet implemented

- Deduplication / key-based coalescing
- Stacking limit (no cap on simultaneous notifications)
- Accessibility (ARIA live region, focus management)
