# Notifications

**Live demo:** https://adamhindman.github.io/notifications/

A prototype covering two in-app alert patterns — popup notifications and full-width page banners — built with vanilla JavaScript and Vite on a mock Synapse project page.

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
- **Radial gradient background** — pastel wash derived from the banner color, fading from the upper-left
- **Always persistent** — no auto-dismiss
- **Optionally non-dismissable** — some banners have no close button; they can only be removed when the underlying condition resolves
- **Optional action button** — an outlined pill CTA; shown on a random subset of banners

## Debug panel

A fixed panel at the bottom-left lets you spawn either component.

**Notif mode:**
- **Error / Warning / Info / Success / Random** — spawns a notification of that type
- **Timer toggle** (clock icon) — forces auto-dismiss on all notifications

**Banner mode:**
- **Color picker** — choose any color; the gradient and icon adapt automatically
- **Icon picker** — popover grid of 23 Material Icons
- **Spawn** — spawns a banner with the current color and icon
- **Random** — picks a random color from 36 curated options, a random icon, and random announcement text

A **Preview panel** at the bottom-right swaps the page content with a screenshot of a selected Sage portal, for testing banners in context across different products.

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
