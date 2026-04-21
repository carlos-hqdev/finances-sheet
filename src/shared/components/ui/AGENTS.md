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
| Dialog | Radix | modais |
| DropdownMenu | Radix | menus |
| Sheet | Radix | slide-out |
| Select | Radix | selects |
| Tabs | Radix | abas |
| Table | - | listas |
| Input | - | formulários |
| Form | RHF + Zod | validação |
| Toast | Sonner | notificações |

## Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Importação
```typescript
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
```
