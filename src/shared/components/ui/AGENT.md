# AGENT.md - src/shared/components/ui/

Este diretório contém os componentes de UI baseados no shadcn/ui (Radix UI primitives).

## Sistema de Design

### Cores do Tema (globals.css)
```css
/* LIGHT MODE */
--background: oklch(1 0 0)           /* #FFFFFF */
--foreground: oklch(0.145 0 0)         /* #1A1A1A */
--primary: oklch(0.205 0 0)           /* #343434 */
--primary-foreground: oklch(0.985 0 0)
--secondary: oklch(0.97 0 0)
--muted: oklch(0.97 0 0)
--accent: oklch(0.97 0 0)
--destructive: oklch(0.577 0.245 27.325) /* #DC2626 */
--border: oklch(0.922 0 0)
--ring: oklch(0.708 0 0)
--chart-1 até --chart-5: cores para gráficos

/* DARK MODE */
--background: oklch(0.145 0 0)         /* #252525 */
--foreground: oklch(0.985 0 0)
--primary: oklch(0.922 0 0)               /* #EBEBEB */
--destructive: oklch(0.704 0.191 22.216)
```

### Tipografia
- **Fontes**: Geist Sans (sans) + Geist Mono (mono)
- **Tamanhos**:
  - headings: text-lg (18px), text-xl (20px), text-2xl (24px)
  - body: text-sm (14px), text-base (16px)
  - small: text-xs (12px)

### Espaçamento (Tailwind)
- Padding padrão: px-4 (16px), py-2 (8px)
- Gap: gap-2 (8px), gap-4 (16px), gap-6 (24px)
- Border radius: rounded-md (8px), rounded-xl (12px)

### Breakpoints
- Mobile: padrão < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Componentes Base

### button.tsx
- **Variantes**: default, destructive, outline, secondary, ghost, link
- **Tamanhos**: default (h-9), xs (h-6), sm (h-8), lg (h-10), icon (size-9)
- **Estados**: hover/90, disabled:opacity-50, focus-visible:ring

### card.tsx
- **Estrutura**: Card > [CardHeader > CardTitle/CardDescription/CardAction] > CardContent > CardFooter
- **Estilo**: bg-card, rounded-xl, border, shadow-sm, py-6, px-6
- **Slots**: data-slot="card-*"

### input.tsx
- **Estilo**: h-9, px-3, rounded-md, border, bg-background
- **Focus**: ring-2 ring-ring/50

### dialog.tsx
- **Provider**: Radix UI Dialog
- **Animações**: fade-in + slide-in (framer-motion)

### table.tsx
- **Estrutura**: Table > TableHeader > TableBody > TableRow > TableHead/TableCell/TableFooter

### select.tsx
- **Provider**: Radix UI Select
- **Estilo**: trigger com chevron, content com min-w-[var(--radix-select-trigger-width)]

### currency-input.tsx
- **Propósito**: Input específico para moeda brasileira (BRL)
- ** Máscara**: formato pt-BR com Intl.NumberFormat

### calendar.tsx
- **Provider**: react-day-picker
- **Estilo**: grid 7cols, rounded-md, popover

### tabs.tsx
- **Provider**: Radix UI Tabs
- **Estilo**: tabs-list com rounded-md, trigger com rounded-md

### form.tsx
- **Provider**: React Hook Form + Zod
- **Integração**: shadcn/ui form fields

### badge.tsx
- **Estilo**: inline-flex, h-5, px-2, rounded-full, text-xs

### progress.tsx
- **Estilo**: relative, h-2, rounded-full, bg-secondary

### checkbox.tsx
- **Provider**: Radix UI Checkbox
- **Estilo**: h-4 w-4, rounded border

### switch.tsx
- **Provider**: Radix UI Switch
- **Estilo**: toggle round, thumb

### dropdown-menu.tsx
- **Provider**: Radix UI DropdownMenu
- **Estilo**: popover com overlay

### popover.tsx
- **Provider**: Radix UI Popover
- **Estilo**: floating content

### sheet.tsx
- **Provider**: Radix UI Dialog (slide-out)
- **Posições**: top, bottom, left, right

### alert-dialog.tsx
- **Provider**: Radix UI AlertDialog
- **Uso**: confirmações destrutivas

### sonner.tsx
- **Provider**: Sonner (toast notifications)
- **Posição**: bottom-right

### textarea.tsx
- **Estilo**: resize-none, min-h-[60px-80px]

### label.tsx
- **Estilo**: text-sm, font-medium, leading-none