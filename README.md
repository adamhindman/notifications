# Notifications

A prototype in-app notification system built with vanilla JavaScript and Vite, designed for a Synapse-style project page.

## Features

- **Four notification types** — error, warning, info, success — each with a distinct icon and color
- **Auto-dismiss** — 50% of notifications auto-dismiss after 5 seconds with an animated countdown bar; clicking anywhere on the card cancels the timer
- **Truncation disclosure** — long descriptions are clamped to one line with a `… More` affordance; clicking the body expands the full text
- **Entry animation** — notifications slide in from the right with a spring easing
- **Exit animation + reflow** — dismissing a card slides it out then collapses its height, smoothly closing the gap for remaining notifications
- **Swipe to dismiss** — on mobile, swipe right to dismiss; releases under the threshold snap back

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
