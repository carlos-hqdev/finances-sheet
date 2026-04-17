# AGENT.md - src/shared/components/layout/

## Context7 MCP
**SEMPRE** use Context7 MCP para consultar documentação antes de usar componentes Radix/shadcn.

## Componentes

### AdminLayoutWrapper
Container principal da área logada.

```typescript
interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user: User;
  sidebarInfo: SidebarInfo;
}

interface SidebarInfo {
  name: string;
  displayName: string | null;
  email: string;
  image: string | null;
  currentBalance: number;
  reserves: number;
  totalGoals: number;
  monthlyExpenses: number;
}
```

### Sidebar
- Navegação com grupos: Visão Geral, Finanças, Análise, Configurações
- Resumo financeiro na parte inferior
- Modo collapsed suportado
- Overlay mobile com toggle

### Header
- Toggle sidebar (PanelLeft icon)
- ThemeToggle
- Avatar com menu dropdown (Perfil, Sair)

## Cores do Tema

```css
/* Light */
--sidebar: #FBFBFB
--sidebar-foreground: #1A1A1A
--sidebar-primary: oklch(0.205 0 0)

/* Dark */
--sidebar: #343434
--sidebar-foreground: #EBEBEB
--sidebar-primary: #3b82f6
```
