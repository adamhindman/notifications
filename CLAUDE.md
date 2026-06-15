# Notifications Prototype

Vanilla JS + Vite. All styles in `src/style.css`; all markup and logic in `index.html` (inline `<script>`).

---

## Critical implementation constraints

These are non-obvious decisions that will produce subtle bugs if changed:

1. **`margin-bottom: 10px` on `.notif`, not `gap` on `.notif-stack`** — `gap` cannot be CSS-transitioned to zero, so the height-collapse animation would leave a gap behind.
2. **`max-height: 1.45em` on `.notif-desc`, not `-webkit-line-clamp`** — `-webkit-line-clamp` suppresses `scrollHeight`, making `scrollHeight > clientHeight` always false and breaking truncation detection.
3. **Truncation detection runs in `requestAnimationFrame` after `prepend()`** — layout is not complete at call time; the rAF defers until the browser has measured the element.
4. **Height collapse requires a forced reflow before the transition** — after locking computed values as inline styles, read `el.offsetHeight` to force the browser to register them before the transition target values are set. Without this, the browser batches the assignments and skips the animation.
5. **Coalesce query uses `:not(.notif-dismissing)`** — must not coalesce into a card that is already animating out.
6. **`animationPlayState` and `setTimeout` are paused/resumed together** — setting both at the same moment is what keeps the CSS progress bar in sync with the JS timer.

---

## DOM structure

Two independent stacks. Banners are in normal document flow (push content down, scroll away). Notifications are a fixed overlay.

```
#banner-stack              — display: flex; flex-direction: column  [no positioning — document flow]
  .banner                  — display: flex; align-items: center; gap: 16px; padding: 11px 20px; background: #1c1f26; border-left: 4px solid var(--banner-color); --banner-color: <type color>
    .banner-icon           — flex-shrink: 0; display: flex; align-items: center
    .banner-body           — flex: 1; min-width: 0
      .banner-desc         — font-size: 13.5px; color: #c8cdd6; line-height: 1.45
    .banner-actions        — display: flex; align-items: center; gap: 20px; flex-shrink: 0
      button.banner-action-btn?  [omitted if no entry.action]
      button.banner-close?       [omitted if dismissible: false]
```

Adjacent banners: `.banner + .banner` gets `border-top: 1px solid rgba(255,255,255,0.06)`.

```
#notif-stack                — position: fixed; top: 20px; right: 20px; min-width: 480px; max-width: 720px; display: flex; flex-direction: column
  .notif                    — position: relative; overflow: hidden; display: flex; align-items: center; gap: 24px; padding: 16px 18px; margin-bottom: 10px; background: #1c1f26; border-radius: 5px; --notif-color: <type color>
    .notif-progress?        — position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--notif-color); transform-origin: left center  [auto-dismiss only]
    .notif-icon             — flex-shrink: 0; align-self: flex-start; padding-top: 2px
    .notif-body             — flex: 1; min-width: 0; cursor: pointer [only when .notif-expandable]
      .notif-heading        — font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 2px
        .notif-badge?       — inline <span>; display: inline-flex; height: 18px; border-radius: 9px; background: rgba(255,255,255,0.18); font-size: 11px; font-weight: 700; padding: 0 5px; margin-left: 8px  [count ≥ 2 only]
      .notif-desc           — font-size: 13.5px; color: #c8cdd6; line-height: 1.45; max-height: 1.45em; overflow: hidden; position: relative
    .notif-actions          — display: flex; align-items: center; gap: 20px; flex-shrink: 0; align-self: center
      button.notif-action-btn  [1–2 buttons depending on entry.actions]
      button.notif-close    — 30×30px circle; border: 1.5px solid rgba(255,255,255,0.18)
```

Newest notification is always at top (`prepend()` into `#notif-stack`).

---

## Notification types

| Type    | `--notif-color` | Icon SVG object key |
|---------|-----------------|---------------------|
| error   | `#F04248`       | `ICONS.error`       |
| warning | `#FFD21E`       | `ICONS.warning`     |
| success | `#00DF80`       | `ICONS.success`     |
| info    | `#017FA5`       | `ICONS.info`        |

Icon color is the only visual type indicator; card background is always `#1c1f26`.

---

## Content and keys

`CONTENT[type]` is an array of objects: `{ key, heading, desc, autoDismiss, actions? }`.

`actions` is an optional array of 1–2 button label strings. If present, those labels are used verbatim. If absent, a single label is picked at random from `ACTION_LABELS`. Entries with two buttons:
- `upload-failed`: `['Retry', 'View error']`
- `session-expiring`: `['Extend session', 'Log out']`
- `export-ready`: `['Download', 'Share link']`
- `new-version`: `['Update now', "What's new"]`
- `collab-invite`: `['Accept', 'Decline']`

`autoDismiss` is fixed per key and reflects intended production behavior, but **is not used at spawn time** — the global `debugAutoDismiss` toggle controls whether timers fire (see Debug panel). The per-key values are retained as the source-of-truth policy for when this prototype is wired to real triggers.

Policy for reference:
- **error**: all `false`
- **warning**: all `false`
- **success**: `true` for `changes-saved`, `upload-complete`, `analysis-finished`, `sync-complete`, `invitation-sent`; `false` for `export-ready`
- **info**: `true` for `dataset-updated`, `tip`; `false` for `new-version`, `maintenance`, `collab-invite`

`ACTION_LABELS` — 12 options, one picked at random per spawn.

---

## Banner content

`BANNER_CONTENT[type]` is an array of objects: `{ key, desc, action?, dismissible? }`.

- `action` — optional button label string; omitted for banners with no CTA
- `dismissible` — defaults to `true`; when `false`, no close button is rendered and the user cannot dismiss the banner (only the system can remove it when the condition resolves)

Non-dismissable entries: `quota-exceeded`, `policy-update`.

Banners have no `autoDismiss` — they are always persistent.

---

## `spawnBanner(type)`

1. If `type === 'random'`, resolve to a real type via `pick(TYPES)`.
2. Pick a random entry; destructure `{ key, desc, action, dismissible = true }`.
3. Create `.banner`; set `data-banner-key`, `--banner-color`.
4. Set `innerHTML`: icon, body (`banner-desc`), actions (conditionally include `banner-action-btn` and `banner-close`).
5. If `dismissible`, wire close button to `dismissBanner(el)`.
6. `appendChild` into `#banner-stack`.

---

## `dismissBanner(el)`

Guard: `if (el.classList.contains('banner-dismissing')) return`. Single-phase collapse (no directional slide):

```js
el.classList.add('banner-dismissing'); // pointer-events: none; overflow: hidden
const cs = getComputedStyle(el);
el.style.height = el.offsetHeight + 'px';
el.style.paddingTop = cs.paddingTop;
el.style.paddingBottom = cs.paddingBottom;
el.offsetHeight; // force reflow
el.style.transition = 'height 0.2s ease, padding-top 0.2s ease, padding-bottom 0.2s ease, opacity 0.15s ease';
el.style.height = '0';
el.style.paddingTop = '0';
el.style.paddingBottom = '0';
el.style.opacity = '0';
el.addEventListener('transitionend', () => el.remove(), { once: true });
```

---

## `spawnNotif(type)`

1. If `type === 'random'`, resolve to a real type via `pick(TYPES)`.
2. Pick a random entry from `CONTENT[type]`; destructure `{ key, heading, desc, autoDismiss }`.
3. **Coalesce check** — see section below.
4. Create `.notif` element; set `data-notif-key = key`, `_notifCount = 1`, `--notif-color`.
5. Build `actionBtns` HTML: `(entry.actions || [pick(ACTION_LABELS)]).map(label => \`<button class="notif-action-btn">${label}</button>\`).join('')`. Set `innerHTML` with icon, body (heading + desc), `${actionBtns}`, and close btn.
6. Wire close button (see Deduplication).
7. Attach touch listeners for swipe-to-dismiss.
8. `prepend()` into `#notif-stack`.
9. Run truncation detection in `requestAnimationFrame`.
10. If `autoDismiss`, set up progress bar and hover-pause timer.

---

## Deduplication (key-based coalescing)

```js
const existing = document.querySelector(`[data-notif-key="${key}"]:not(.notif-dismissing)`);
if (existing) {
  if (existing._cancelAutoDismiss) {
    existing._cancelAutoDismiss(); // clears timer + removes progress bar
    existing._cancelAutoDismiss = null;
  }
  existing._notifCount++;
  let badge = existing.querySelector('.notif-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notif-badge';
    existing.querySelector('.notif-heading').appendChild(badge);
  }
  badge.textContent = existing._notifCount;
  badge.classList.remove('notif-badge-pulse');
  badge.offsetWidth; // force reflow to restart animation
  badge.classList.add('notif-badge-pulse');
  badge.addEventListener('animationend', () => badge.classList.remove('notif-badge-pulse'), { once: true });
  return;
}
```

**Close button with count > 1:**
- Decrement `_notifCount`.
- Count drops to 1 → remove badge element.
- Count still > 1 → update badge text, re-trigger pulse.
- Count was 1 → call `dismissNotif(el)`.

---

## Auto-dismiss and hover-pause

```js
const progressEl = document.createElement('div');
progressEl.className = 'notif-progress';
el.prepend(progressEl);

let remaining = 5000;
let startTime = Date.now();
let timer = setTimeout(() => dismissNotif(el), remaining);

el._cancelAutoDismiss = () => { clearTimeout(timer); progressEl.remove(); };

el.addEventListener('mouseenter', () => {
  clearTimeout(timer);
  remaining -= Date.now() - startTime;
  progressEl.style.animationPlayState = 'paused';
});

el.addEventListener('mouseleave', () => {
  if (el.classList.contains('notif-dismissing')) return;
  startTime = Date.now();
  timer = setTimeout(() => dismissNotif(el), remaining);
  progressEl.style.animationPlayState = 'running';
});
```

`@keyframes notif-progress`: `scaleX` from `1` to `0`, `5s linear forwards`, `transform-origin: left center`.

---

## Truncation detection and expand

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

- `.notif-expandable .notif-body` → `cursor: pointer`
- `.notif-expandable .notif-desc:not(.notif-desc-expanded)::after` → renders `… More`; `position: absolute; bottom: 0; right: 0; padding-left: 24px; background: linear-gradient(to right, transparent, #1c1f26 40%); color: #8b92a5; font-style: italic; font-weight: normal; pointer-events: none`
- `.notif-desc-expanded` → `max-height: none; overflow: visible` (hides `::after` via `:not()` selector)

---

## `dismissNotif(el)`

Guard: `if (el.classList.contains('notif-dismissing')) return`.

**Phase 1 — slide out:**
Add `.notif-dismissing` → `@keyframes notif-out` (`to: translateX(calc(100% + 40px)), opacity: 0`; `0.2s ease-in forwards`). `.notif-dismissing` also sets `pointer-events: none`.

**Phase 2 — height collapse** (on `animationend`, `{ once: true }`):
```js
const cs = getComputedStyle(el);
el.style.height = el.offsetHeight + 'px';
el.style.paddingTop = cs.paddingTop;
el.style.paddingBottom = cs.paddingBottom;
el.style.marginBottom = cs.marginBottom;
el.offsetHeight; // force reflow
el.style.transition = 'height 0.2s ease, padding-top 0.2s ease, padding-bottom 0.2s ease, margin-bottom 0.2s ease';
el.style.height = '0';
el.style.paddingTop = '0';
el.style.paddingBottom = '0';
el.style.marginBottom = '0';
el.addEventListener('transitionend', () => el.remove(), { once: true });
```

---

## Swipe to dismiss

All touch listeners use `{ passive: true }`. Variables per card: `swipeStartX`, `swipeStartY`, `swipeDx = 0`, `swipeIsHoriz = null`.

**`touchstart`:** record start coords; reset `swipeDx`, `swipeIsHoriz`; set `el.style.transition = 'none'`.

**`touchmove`:** wait for 5px movement before committing direction (`swipeIsHoriz = Math.abs(dx) > Math.abs(dy)`). If vertical, ignore remaining events. If horizontal: `swipeDx = Math.max(0, dx)` (right-only); set `transform: translateX(${swipeDx}px)` and `opacity: Math.max(0, 1 - swipeDx / 200)`.

**`touchend`:**
- **`swipeDx > 80px`:** add `notif-dismissing`; set `transition: transform 0.2s ease-out, opacity 0.2s ease-out`; animate to `translateX(calc(100% + 40px))` / opacity 0; on `transitionend` run Phase 2 height collapse identical to `dismissNotif`.
- **`swipeDx ≤ 80px`:** set `transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease`; clear `transform` and `opacity` inline styles; on `transitionend` clear `transition`.

---

## Animations

| Animation | Duration | Easing | Keyframe / property |
|-----------|----------|--------|---------------------|
| Entry slide-in | 0.35s | `cubic-bezier(0.22, 1, 0.36, 1)` | `notif-in`: `translateX(100%+40px)→0`, opacity `0→1` |
| Exit slide-out | 0.2s | `ease-in` | `notif-out`: `→translateX(100%+40px)`, opacity `→0`; `forwards` |
| Height collapse | 0.2s | `ease` | JS transition: height + paddingTop + paddingBottom + marginBottom → 0 |
| Swipe slide-out | 0.2s | `ease-out` | same target as exit slide-out; triggers same height collapse |
| Swipe snap-back | 0.35s | `cubic-bezier(0.22, 1, 0.36, 1)` | clear transform/opacity inline styles |
| Countdown bar | 5s | `linear` | `notif-progress`: `scaleX(1)→scaleX(0)`; `forwards` |
| Badge pulse | 0.25s | `ease-out` | `notif-badge-pulse`: `scale(1)→scale(1.4)→scale(1)` |
| Banner entry | 0.25s | `ease-out` | `banner-in`: `translateY(-6px)→0`, opacity `0→1` |
| Banner dismiss | 0.2s / 0.15s | `ease` / `ease` | JS transition: height + padding → 0 (0.2s), opacity → 0 (0.15s) |

---

## Responsive breakpoints

- **≤ 600px**: `.notif-stack` — `left: 12px; right: 12px; min-width: unset; max-width: unset`
- **≤ 480px**: `.notif` — `flex-wrap: wrap`; `.notif-actions` — `width: 100%; margin-left: calc(24px + 24px)` (aligns under body text)

---

## Debug panel

Fixed, `bottom: 20px; left: 76px`. Controls:

- **Notif | Banner pill** — selects which component to spawn (`selectedComponent`); active side is full opacity with `rgba(255,255,255,0.12)` background, inactive side dimmed to 0.4 opacity. Default: Notif.
- **Error / Warning / Info / Success / Random** — spawns immediately using `spawnSelected(type)`, which delegates to `spawnNotif` or `spawnBanner` based on `selectedComponent`.
- **Timer toggle** — clock icon (`#debug-timer-toggle`); toggles `debugAutoDismiss`. Only affects notifications — banners are always persistent and have no auto-dismiss logic. Default: off.

Dividers (`.debug-divider`, 1px, `rgba(255,255,255,0.15)`) separate the pill, type buttons, and timer toggle.

---

## Not yet implemented

- Stacking limit (no cap on simultaneous notifications)
- Accessibility (ARIA live region, focus management)
