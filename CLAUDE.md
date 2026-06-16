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
7. **Banner icon uses `currentColor` + CSS filter for color** — the icon element has `color: var(--banner-color)` set on `.banner-icon`; SVG paths use `fill="currentColor"` and Material Icons inherit `color`. The `filter: brightness(0.65) saturate(1.3)` on `.banner-icon` darkens both consistently. Do not hardcode fill colors on banner icons.
8. **`--banner-color-dark` is computed via `color-mix` on the element** — declared inside `.banner { }` so it resolves against the inline `--banner-color` set per instance. Moving it to `:root` would break it.

---

## DOM structure

Three independent components. Banners are in normal document flow (push content down, scroll away). Notifications and Notices are fixed overlays.

```
#banner-stack              — display: flex; flex-direction: column  [no positioning — document flow]
  .banner                  — display: flex; align-items: center; gap: 16px; padding: 11px 20px;
                             --banner-color: <hex>; --banner-color-dark: color-mix(in srgb, var(--banner-color) 70%, #000);
                             background: radial-gradient(ellipse 160% 500% at -10% -150%, <pastel 42%> 0%, <pastel 8%> 65%)
    .banner-icon           — flex-shrink: 0; display: flex; align-items: center; color: var(--banner-color); filter: brightness(0.65) saturate(1.3)
                               svg: width/height 24px; .material-icons: font-size 24px
    .banner-body           — flex: 1; min-width: 0
      .banner-title?       — font-size: 14px; font-weight: 700; color: #1c1f26; margin: 0 0 2px  [omitted when entry has no title]
      .banner-desc         — font-size: 13.5px; color: #3d4455; line-height: 1.45; max-height: calc(1.45em * 2); overflow: hidden; position: relative
    .banner-actions        — display: flex; align-items: center; gap: 20px; flex-shrink: 0
      button.banner-action-btn?  [optional; outlined pill, color: var(--banner-color-dark)]
      button.banner-close?       [omitted if dismissible: false; borderless X at 30% opacity]
```

Adjacent banners: `.banner + .banner` gets `border-top: 1px solid rgba(0,0,0,0.08)`.

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

```
#notice-stack               — position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%); width: min(960px, calc(100vw - 40px)); display: flex; flex-direction: column; align-items: stretch; pointer-events: none
  .notice                   — display: flex; align-items: center; gap: 14px; padding: 14px 18px; margin-bottom: 10px; background: #fff; border: 1px solid rgba(0,0,0,0.09); border-radius: 8px; box-shadow: ...; pointer-events: all
    .notice-icon?           — flex-shrink: 0; color: #395979; .material-icons: font-size 20px
    .notice-body            — flex: 1; min-width: 0
      .notice-heading?      — font-size: 14px; font-weight: 700; color: #1c1f26; margin-bottom: 2px
      .notice-desc?         — font-size: 13.5px; color: #3d4455; line-height: 1.45
    .notice-actions?        — display: flex; align-items: center; gap: 8px; flex-shrink: 0
      button.notice-action-btn.notice-action-primary  [first button: background #395979, color #fff]
      button.notice-action-btn                        [subsequent: outlined, color #395979]
    .notice-close?          — borderless X at 30% opacity [omitted if dismissible: false]
```

**Notice is a singleton** — `spawnNotice` calls `dismissNotice` on any existing notice before appending the new one. `#notice-stack .notice:not(.notice-dismissing)` is the guard query.

The `#notice-stack` itself has `pointer-events: none` so clicks pass through the empty container area; individual `.notice` cards restore `pointer-events: all`.

---

## Notification types

| Type    | `--notif-color` |
|---------|-----------------|
| error   | `#F04248`       |
| warning | `#FFD21E`       |
| success | `#00DF80`       |
| info    | `#017FA5`       |

Each type has a corresponding SVG icon. Icon color is the only visual type indicator; card background is always `#1c1f26`.

---

## Data interfaces

### Notification entry: `{ key, heading, desc, autoDismiss, actions? }`

- `key` — unique string for deduplication
- `heading` — bold title line
- `desc` — body text; clamped to 1 line with `… More` disclosure if it overflows
- `autoDismiss` — boolean; when true the card self-dismisses after 5s with a countdown bar
- `actions` — optional array of 1–2 button label strings; if absent, a single fallback label is used

Error and warning notifications are never auto-dismissed. Some success and info notifications auto-dismiss.

### Notice entry: `{ heading?, desc?, actions?, icon?, dismissible? }`

- `heading` — optional bold title line (14px 700)
- `desc` — optional body text (13.5px)
- `actions` — optional array of 1–3 button labels; first renders as filled primary, rest as outlined
- `icon` — optional Material Icons name; renders in `#395979`
- `dismissible` — defaults to `true`; when `false`, no close button

### Banner entry: `{ key, title?, desc, action?, dismissible? }`

- `key` — unique string identifier
- `title` — optional bold heading rendered above `desc` in `.banner-title`
- `desc` — body text; clamped to 2 lines with `… More` disclosure if it overflows
- `action` — optional button label string
- `dismissible` — defaults to `true`; when `false`, no close button is rendered

Banners have no `autoDismiss` — they are always persistent.

---

## `spawnBanner({ color, iconHtml, title, desc, action, dismissible })`

1. Create `.banner`; set `--banner-color` to `color`.
2. Set `innerHTML`: `iconHtml` into `.banner-icon`; optionally `.banner-title` (omitted when `title` is falsy); desc into `.banner-desc`; conditionally `banner-action-btn` and `banner-close`.
3. If `dismissible`, wire close button to `dismissBanner(el)`.
4. `appendChild` into `#banner-stack`.
5. Run truncation detection in `requestAnimationFrame`: if `descEl.scrollHeight > descEl.clientHeight`, add `.banner-expandable` to the card and wire a click handler on `.banner-body` to toggle `.banner-desc-expanded` on the desc element.

Truncation CSS:
- `.banner-desc` — `max-height: calc(1.45em * 2)` (same `max-height` rationale as `.notif-desc`)
- `.banner-expandable .banner-body` — `cursor: pointer`
- `.banner-expandable .banner-desc:not(.banner-desc-expanded)::after` — renders `… More`; gradient uses `color-mix(in srgb, var(--banner-color) 8%, #fff)` to match the right-edge banner background
- `.banner-desc-expanded` — `max-height: none; overflow: visible`

`iconHtml` is a raw HTML string — either a `<span class="material-icons">name</span>` or an SVG with `fill="currentColor"`. The `.banner-icon` CSS filter handles darkening.

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

1. If `type === 'random'`, resolve to a real type.
2. Pick an entry for that type; destructure `{ key, heading, desc, autoDismiss, actions }`.
3. **Coalesce check** — see Deduplication section.
4. Create `.notif` element; set `data-notif-key = key`, `_notifCount = 1`, `--notif-color`.
5. Build action buttons HTML from `entry.actions` (or a single fallback label). Set `innerHTML` with icon, body (heading + desc), action buttons, and close button.
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

## `spawnNotice({ heading, desc, actions, icon, dismissible })`

1. Dismiss any existing non-dismissing notice via `dismissNotice`.
2. Create `.notice`; build `actionBtns` HTML (first gets `.notice-action-primary`).
3. Set `innerHTML` with optional icon, body (heading + desc), optional actions, optional close button.
4. If `dismissible`, wire close button to `dismissNotice(el)`.
5. `appendChild` into `#notice-stack`.

---

## `dismissNotice(el)`

Guard: `if (el.classList.contains('notice-dismissing')) return`.

**Phase 1 — slide down:**
Add `.notice-dismissing` → `@keyframes notice-out` (`to: translateY(calc(100% + 20px)), opacity: 0`; `0.2s ease-in forwards`). Also sets `pointer-events: none; overflow: hidden`.

**Phase 2 — height collapse** (on `animationend`, `{ once: true }`): identical pattern to `dismissNotif` — lock height + padding + marginBottom as inline styles, force reflow, transition all to 0, remove on `transitionend`.

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
| Notice entry | 0.3s | `cubic-bezier(0.22, 1, 0.36, 1)` | `notice-in`: `translateY(12px)→0`, opacity `0→1` |
| Notice exit | 0.2s / 0.2s | `ease-in` / `ease` | `notice-out`: `→translateY(calc(100%+20px))`, opacity `→0`; then height collapse |

---

## Responsive breakpoints

- **≤ 600px**: `.notif-stack` — `left: 12px; right: 12px; min-width: unset; max-width: unset`
- **≤ 480px**: `.notif` — `flex-wrap: wrap`; `.notif-actions` — `width: 100%; margin-left: calc(24px + 24px)` (aligns under body text)
- **≤ 480px**: `.banner` — `flex-wrap: wrap`; `.banner-actions` — `width: 100%; margin-left: calc(24px + 16px)`

---

## Not yet implemented

- Stacking limit (no cap on simultaneous notifications or banners)
- Accessibility (ARIA live region, focus management)
- Notice: no swipe-to-dismiss, no auto-dismiss
