---
name: Tailwind v4 dark mode
description: How to force dark mode in Tailwind v4 — @apply dark is not valid.
---

In Tailwind v4, `dark` is a variant modifier, not a utility class. Using `@apply dark` in CSS causes a build error: "Cannot apply unknown utility class `dark`".

**Why:** Tailwind v4 changed how variants work — they can't be applied as standalone utilities.

**How to apply:** Add `document.documentElement.classList.add("dark")` in `main.tsx` (before rendering). This adds the `dark` class to `<html>` which activates the `@custom-variant dark (&:is(.dark *))` rule defined in `index.css`.
