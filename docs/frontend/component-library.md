# Automotors Garage — Component Library Reference

All base components reside in [`apps/frontend/src/components/ui/`](file:///c:/Users/feder/OneDrive/Escritorio/proyecto/AutomotorsGarage/apps/frontend/src/components/ui/) and export through [`index.ts`](file:///c:/Users/feder/OneDrive/Escritorio/proyecto/AutomotorsGarage/apps/frontend/src/components/ui/index.ts).

## 1. Components Catalog

### 1.1 `Button`
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`, `subtle`.
- **Sizes**: `sm` (h-8), `md` (h-10, min 44px for touch), `lg` (h-12), `icon` (44x44px square).
- **Features**: Built-in loading state with Lucide `Loader2`, left/right icon slots, active scale feedback (`scale-[0.98]`).

### 1.2 `Input` & `Select`
- **Features**: Label, helper hint, error message with focus ring transition (`focus:border-emerald-500 focus:ring-1`).
- **Touch Standard**: Minimum 44px height and 16px base font size to eliminate iOS Safari automatic zoom.

### 1.3 `Card` & Subcomponents
- **Primitives**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Variants**: `default`, `elevated`, `bordered`, `interactive`.

### 1.4 `Badge`
- **Variants**: `default` (emerald), `secondary` (slate), `success`, `warning`, `danger`, `info`, `inProgress`, `outline`.
- **Features**: Optional pulsating dot indicator (`dot: boolean`), compact padding, uppercase or lowercase support.

### 1.5 `Dialog` (Modal)
- **Features**: Accessible ARIA modal attributes (`role="dialog"`, `aria-modal="true"`), Escape key dismissal, scroll lock on body, backdrop click listener, and responsive max-width.

### 1.6 `Sheet` (Slide-Over Drawer)
- **Features**: Bottom slide-up sheet on mobile with drag indicator bar, safe-area inset padding (`env(safe-area-inset-bottom)`), and right drawer on desktop.

### 1.7 `Dropdown`
- **Features**: Accessible click-outside listener, keyboard navigability, destructive item styling, and clean z-index popover.

### 1.8 `Tabs`
- **Primitives**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- **Features**: Uncontrolled or controlled state, optional badge counter per tab trigger.

### 1.9 `Table`
- **Primitives**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.
- **Features**: Rounded corners, horizontal overflow scroll containment (`no-scrollbar`), subtle hover highlights.

### 1.10 Feedback States
- **`EmptyState`**: Dashed border container with Lucide icon, clear title, explanatory paragraph, and primary CTA action.
- **`LoadingSpinner` & `Skeleton`**: Deterministic loading state indicators.
- **`ErrorState`**: Rose-tinted alert box with retry button callback.

### 1.11 Layout Headers
- **`PageHeader`**: Top-level page title, status badge, subtitle, and responsive action button group.
- **`SectionHeader`**: Card or table subsection title, description, and secondary actions.
