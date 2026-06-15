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

- **Same four types** with matching icons and colors
- **Always persistent** — no auto-dismiss
- **Optionally non-dismissable** — some banners (e.g. quota exceeded, policy update) have no close button; they can only be removed when the underlying condition resolves
- **Optional action button** — banners can include a single CTA

## Debug panel

A fixed panel at the bottom-left lets you spawn either component in any of the four types:

- **Notif / Banner pill** — selects which component to target
- **Error / Warning / Info / Success / Random** — spawns immediately using the selected component
- **Timer toggle** (clock icon) — forces auto-dismiss on all notifications; has no effect on banners

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
