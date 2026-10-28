# Automotors Garage — Responsive & Mobile Guidelines

## 1. Supported Viewports & Target Spectrum

Automotors Garage is engineered mobile-first to ensure technicians on the workshop floor have immediate, reliable access from their handheld devices, while workshop managers enjoy full visibility on desktop workstations.

| Target Viewport | Width Spectrum | Layout Strategy |
| :--- | :--- | :--- |
| **Compact Mobile** | `320px – 359px` | Single-column stack, compact padding (`px-3`), sticky bottom nav, collapsible drawer |
| **Standard Mobile** | `360px – 430px` | Single-column cards, elevated center Quick Service button (`Zap`), 44px min touch targets |
| **Tablet** | `768px – 1023px` | 2-column KPI grid, sidebar navigation visible, tables with horizontal touch scroll |
| **Desktop & Wide** | `1024px – 1440px+` | Fixed sidebar (64–72), 4-column KPI grid, split dashboard tables and OEM alerts |

---

## 2. Key Mobile Invariants

1. **No Horizontal Page Scroll**: The root container uses `max-w-100vw` and `overflow-x-hidden`. Wide data tables scroll internally within rounded, bordered containers.
2. **Safe-Area Inset Support**:
   - Mobile top header incorporates `pt-[env(safe-area-inset-top)]`.
   - Mobile bottom nav and slide-up sheets incorporate `pb-[env(safe-area-inset-bottom)]`.
3. **Prevention of iOS Safari Auto-Zoom**: All `<input>` and `<select>` controls declare a computed font size of `16px` minimum on screens `<= 768px`.
4. **Touch Target Size**: All interactive buttons, triggers, and menu items provide a minimum touch footprint of `44px × 44px`.
5. **Reduced Motion**: All animations and transitions respect `@media (prefers-reduced-motion: reduce)`.
