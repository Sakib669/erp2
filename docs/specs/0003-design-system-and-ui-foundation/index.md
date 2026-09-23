# 0003. Design system and UI foundation

**Date**: 2026-09-24
**Status**: In Progress

## Summary

This specification establishes the visual theme, component standards, and application layout shell for our enterprise resource planning system. It provides an accessible design system using Tailwind CSS version 4, custom OKLCH color tokens, Geist Sans typography, and shadcn UI component primitives. These standards ensure visual consistency, full keyboard accessibility, and efficient screen density across all enterprise modules.

Decision history and rationale are recorded in [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0003-design-system-and-ui-foundation/rationale.md).
Project design rules and token references are published in [design.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/design.md).

## Requirements

**User stories**:

- As an enterprise operator, I want dense, clear data displays and clean forms so that I can process transactions and inspect records quickly.
- As an accessibility reliant user, I want full keyboard navigation, visible focus indicators, and screen reader announcements so that I can use every module without a mouse.
- As a branch staff member working in different environments, I want seamless light and dark mode switching with system preference detection to reduce eye fatigue.

**Acceptance criteria**:

- **AC-1**: Global CSS theme in [src/app/globals.css](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/app/globals.css) and theme provider in [src/components/theme-provider.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/theme-provider.tsx) configure OKLCH color variables for slate and indigo enterprise palette with light and dark mode switching, and `suppressHydrationWarning` on the HTML root element.
- **AC-2**: Typography system configures Geist Sans font for interface copy, tabular monospace numerals for currency and ledgers, and establishes a 4px modular spacing scale with compact enterprise density (36px inputs, 40px table rows).
- **AC-3**: Application shell layout in [src/components/layout/app-shell.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/layout/app-shell.tsx) provides a responsive collapsible sidebar with organization branding, module navigation links, active route indicators, pure CSS display breakpoints, and mobile drawer support.
- **AC-4**: Top header bar in [src/components/layout/top-nav.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/layout/top-nav.tsx) includes an interactive branch selector trigger with cookie persistence, quick search trigger, theme toggle, and user profile menu with status indicators.
- **AC-5**: Foundational shadcn UI primitives (Dialog, AlertDialog, DropdownMenu, Table, Checkbox, Select, Tabs, Sheet, Popover, Tooltip, Skeleton) are implemented, styled with enterprise tokens, and verified for full keyboard accessibility and Windows High Contrast Mode compatibility.
- **AC-6**: Global toast notification provider via Sonner is mounted in root layout, exposing standardized helper utilities for success, error, and transactional audit feedback.
- **AC-7**: A durable [design.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/design.md) file is published at project root defining color tokens, typography scales, spacing rules, component usage standards, and accessibility requirements.

## Decision

**Chosen option**: Option 1: Tailwind CSS version 4 with OKLCH tokens and shadcn UI primitives

We will implement an enterprise design system using Tailwind CSS version 4 inline themes, custom OKLCH color definitions (slate neutrals with indigo primary accents and paired status tokens), compact enterprise sizing, and accessible shadcn UI primitives powered by Radix UI.

## Rationale

Reasoning and architectural alternatives: see [rationale.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0003-design-system-and-ui-foundation/rationale.md).

## Feature design

**Design tokens**:

- Color space: OKLCH for perceptual uniformity and wide color gamut fidelity.
- Primary brand: Indigo accent (`oklch(0.45 0.22 264)` in light mode with white foreground; `oklch(0.68 0.20 264)` in dark mode with dark foreground).
- Neutral surface: Slate scale (`oklch(0.985 0.005 240)` base in light mode, `oklch(0.145 0.015 240)` in dark mode).
- Status colors: Paired surface and foreground tokens guaranteeing 4.5:1 WCAG contrast:
  - Success: Surface `oklch(0.94 0.05 145)`, Text `oklch(0.35 0.15 145)`; Dark: Surface `oklch(0.25 0.08 145)`, Text `oklch(0.85 0.12 145)`.
  - Warning: Surface `oklch(0.95 0.06 75)`, Text `oklch(0.40 0.14 75)`; Dark: Surface `oklch(0.28 0.08 75)`, Text `oklch(0.88 0.12 75)`.
  - Destructive: Surface `oklch(0.94 0.05 27)`, Text `oklch(0.45 0.22 27)`; Dark: Surface `oklch(0.25 0.08 27)`, Text `oklch(0.85 0.15 27)`.
  - Info: Surface `oklch(0.94 0.05 230)`, Text `oklch(0.38 0.15 230)`; Dark: Surface `oklch(0.25 0.08 230)`, Text `oklch(0.85 0.12 230)`.
- Density scale: Compact inputs at 36px height (`h-9`), comfortable table rows at 40px height (`h-10`), icon buttons at 36px square (`size-9`).
- Typography: Geist Sans for UI text, tabular lining figures for numbers, Geist Mono for code, hashes, and account identifiers.

**Component inventory**:

| Component    | Base primitive      | Location                              | Purpose                                                 |
| ------------ | ------------------- | ------------------------------------- | ------------------------------------------------------- |
| Dialog       | Radix Dialog        | `src/components/ui/dialog.tsx`        | Standard modal dialogs for create and edit record forms |
| AlertDialog  | Radix Alert Dialog  | `src/components/ui/alert-dialog.tsx`  | Destructive confirmations requiring explicit action     |
| DropdownMenu | Radix Dropdown Menu | `src/components/ui/dropdown-menu.tsx` | Action menus, filter menus, user account menu           |
| Table        | HTML Table          | `src/components/ui/table.tsx`         | Dense tabular data display with sticky headers          |
| Checkbox     | Radix Checkbox      | `src/components/ui/checkbox.tsx`      | Multi row selection in data tables and toggle forms     |
| Select       | Radix Select        | `src/components/ui/select.tsx`        | Accessible dropdown options selector                    |
| Tabs         | Radix Tabs          | `src/components/ui/tabs.tsx`          | View segmenting in detail cards and settings            |
| Sheet        | Radix Dialog        | `src/components/ui/sheet.tsx`         | Slide over panels, mobile navigation drawer             |
| Popover      | Radix Popover       | `src/components/ui/popover.tsx`       | Floating content panels, filter popups, date pickers    |
| Tooltip      | Radix Tooltip       | `src/components/ui/tooltip.tsx`       | Contextual button labels and truncated text helpers     |
| Skeleton     | HTML Div            | `src/components/ui/skeleton.tsx`      | Content placeholder loading state animations            |
| Toaster      | Sonner              | `src/components/ui/sonner.tsx`        | Global stackable alert and confirmation toasts          |

**Value sourcing**:

| Action or display | Value produced or displayed                        | Source                                                                                 |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Theme switching   | Current active theme ("light", "dark", "system")   | `next-themes` client provider stored in localStorage and applied to HTML element       |
| Sidebar collapse  | Expanded or collapsed sidebar state                | Client cookie `sidebar:state` read by Server Components to prevent layout shift        |
| Branch switcher   | Active branch name and list of authorized branches | Cookie `active_branch_id` validated against session branch list from `auth-helpers.ts` |
| Route highlight   | Visual active state on navigation link             | Next.js `usePathname()` matching item href                                             |
| Monospace figures | Tabular numeral layout in ledger or table          | CSS property `font-variant-numeric: tabular-nums`                                      |

**Key invariants**:

- Every interactive element must have a visible high contrast focus ring with fallback outline (`ring-2 ring-primary ring-offset-2 outline-2 outline-transparent`) ensuring visibility under Windows High Contrast Mode.
- All foreground and background text pairings must achieve at least 4.5:1 contrast ratio for normal text and 3:1 for large text across light and dark themes.
- All data tables containing currency, counts, or dates must use tabular figures to prevent jitter during sorting or updating.
- All modal dialogs and slide over drawers must trap keyboard focus and dismiss on Escape key press.
- Shell layout uses pure CSS media query boundaries (`hidden md:flex` on desktop sidebar, `md:hidden` on mobile header) to prevent layout flashes during server rendering hydration.

**Security model**:

- Theme preferences and sidebar toggle states are non sensitive client display preferences stored in cookies and localStorage.
- Navigation menu items are conditionally rendered based on verified user permissions from the server session.
- Toast messages must sanitize arbitrary text inputs before rendering to prevent cross site scripting injection.

**Critical test scenarios**:

- Theme preference test: Toggling dark mode adds `.dark` class to `<html>` and updates CSS variables without page reload, satisfying **AC-1**.
- Compact density test: Input controls render at 36px height with font size 14px, satisfying **AC-2**.
- Responsive shell navigation test: Mobile viewports (<768px) hide sidebar and expose hamburger toggle opening Sheet drawer, satisfying **AC-3**.
- Branch selector menu test: Top navigation displays active branch badge and dropdown lists authorized branches, persisting selection to `active_branch_id` cookie, satisfying **AC-4**.
- Keyboard navigation test: Tabbing through Dialog and DropdownMenu cycles through focusable options with focus trapped inside modal, satisfying **AC-5**.
- Toast feedback test: Triggering `toast.success()` renders accessible notification with auto dismiss timer, satisfying **AC-6**.

## Build plan

- [x] Step 1: Install `next-themes` and `sonner`, and configure Geist font and OKLCH color theme in [src/app/globals.css](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/app/globals.css), satisfies **AC-1**, **AC-2**
- [x] Step 2: Implement core shadcn UI component primitives (Dialog, AlertDialog, DropdownMenu, Table, Checkbox, Select, Tabs, Sheet, Popover, Tooltip, Skeleton, Sonner Toaster), satisfies **AC-5**, **AC-6**
- [x] Step 3: Build enterprise application shell with collapsible sidebar, navigation items, and mobile drawer in [src/components/layout/app-shell.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/layout/app-shell.tsx), satisfies **AC-3**
- [x] Step 4: Build top navigation bar with branch switcher trigger, theme toggle, and user profile menu in [src/components/layout/top-nav.tsx](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/src/components/layout/top-nav.tsx), satisfies **AC-4**
- [x] Step 5: Author and publish comprehensive design system documentation in [design.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/design.md), satisfies **AC-7**
- [x] Step 6: Create verification checklist in [verify.md](file:///C:/Users/Sakib/Desktop/Projects%20Old/erp2/docs/specs/0003-design-system-and-ui-foundation/verify.md) and execute component test suite, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**

## Consequences

**Positive**:

- Unified, cohesive visual appearance across all future enterprise modules.
- Built in accessibility compliance (WCAG 2.1 AA) baked into component primitives.
- Fast screen reading and dense data presentation tailored for operations teams.
- Zero external runtime CSS overhead thanks to Tailwind CSS version 4 compilation.

**Negative and tradeoffs**:

- Maintaining bespoke shadcn primitives in the codebase requires code ownership rather than relying on an external package bundle.
- Dense layout requires careful spacing discipline to prevent cramped visuals on lower resolution displays.

**Neutral**:

- Developers must import UI primitives from `@/components/ui/` rather than writing ad hoc HTML inputs or buttons.
