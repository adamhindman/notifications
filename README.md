# Notifications

**Live demo:** https://adamhindman.github.io/notifications/

A prototype covering three in-app alert patterns — popup notifications, full-width page banners, and a bottom-center notice — built with vanilla JavaScript and Vite on a mock Synapse project page.

## Popup notifications

Appear as cards in the top-right corner, stacking newest-on-top.

- **Four types** — error, warning, info, success — each with a distinct icon and color
- **Auto-dismiss** — select types auto-dismiss after 5 seconds with an animated countdown bar; hovering pauses the timer and resumes on mouse-out
- **Deduplication** — repeated notifications of the same type coalesce into a single card with a badge count; closing decrements the count
- **Truncation disclosure** — long descriptions are clamped to one line with a `… More` affordance; clicking the body expands the full text
- **Entry / exit animation** — cards slide in from the right; dismissal slides out then collapses height, closing the gap for remaining cards
- **Swipe to dismiss** — on mobile, swipe right to dismiss; short swipes snap back
- **One or two action buttons** — notifications can carry a single action or a pair of contextual actions (e.g. Accept / Decline)

## Page banners

Appear at the top of the page, push content down, and scroll away with the page.

- **General-purpose** — not type-based; each banner takes an arbitrary color and a Material Icon
- **Title + description** — a bold heading sits above the body text
- **Radial gradient background** — pastel wash derived from the banner color, fading from the upper-left
- **Always persistent** — no auto-dismiss
- **Optionally non-dismissable** — some banners have no close button; they can only be removed when the underlying condition resolves
- **Optional action button** — an outlined pill CTA; shown on a random subset of banners
- **Truncation disclosure** — long descriptions are clamped to two lines with a `… More` affordance; clicking the body expands the full text

## Bottom notice

Floats above the page content at the bottom center, always showing exactly one at a time.

- **Singleton** — spawning a new notice dismisses the current one first
- **White card** — solid white background with shadow; accent color `#395979` for icons and buttons
- **Optional icon** — Material Icon in the accent color
- **Up to three action buttons** — first renders as a filled primary button, rest as outlined
- **Optionally non-dismissable** — entries like session expiry have no close button

## Debug panel

A fixed panel at the bottom-left lets you spawn any of the three components.

**Notif mode:**
- **Error / Warning / Info / Success / Random** — spawns a notification of that type
- **Timer toggle** (clock icon) — forces auto-dismiss on all notifications

**Banner mode:**
- **Color picker** — choose any color; the gradient and icon adapt automatically
- **Icon picker** — popover grid of 23 Material Icons
- **Spawn** — spawns a banner with the current color and icon
- **Random** — picks a random color from 36 curated options, a random icon, and random announcement text
- **Long** — spawns a guaranteed-overflow banner for testing the `… More` disclosure

**Notice mode:**
- **Spawn** — dismisses the current notice and spawns a random one

A **Preview panel** at the bottom-right swaps the page content with a screenshot of a selected Sage portal, for testing components in context across different products.

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
