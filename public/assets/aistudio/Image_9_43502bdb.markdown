---
name: OpsPilot Operations Hub
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#00524b'
  on-tertiary: '#ffffff'
  tertiary-container: '#006c63'
  on-tertiary-container: '#81eddf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-num:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  metric-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system serves technical operations teams, dispatchers, fleet directors, and field service managers who oversee mission-critical workflows across real-time assets, route fulfillment, and automated vending hardware. The user environment requires cognitive clarity under pressure, split-second triage capabilities, and fatigue-reducing visual architecture during intensive 8-to-12 hour operational shifts.

The aesthetic fuses **Precision Corporate Modernism** with an executive cockpit feel:
- **Structural Dualism:** An ultra-dark administrative navigation shell anchoring the viewport, paired with an illuminated, highly-legible canvas for granular operational data.
- **Micro-Metric Legibility:** Dense data tables, live telemetry feeds, and timeline visualizers built with calibrated line-heights, monospace figure alignments, and deliberate color zoning.
- **Intentional Restraint:** Visual weight is reserved strictly for state changes, priority alarms, and workflow actions rather than ornamental chrome.

## Colors

The palette establishes an immediate operational hierarchy: the persistent navigation shell lives in a deep slate continuum (`#0F172A` deep base, `#1E293B` elevated containers, `#334155` interior borders), ensuring visual segregation from the workspace canvas.

### Color Tokens & Semantic Roles
- **Canvas Base:** `#F8FAFC` (Slate 50) provides a soft, low-glare backdrop for large displays.
- **Surfaces & Containers:** `#FFFFFF` (Pure White) with an intentional `#E2E8F0` hairline border creates discrete, stackable modules.
- **Primary & Interactive:** `#4F46E5` (Indigo 600) drives core buttons, active navigation states, and focal controls. `#2563EB` (Blue 600) provides complementary interactive highlights and link states.
- **Vendor & Partner Channel:** `#0D9488` (Teal 600) designates vendor-specific views, third-party contractor dispatch, and automated restocking queues.
- **System States:**
  - **Success / Active / Operational:** `#10B981` (Emerald 500)
  - **Warning / Pending / In-Transit:** `#F59E0B` (Amber 500)
  - **Critical / Urgent / Down-time:** `#EF4444` (Rose 500)
- **Text & Foreground:** `#0F172A` (Slate 900) for primary headlines and data values, `#475569` (Slate 600) for secondary metadata, and `#94A3B8` (Slate 400) for placeholder or deactivated cues.

## Typography

The type system prioritizes numerical legibility and scanning efficiency under high information densities. 

- **Font Features:** All dynamic numerical instances—such as monetary KPIs, ETA counters, sensor telemetry, and telemetry data tables—must enforce CSS `font-variant-numeric: tabular-nums lining-nums` or `font-feature-settings: 'tnum' 1, 'lnum' 1`. This stops horizontal jitter during real-time streaming updates.
- **Hierarchy Rules:**
  - `headline-xl` and `headline-lg` are reserved for primary view headers and top-level analytics summaries.
  - `title-md` governs card titles, modal headers, and table segment titles.
  - `label-sm` is explicitly styled for all-caps section titles, table column labels, and status indicators (`text-transform: uppercase`).

## Layout & Spacing

The layout model is anchored by a persistent collapsible dark-slate rail (64px collapsed, 260px expanded) paired with a responsive fluid content grid.

### Grid Architecture
- **Desktop (1280px+):** 12-column layout with 24px (`gutter-lg`) channels and 32px (`margin-lg`) canvas bounds. Cards and telemetry modules span 3, 4, 6, or 12 units.
- **Tablet / Small Laptop (768px - 1279px):** 8-column layout with 20px (`gutter`) channels and 24px (`margin-md`) outer safety margins.
- **Mobile (< 768px):** 4-column layout with 16px gutters and 16px (`margin`) borders. Side rails convert to an off-canvas drawer or a sticky bottom triage bar.

### Spacing Cadence
- Density is calibrated using an 8-point base increment (augmented by 4px `space-xs` for atomic grouping).
- Data-heavy modules (dispatch tables, kanban routes) utilize compact 8px (`space-sm`) to 12px cell padding.
- Dashboard KPI cards and analytical containers enforce 20px to 24px (`space-lg`) internal breathing space to separate structural data sets cleanly.

## Elevation & Depth

Visual separation relies on structural layering, high-contrast division, and subtle diffused ambient occlusion rather than heavy drop-shadows.

### Layering Hierarchy
1. **Background Canvas (Elevation 0):** Hex `#F8FAFC`. Zero elevation, non-interactive foundation.
2. **Standard Surface / Cards (Elevation 1):** Hex `#FFFFFF` bounded by a 1px solid `#E2E8F0` edge. Shadow specification: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
3. **Hovered Cards & Interactive Modules (Elevation 2):** Subtle upward translation (-1px) paired with an expanded shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`. Border transitions to `#CBD5E1`.
4. **Flyout Trays, Popovers, & Dropdowns (Elevation 3):** Background `#FFFFFF` with border `#E2E8F0` and deep ambient shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
5. **System Modals & Critical Incident Overlays (Elevation 4):** Anchored against a darkened `#0F172A` backdrop with 40% alpha, utilizing a focused spotlight elevation: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The design system incorporates intentional corner geometries to balance software precision with modern executive polish:

- **Cards & Data Modules:** Enforce `rounded-2xl` (16px / 1rem radius) to delineate distinct contextual islands on the off-white canvas.
- **Buttons, Form Inputs, & Segmented Controllers:** Built using base `rounded-lg` (8px / 0.5rem radius) for crisp, tool-like interaction targets.
- **Status Badges, Metric Pills, & Category Chips:** Strictly enforce full circular rounding (`rounded-full` / pill-shaped) to distinguish transient statuses from actionable square/rectangular controls.
- **Embedded Lists & Table Rows:** Table container outer edges conform to `rounded-xl`, while inner rows remain square to maintain strict tabular alignment.

## Components

### Buttons
- **Primary:** Filled `#4F46E5`, text `#FFFFFF`, subtle inset highlight `inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`. Hover: `#4338CA`. Active: `#3730A3`. Focus ring: 2px offset with `#6366F1`.
- **Secondary / Outline:** Background `#FFFFFF`, 1px border `#E2E8F0`, text `#0F172A`. Hover: background `#F1F5F9`, border `#CBD5E1`.
- **Destructive:** Background `#EF4444`, text `#FFFFFF`. Hover: `#DC2626`.
- **Dimensions:** Height 36px (compact) and 40px (default), horizontal padding 16px, corner radius 8px (`rounded-lg`).

### Badges & Status Pills
- Strict pill construction (`rounded-full`) with uppercase tracking (`label-sm`).
- **Operational / Active:** 10% tint background `#ECFDF5`, text `#065F46`, paired with a solid 6px `#10B981` status dot.
- **Warning / Delayed:** 10% tint background `#FFFBEB`, text `#92400E`, with a solid 6px `#F59E0B` status dot.
- **Critical / Urgent:** 10% tint background `#FEF2F2`, text `#991B1B`, with a solid 6px `#EF4444` pulsing indicator dot.
- **Vendor Portal:** 10% tint background `#F0FDFA`, text `#115E59`, with a solid 6px `#0D9488` status dot.

### Cards & Telemetry Containers
- Background `#FFFFFF`, 1px border `#E2E8F0`, corner radius 16px (`rounded-2xl`), shadow-sm.
- Content is partitioned into a 48px header zone (containing `title-md` and quick-action icon buttons) and a structured body separated by a 1px border `#F1F5F9`.

### Input Fields & Controls
- Height 40px, corner radius 8px, background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, placeholder `#94A3B8`.
- Focus state: border `#4F46E5`, outline 1px solid `#4F46E5` with a 3px diffused outer halo `rgba(79, 70, 229, 0.15)`.
- Error state: border `#EF4444`, focus halo `rgba(239, 68, 68, 0.15)`.

### Checkboxes & Radio Buttons
- 18px x 18px geometry, border 1.5px `#CBD5E1`.
- Checked state: background `#4F46E5`, border `#4F46E5`, white checkmark or center pip. Focus: halo `rgba(79, 70, 229, 0.2)`.

### Tables & Live Data Grids
- **Header:** Background `#F8FAFC`, border-bottom 1px solid `#E2E8F0`, typography `label-sm` in `#475569`.
- **Row:** Height 48px (dense) to 56px (standard), background `#FFFFFF`, border-bottom 1px solid `#F1F5F9`. Hover state switches row to `#F8FAFC`. All metrics enforce tabular-nums formatting.

### Specialized Fleet & Route Markers
- Compact map indicators utilizing `#0F172A` pin containers with status-colored rings (`#10B981`, `#F59E0B`, `#EF4444`) and white iconography for fast geographic identification.