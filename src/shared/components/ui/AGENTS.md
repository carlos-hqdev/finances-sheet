# AGENTS.md - src/shared/components/ui/

## Context7 MCP
**SEMPRE** use Context7 MCP para consultar documentação antes de usar componentes Radix/shadcn.

## Sistema de Design

### Cores (oklch)
```css
/* Light */
--background: #FFFFFF
--foreground: #1A1A1A
--primary: #343434
--destructive: #DC2626

/* Dark */
--background: #252525
--foreground: #EBEBEB
--primary: #EBEBEB
```

## Componentes shadcn/ui

| Componente | Provider | Uso |
|-----------|----------|-----|
| Button | - | actions, submit |
| Card | - | containers |
| Dialog | Radix | modais, icon-picker |
| DropdownMenu | Radix | menus |
| Sheet | Radix | slide-out |
| Select | Radix | selects (tipo de categoria) |
| Tabs | Radix | abas |
| Table | - | listas |
| Input | - | formulários |
| Form | RHF + Zod | validação |
| Toast | Sonner | notificações |
| AlertDialog | Radix |.confirmação de exclusão |

## Features Integradas

### Categories
Componentes para gestão de categorias com tipo, ícone e cor.

| Componente | Arquivo | Descrição |
|-----------|--------|-----------|
| CategoryDialog | `features/categories/` | Dialog com Select (tipo), IconPicker, Input (cor) |
| CategoryActions | `features/categories/` | Menu dropdown + AlertDialog excluir |
| IconPicker | `features/categories/` | Dialog com grid de ícones Lucide |

### Ícones Disponíveis (Lucide)
- EXPENSE: ShoppingCart, ShoppingBag, Car, Home, Utensils, Film, Gamepad2, Tv, Laptop, Smartphone...
- INCOME: Briefcase, Banknote, DollarSign, Wallet, TrendingUp...
- INVESTMENT: LineChart, Building, Building2, PiggyBank, TrendingUp...
- TRANSFER: ArrowLeftRight, ArrowUpRight, CreditCard, Wallet, Phone, Mail...

### Schema Zod (Categories)
```typescript
import { categoryTypeEnum, createCategorySchema } from "@/features/categories/schemas";

const typeOptions = ["EXPENSE", "INCOME", "INVESTMENT", "TRANSFER"];
```

## Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Importação
```typescript
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
```
