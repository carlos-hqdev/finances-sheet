---
trigger: always_on
---

# Diretrizes do Projeto Finances Sheet

## Context7 MCP (OBRIGATÓRIO)
**SEMPRE** use Context7 MCP para consultar documentação antes de:
- Usar bibliotecas/frameworks (React, Next.js, Prisma, Tailwind, etc.)
- Resolver bugs relacionados a APIs de terceiros
- Adicionar dependências
- Usar componentes de UI unknown

**Como usar:**
1. Carregar skill: `context7-mcp`
2. Resolver library ID: `context7_resolve-library-id`
3. Consultar docs: `context7_query-docs`

## Sistema Operacional e Terminal
1. O sistema operacional padrão é **WSL Ubuntu** (dentro do Windows 11).
2. O terminal utilizado é o **Zsh** (não Bash/PowerShell).
3. Use comandos normais do Linux (ls, rm, grep, etc.).

## Gerenciamento de Pacotes
1. O gerenciador de pacotes obrigatório é o **pnpm**.
2. **PROIBIDO** usar `npm`, `yarn` ou `npx`. Use sempre `pnpm`.
3. **NUNCA** execute `pnpm build` a menos que explicitamente solicitado.

## Estrutura de Pastas (FSD - Feature-Sliced Design)

```
src/
├── app/                      # Rotas Next.js App Router
│   ├── (auth)/              # Route Group: autenticação
│   │   └── sign-in/
│   └── (dashboard)/         # Route Group: área logada
├── features/                 # Módulos de negócio (autossuficientes)
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── investments/
│   ├── dashboard/
│   ├── credit-cards/
│   └── [cada feature]/
│       ├── components/
│       ├── actions/         # Server Actions
│       ├── schemas.ts      # Zod schemas
│       ├── types.ts
│       └── index.ts         # Public API
├── shared/                   # Código compartilhado
│   ├── components/
│   │   ├── ui/              # Componentes Shadcn
│   │   └── layout/          # Header, Sidebar, Layout
│   ├── lib/                 # Utilitários e libs
│   │   ├── db.ts            # Prisma client
│   │   └── utils.ts
│   └── providers/            # Context providers
└── entities/                 # Regras de negócio puro
    ├── account/
    └── ticket/
```

## Regras de Importação
- **SEMPRE** use path aliases: `@/features/...`, `@/shared/...`, `@/entities/...`
- **NUNCA** use caminhos relativos que passam de pasta (ex: `../../lib/`)

## Banco de Dados
- **ORM**: Prisma
- **Database**: PostgreSQL (via Docker)
- Para mudanças no schema: `pnpm prisma migrate dev --name nome_da_mudança`

## Autenticação (Planejada)
- Provider recomendado: **Better Auth** (ainda não implementado)
- Quando implementar:
  - Config: `@/shared/lib/auth.ts`
  - Client: `@/shared/lib/auth-client.ts`
  - Server: `@/shared/lib/auth-server.ts`
  - API Route: `@/app/api/auth/[...all]/route.ts`

## Next.js e Prisma (Serialização)
1. **NUNCA** passe objetos `Prisma.Decimal` para Client Components.
2. **SEMPRE** serialize com `.toNumber()` antes de passar via props.
3. Exemplo: `balance: account.balance.toNumber()`
4. Para campos opcionais: `yieldRate: item.yieldRate ? item.yieldRate.toNumber() : null`

## Idioma e Comunicação
1. Toda comunicação, explicações e logs devem ser em **Português do Brasil (pt-BR)**.
2. Explique o que está sendo alterado antes de aplicar mudanças.

## Convenções de Código
1. Sempre exporte API pública via `index.ts` em cada feature.
2. Validação de formulários: use Zod schemas em `features/[name]/schemas.ts`.
3. Mantenha componentes de UI em `shared/components/ui/`.
4. Lógica de negócio pura vai para `entities/`.
5. Não remova comentários de documentação existentes.
