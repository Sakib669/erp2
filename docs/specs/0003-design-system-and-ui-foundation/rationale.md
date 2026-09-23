# Rationale: 0003. Design system and UI foundation

**Date**: 2026-09-24

## Context

An enterprise resource planning platform coordinates complex operations across multiple physical branches. Users spend full eight hour shifts navigating accounting ledgers, reviewing employee attendance, processing inventory shipments, and configuring multi branch settings.

Inconsistent typography, mismatched button styles, uncontrolled spacing, and poor keyboard accessibility lead to operator fatigue, higher data entry errors, and slower workflows. Furthermore, enterprise data displays require higher information density than generic marketing websites, needing compact inputs and tabular numerals that do not jitter during live data updates.

Without a centralized design system and standard layout shell, each module team invents ad hoc layouts, custom table formatting, and divergent notification patterns. This leads to fractured user experiences and high maintenance overhead.

## Options considered

### Option 1: Tailwind CSS version 4 with OKLCH tokens and shadcn UI primitives (Recommended)

Adopt Tailwind CSS version 4 inline `@theme` rules using OKLCH color definitions, coupled with accessible shadcn UI primitives built on Radix UI headless components. The application layout shell provides a persistent collapsible sidebar and contextual top navigation bar.

**Pros**:

- Complete code ownership with zero external runtime style bundle bloat.
- World class accessibility with ARIA attributes and focus management baked into Radix primitives.
- Modern OKLCH color space ensures smooth color scales and consistent perceived contrast across light and dark modes.
- Full compatibility with Next.js 15 App Router and React Server Components.

**Cons**:

- Requires committing UI primitive code files into the project repository rather than installing a single third party npm bundle.

### Option 2: Monolithic enterprise component library (MUI or Ant Design)

Install a pre packaged enterprise component library such as Material UI or Ant Design.

**Pros**:

- Hundreds of pre built complex components out of the box.

**Cons**:

- Heavy JavaScript runtime bundle size.
- Significant friction integrating with React Server Components in Next.js 15.
- Styling overrides are cumbersome and fight against the library CSS in JS runtime.

### Option 3: Custom CSS Modules with custom HTML elements

Author bespoke CSS Modules and native HTML form controls without a primitive foundation.

**Pros**:

- Zero external dependencies.

**Cons**:

- Enormous engineering burden to achieve full WCAG accessibility compliance.
- Focus management, keyboard trap in dialogs, and ARIA attributes must be manually coded and tested.
- Drastically slows down the delivery of domain slices.

## Decision

**Chosen option**: Option 1: Tailwind CSS version 4 with OKLCH tokens and shadcn UI primitives

We will adopt Option 1 because it strikes the ideal balance between developer velocity, accessibility compliance, runtime efficiency, and full design customization.

Next.js 15 App Router favors server rendered components with lean client JavaScript. Shadcn UI primitives allow most UI to remain server rendered while wrapping only interactive behaviors (such as dropdown toggles, modal dialogs, and toast timers) in lightweight client components. The OKLCH color model gives us high contrast accessibility in both light and dark modes.
