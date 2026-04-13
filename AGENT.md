# AGENT.md - Finances Sheet

Arquivo de referência central para IAs e agentes que precisam entender, manter ou expandir este projeto.

## Visão Geral do Projeto

**Nome**: Finances Sheet  
**Tipo**: Aplicação pessoal de gestão financeira  
**Stack**: Next.js 14+ (App Router), React 19, TypeScript  
**Banco**: PostgreSQL via Docker  
**ORM**: Prisma  
**Autenticação**: Better-Auth  
**Estilização**: Tailwind CSS v4 + shadcn/ui  

## Estrutura de Pastas

```
src/
├── app/                    # Rotas Next.js App Router
│   ├── (auth)/            # Grupo de rotas: autenticação
│   └── (dashboard)/       # Grupo de rotas: área logada
├── features/               # Módulos de negócio (FSD)
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── investments/
│   ├── dashboard/
│   ├── credit-cards/
│   ├── auth/
│   └── users/
├── shared/
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── layout/        # Header, Sidebar
│   ├── lib/               # Utilitários e configs
│   └── providers/         # Context providers
├── entities/              # Regras de negócio puro
└── types/                 # Tipos globais
```

## Design System

### Cores (oklch)
| Variável | Light | Dark |
|---------|-------|------|
| background | #FFFFFF | #252525 |
| foreground | #1A1A1A | #EBEBEB |
| primary | #343434 | #EBEBEB |
| destructive | #DC2626 | #B91C1C |
| sidebar | #FBFBFB | #343434 |

### Tipografia
- **Fontes**: Geist Sans, Geist Mono
- **Tamanhos**: text-xs:12px, text-sm:14px, text-base:16px

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Comandos Principais

```bash
# Desenvolvimento
pnpm dev

# Build
pnpm build

# Database
pnpm prisma migrate dev --name nome

# Lint
pnpm biome check
```

## Autenticação

- **Provider**: Better-Auth
- **Campos customizados**: displayName, cpf
- ** Sessão**: 7 dias de validade

## Regras Importantes

1. **SEMPRE** usar path aliases: `@/features/...`, `@/shared/...`
2. **NUNCA** usar caminhos relativos (`../../`)
3. **Serializar** Prisma.Decimal com `.toNumber()` antes de passar para cliente
4. **Idioma**: Português do Brasil (pt-BR)
5. **Gerenciador de pacotes**: pnpm (PROIBIDO npm/yarn)

## Documentação Específica

- `src/shared/lib/parsers/AGENT.md` - Parsers de extrato bancário
- `.agents/rules/env-rules.md` - Regras específicas do ambiente

---

Para dúvidas sobre componentes específicos, veja o AGENT.md correspondente em cada diretório.