# Design System Guidelines: Enterprise ERP

**Date**: 2026-09-24
**Status**: Active

## Overview

This document specifies the visual language, design tokens, layout hierarchy, and accessibility rules for our multi branch enterprise resource planning system. It serves as the durable design guide that all module pages, components, and workflows must follow.

Token values live in [src/app/globals.css](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/app/globals.css); this file holds the art direction, rules, and component standards.

## Character and personality

- **Crisp and authoritative**: High contrast typography, clear borders, and subdued surfaces tailored for professional operators.
- **Information dense**: Compact vertical rhythm maximizing usable screen real estate for financial ledgers, inventory tables, and employee directories.
- **Calm precision**: Slate neutral backgrounds with purposeful indigo primary accents and unambiguous status indicators.
- **Accessible by default**: High visibility focus rings, WCAG 2.1 AA contrast ratios, and full keyboard navigation across every modal and menu.

## Build mandate

Every page and component built for this application must satisfy these standards:

1. **Information density**:
   - Text inputs and select triggers: 36px height (`h-9`).
   - Table rows: 40px height (`h-10`) with compact padding (`p-3`).
   - Primary action buttons: 36px height (`h-9 px-4 text-sm font-medium`).
   - Icon buttons: 36px square (`size-9`).

2. **Typography rules**:
   - Interface copy uses Geist Sans (`var(--font-geist-sans)`).
   - Monospace numerals: all numeric fields (currency, counts, ledger numbers, dates, timestamps) must use tabular numbers (`tabular-nums`).
   - Heading scale: Page titles at 24px (`text-2xl font-bold tracking-tight`), card headers at 14px (`text-sm font-semibold`), body text at 14px (`text-sm`), table cells and metadata at 12px (`text-xs`).

3. **Color tokens**:
   - All color definitions use the OKLCH color model defined in [src/app/globals.css](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/app/globals.css).
   - Neutral surfaces: Slate scale (`--background`, `--card`, `--popover`, `--border`).
   - Primary accent: Indigo brand (`--primary`, `--primary-foreground`).
   - Semantic status pairs:
     - Success: `--success` surface with `--success-foreground` text.
     - Warning: `--warning` surface with `--warning-foreground` text.
     - Destructive: `--destructive` surface with `--destructive-foreground` text.
     - Info: `--info` surface with `--info-foreground` text.

4. **Layout shell standards**:
   - All authenticated views must be rendered inside the `AppShell` component in [src/components/layout/app-shell.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/layout/app-shell.tsx).
   - Desktop sidebar: collapsible to 64px icon rail (`w-16`) or expanded to 256px (`w-64`) with pure CSS breakpoint (`hidden md:flex`) to eliminate server rendering layout flashes.
   - Mobile navigation: viewports under 768px hide the persistent sidebar and use the slide over drawer (`Sheet`).
   - Top navigation: sticky header at 56px (`h-14`) hosting branch context selector, quick search trigger, theme toggle, and user account dropdown.

5. **Accessibility requirements**:
   - Every interactive element must display a visible focus indicator: `ring-2 ring-primary ring-offset-2 outline-2 outline-transparent`.
   - Transparent outline fallback ensures focus visibility under Windows High Contrast Mode (`forced-colors: active`).
   - Modal dialogs (`Dialog`, `AlertDialog`) and slide over drawers (`Sheet`) must trap keyboard focus, support Tab cycling, and dismiss on Escape.
   - Contrast ratios must meet or exceed 4.5:1 for standard text and 3:1 for large text across both light and dark modes.

## Component library inventory

All foundational components are located in [src/components/ui/](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/ui/):

- `Button`: Primary, secondary, outline, ghost, destructive, and link variants with `asChild` support.
- `Badge`: Status and category pill indicators.
- `Card`: Structured container with header, content, and footer sections.
- `Input`: 36px compact form input with focus ring.
- `Label`: Form field caption with accessibility label association.
- `Dialog`: Accessible modal window for forms and complex workflows.
- `AlertDialog`: Modal confirmation requiring explicit confirmation for irreversible operations.
- `DropdownMenu`: Accessible popover menu for actions, filters, and user profiles.
- `Table`: Semantic tabular data display with hover highlights and sticky headers.
- `Checkbox`: Accessible toggle for multi row table selection.
- `Select`: Accessible single selection dropdown.
- `Tabs`: Segmented content container with keyboard arrow key traversal.
- `Sheet`: Accessible slide over drawer for mobile navigation and detail inspectors.
- `Popover`: Floating panel for date pickers and contextual filters.
- `Tooltip`: Tooltip hover hints with zero layout shift.
- `Skeleton`: Pulsing loading state placeholder.
- `Toaster`: Sonner notification provider mounted in root layout for feedback alerts.
