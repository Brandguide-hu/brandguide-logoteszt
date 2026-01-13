| name | description | license |
|------|-------------|---------|
| brandguide-design-system | Brandguide design system for consistent UI across projects. Use this skill when building Brandguide-branded interfaces. Provides color tokens, typography rules, component patterns, and animation guidelines. | MIT |

# Brandguide Design System

This design system defines the visual language for all Brandguide products. Follow these guidelines to ensure consistency across projects.

## Brand Identity

**Tone:** Professional yet bold, editorial/magazine feel with playful accents
**Philosophy:** Soft minimalism with strategic color accents - less is more, but make every element count

---

## Colors

### Brand Color (Primary)
The signature Brandguide yellow `#fff012` is used sparingly for maximum impact.

```css
--color-brand-500: rgb(255 240 18);  /* #fff012 - Main brand color */
```

**Usage Rules:**
- Use as accent only, never as large background areas
- Approved uses: highlight underlines, quote borders, hover states, primary CTA buttons, loading spinners
- Never use for body text or large UI surfaces

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `white` | #ffffff | Primary background |
| `gray-50` | Tailwind default | Secondary background, hover states |
| `gray-100` | Tailwind default | Borders, dividers |
| `gray-200` | Tailwind default | Hover borders |
| `gray-400` | Tailwind default | Secondary text, icons |
| `gray-500` | Tailwind default | Body text |
| `gray-900` | Tailwind default | Headings, primary text |
| `brand-500` | #fff012 | Accent color |
| `emerald-50/500/700` | Tailwind default | Success states |
| `amber-50/500/700` | Tailwind default | Warning states |
| `red-50/500/700` | Tailwind default | Error states |

### Semantic Color Usage

```tsx
// Good scores (70%+)
className="bg-emerald-50 text-emerald-700"

// Medium scores (50-69%)
className="bg-[#fff012]/20 text-gray-700"

// Low scores (<50%)
className="bg-amber-50 text-amber-700"

// Error states
className="bg-red-50 text-red-700"
```

---

## Typography

### Font Family
**Oedenburg Sans** - A distinctive geometric sans-serif

```css
--font-body: "Oedenburg Sans", -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
--font-display: "Oedenburg Sans", -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
```

Font files required:
- `oedenburg_sans_vario_1.3-light-webfont.woff2` (300)
- `oedenburg_sans_vario_1.3-regular-webfont.woff2` (400)
- `oedenburg_sans_vario_1.3-bold-webfont.woff2` (700)

### Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| 300 (Light) | `font-light` | Large headings, hero text, display numbers |
| 400 (Regular) | `font-normal` | Body text, descriptions |
| 500 (Medium) | `font-medium` | Subheadings, labels, buttons |
| 700 (Bold) | `font-bold` | Emphasis, strong labels |

### Heading Hierarchy

```tsx
// Hero/Display (landing pages)
<h1 className="text-4xl font-light text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">

// Page title
<h1 className="text-3xl font-light text-gray-900 md:text-4xl">

// Section heading
<h2 className="text-xl font-light text-gray-900">

// Card/Component heading
<h3 className="font-medium text-gray-900">

// Small label
<span className="text-xs font-medium uppercase tracking-widest text-gray-400">
```

---

## Layout

### Container Widths

```tsx
// Narrow content (text-heavy)
className="mx-auto max-w-2xl"

// Standard content
className="mx-auto max-w-4xl"

// Wide content (cards, grids)
className="mx-auto max-w-5xl"

// Full-width sections
className="mx-auto max-w-6xl"
```

### Spacing

```tsx
// Page padding
className="px-4 sm:px-6 lg:px-8"

// Section vertical spacing
className="py-24 md:py-32"

// Component spacing
className="space-y-3"  // Tight list items
className="space-y-6"  // Card groups
className="gap-8 md:gap-12"  // Grid items
```

---

## Components

### Cards

```tsx
// Standard card
<div className="rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-gray-200 hover:shadow-sm">

// Featured card (with brand accent)
<div className="rounded-2xl border-2 border-[#fff012]/50 bg-white p-8 transition-all duration-300 hover:border-[#fff012] hover:shadow-lg hover:shadow-[#fff012]/10">

// Grouped card with hover
<div className="group rounded-xl border border-gray-100 bg-white p-4 transition-all duration-300 hover:border-gray-200 hover:shadow-sm">
```

### Buttons

```tsx
// Primary CTA (brand yellow)
<button className="group inline-flex items-center gap-3 rounded-full bg-[#fff012] px-10 py-5 text-base font-medium text-gray-900 transition-all duration-300 hover:shadow-xl hover:shadow-[#fff012]/30">

// Secondary CTA (dark)
<button className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white transition-all duration-300 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10">

// Ghost button
<button className="inline-flex items-center gap-2 px-6 py-4 text-base text-gray-500 transition-colors hover:text-gray-900">

// Small action button
<button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm">
```

### Badges/Tags

```tsx
// Score badge
<span className="rounded-full px-2.5 py-0.5 text-sm font-medium bg-emerald-50 text-emerald-700">

// Level badge
<span className="rounded-full bg-[#fff012] px-3 py-1 text-xs font-medium text-gray-900">

// Subtle tag
<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
```

### Icons
Use **UntitledUI Icons** (@untitledui/icons) for consistency.

```tsx
import { ArrowRight, Check, AlertCircle } from "@untitledui/icons";

// Standard icon size
<Icon className="size-4" />

// Large icon (featured)
<Icon className="size-6" />

// Icon in container
<div className="flex size-10 items-center justify-center rounded-lg bg-gray-50">
  <Icon className="size-5 text-gray-400" />
</div>
```

---

## Animations

### Entry Animations

Use CSS keyframe animations with staggered delays:

```tsx
// Fade + slide up animation
<div className="opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]"
     style={{ animationDelay: "0.1s" }}>

// Simple fade
<div className="opacity-0 animate-[fadeIn_0.6s_ease_forwards]">

// Staggered list items
{items.map((item, index) => (
  <div
    className="opacity-0 animate-[fadeSlideUp_0.5s_ease_forwards]"
    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
  >
))}
```

### Keyframe Definitions

Add to your global styles or page component:

```tsx
<style jsx global>{`
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
```

### Hover Transitions

```tsx
// Standard transition
className="transition-all duration-300"

// Color-only transition
className="transition-colors duration-300"

// Transform transition (icons, arrows)
className="transition-transform duration-300 group-hover:translate-x-1"
```

### Loading States

```tsx
// Spinner with brand color
<div className="size-12 animate-spin rounded-full border-2 border-gray-200 border-t-[#fff012]" />

// Skeleton loading
<div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
```

---

## Page Structure

### Standard Page Template

```tsx
<div className="min-h-screen bg-white">
  {/* Header */}
  <div className="border-b border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-6xl items-center justify-between">
      <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-gray-900">
        ← Vissza
      </Link>
      <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
        Page Title
      </span>
    </div>
  </div>

  {/* Content */}
  <div className="px-4 py-12 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-4xl">
      {/* Page header */}
      <div className="mb-10 opacity-0 animate-[fadeSlideUp_0.6s_ease_forwards]">
        <h1 className="mb-2 text-3xl font-light text-gray-900">Page Title</h1>
        <p className="text-gray-500">Description text</p>
      </div>

      {/* Content here */}
    </div>
  </div>
</div>
```

### Loading State

```tsx
<div className="flex min-h-screen items-center justify-center bg-white">
  <div className="text-center">
    <div className="mx-auto mb-6 size-12 animate-spin rounded-full border-2 border-gray-200 border-t-[#fff012]" />
    <p className="text-gray-500">Loading message...</p>
  </div>
</div>
```

### Error State

```tsx
<div className="flex min-h-screen items-center justify-center bg-white px-4">
  <div className="max-w-md text-center">
    <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-50">
      <AlertCircle className="size-8 text-red-500" />
    </div>
    <h1 className="mb-2 text-2xl font-light text-gray-900">Error Title</h1>
    <p className="mb-8 text-gray-500">Error description</p>
  </div>
</div>
```

---

## Brand Accent Patterns

### Highlight Underline

```tsx
<em className="relative font-normal not-italic">
  highlighted word
  <span className="absolute -bottom-1 left-0 h-3 w-full bg-[#fff012]/40" />
</em>
```

### Quote Border

```tsx
<blockquote className="border-l-2 border-[#fff012] pl-6">
  <p className="text-gray-600 italic">"Quote text"</p>
</blockquote>
```

### Decorative Dots

```tsx
<div className="pointer-events-none absolute inset-0 overflow-hidden">
  <div className="absolute right-[15%] top-[20%] size-2 rounded-full bg-[#fff012]" />
  <div className="absolute left-[20%] top-[60%] size-3 rounded-full bg-[#fff012]/60" />
</div>
```

---

## Do's and Don'ts

### Do
- Use white backgrounds with gray borders
- Keep animations subtle (0.3-0.6s)
- Use `font-light` for large headings
- Apply brand yellow sparingly for impact
- Use staggered animations for lists
- Maintain generous whitespace

### Don't
- Use brand yellow as large background fills
- Mix multiple accent colors
- Use heavy shadows (keep to `shadow-sm`)
- Over-animate (no bouncing, no excessive effects)
- Use dark mode (this system is light-only)
- Use generic fonts (always use Oedenburg Sans)

---

## Technical Stack

- **Framework:** Next.js 16+ with App Router
- **Styling:** Tailwind CSS v4
- **Icons:** @untitledui/icons
- **Fonts:** Oedenburg Sans (self-hosted in /public/fonts/)
- **Language:** Hungarian UI text (hu-HU locale)
