# Verify: design system and UI foundation (spec 0003) updated 2026-09-24

Steps derived from spec 0003 acceptance criteria. check verify runs these; test locks the durable ones.

## UI / manual

- Visit `/` -> renders application shell with collapsible sidebar, top navigation, and active branch selector -> AC-3, AC-4
- Toggle theme via Sun and Moon button -> switches between light and dark mode with zero layout shift -> AC-1
- Click "Test Audit Toast" -> triggers Sonner alert notification in top right corner -> AC-6
- Click "New Transaction" -> opens Dialog modal with focus trapped, inputs at 36px, and dismisses on Escape -> AC-2, AC-5
- Click "Void Entry" -> opens AlertDialog confirmation with destructive red action button -> AC-5
- Switch active branch dropdown -> updates active branch badge and sets active_branch_id cookie -> AC-4
- Shrink viewport to mobile (<768px) -> sidebar hides automatically, hamburger menu opens Sheet drawer -> AC-3

## Commands

- `pnpm exec tsc --noEmit` -> passes with zero type errors -> AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run lint` -> passes with zero warnings or errors -> AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- `pnpm run test` -> runs unit test suite passing all 14 tests -> AC-2, AC-4, AC-5
- `pnpm run build` -> production build succeeds generating static and dynamic routes -> AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

## Acceptance criteria coverage

- AC-1 covered by globals.css OKLCH theme and theme-provider.tsx
- AC-2 covered by Geist font setup, tabular-nums utility, and design-system.test.tsx button/table tests
- AC-3 covered by AppShell component and pure CSS responsive breakpoints
- AC-4 covered by TopNav component, BranchSwitcher, and design-system.test.tsx branch test
- AC-5 covered by Dialog, AlertDialog, DropdownMenu, Table, Checkbox, Select, Tabs, Sheet, Popover, Tooltip, and Skeleton components
- AC-6 covered by Sonner Toaster provider in root layout and DashboardInteractive toast trigger
- AC-7 covered by root design.md documentation
