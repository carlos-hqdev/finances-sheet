# AGENT.md - src/shared/components/layout/

Este diretório contém os componentes de layout principal da aplicação (Header e Sidebar).

## Sistema de Layout

### Cores (Sidebar)
```css
/* Sidebar - Light */
--sidebar: oklch(0.985 0 0)              /* #FBFBFB */
--sidebar-foreground: oklch(0.145 0 0)    /* #1A1A1A */
--sidebar-primary: oklch(0.205 0 0)
--sidebar-primary-foreground: oklch(0.985 0 0)
--sidebar-accent: oklch(0.97 0 0)
--sidebar-accent-foreground: oklch(0.205 0 0)
--sidebar-border: oklch(0.922 0 0)
--sidebar-ring: oklch(0.708 0 0)

/* Sidebar - Dark */
--sidebar: oklch(0.205 0 0)               /* #343434 */
--sidebar-foreground: oklch(0.985 0 0)
--sidebar-primary: oklch(0.488 0.243 264.376)
--sidebar-accent: oklch(0.269 0 0)
```

### header.tsx
- **Propósito**: Barra de navegação superior
- **Composição**: Logo, título,ThemeToggle, informações do usuário
- **Altura**: h-16 (64px)
- **Borda**: border-b com --sidebar-border

### sidebar.tsx
- **Propósito**: Navegação lateral com menu
- **Largura**: 
  - Desktop expanded: w-64 (256px)
  - Desktop collapsed: w-20 (80px)
  - Mobile: w-64 (256px), oculta por padrão com -translate-x-full
- **Transições**: duration-300 ease-in-out
- **Navegação**: Grupos (Visão Geral, Finanças, Análise, Configurações)
- **Ícones**: Lucide React
- **Dropdown do usuário**: Menu com Perfil e Sair
- **Avatar**: Círculo com iniciais do nome (h-8 w-8, rounded-full)

### admin-layout-wrapper.tsx
- **Propósito**: Container do layoutdashboard
- **Composição**: Sidebar + Header (opcional)
- **Responsividade**: Sidebar colapsável em mobile

### index.ts
- **Export**: Barrel export para layout components

## Tipos de Ícones Usados (Lucide React)
- LayoutDashboard
- Wallet
- ArrowRightLeft
- CreditCard
- BarChart
- Settings
- LogOut
- User