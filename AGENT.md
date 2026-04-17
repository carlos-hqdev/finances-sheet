# AGENT.md - Finances Sheet

**Este é o arquivo de referência principal para IAs e agentes (como opencode) que precisam entender, manter ou expandir este projeto.**

---

## Sobre o Projeto

**Nome:** Finances Sheet
**Tipo:** Aplicação pessoal de gestão financeira
**Stack:** Next.js 16 + React 19 + TypeScript
**Banco:** PostgreSQL via Prisma
**Auth:** Better-Auth
**Estilização:** Tailwind CSS v4 + shadcn/ui
**Idioma:** Português do Brasil (pt-BR)

---

## Uso do Context7 MCP (OBRIGATÓRIO)

**SEMPRE** use o Context7 MCP para consultar documentação antes de:
- Usar bibliotecas/frameworks (React, Next.js, Prisma, Tailwind, etc.)
- Resolver bugs relacionados a APIs de terceiros
- Adicionar dependências
- Usar componentes de UI unknown

**Como usar:**
1. Carregar skill: `context7-mcp`
2. Resolver library ID: `context7_resolve-library-id`
3. Consultar docs: `context7_query-docs`

**Exemplo:**
```
Tarefa: Adicionar validação de formulário
→ Skill: context7-mcp
→ Query: "react-hook-form zod validation schema"
→ Consultar documentação antes de implementar
```

---

## Regras Fundamentais (OBRIGATÓRIAS)

### Sistema
- **Terminal**: Zsh (não Bash/PowerShell)
- **Pacotes**: **SEMPRE** use `pnpm` - PROIBIDO npm/yarn/bun
- **Build**: **NUNCA** execute `pnpm build` para testar - apenas quando solicitado

### Importação de Módulos
- **SEMPRE** use path aliases: `@/features/...`, `@/shared/...`, `@/entities/...`
- **NUNCA** use caminhos relativos como `../../lib/` ou `../components/`

```typescript
// CERTO ✅
import { Button } from "@/shared/components/ui/button";
import { getUser } from "@/features/users";

// ERRADO ❌
import { Button } from "../../shared/components/ui/button";
```

### Serialização Prisma
- **NUNCA** passe objetos `Prisma.Decimal` diretamente para Client Components
- **SEMPRE** converta com `.toNumber()`

```typescript
// CERTO ✅
const data = {
  balance: account.balance.toNumber(),
  yieldRate: investment.yieldRate?.toNumber() ?? null
};

// ERRADO ❌ - Causará erro em runtime
const data = { balance: account.balance }; // Decimal não serializa!
```

### Idioma
- Toda comunicação, código, comentários e documentação devem ser em **Português do Brasil**

---

## Estrutura de Pastas

### Visão Geral

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── (auth)/            # Grupo: autenticação (sign-in, sign-up)
│   └── (dashboard)/       # Grupo: área logada
│       ├── accounts/
│       ├── categories/
│       ├── credit-cards/
│       ├── investments/
│       ├── profile/
│       ├── reports/
│       ├── transactions/
│       └── page.tsx       # Dashboard principal
│
├── features/               # Módulos de negócio (autossuficientes)
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── credit-cards/
│   ├── dashboard/
│   ├── investments/
│   └── auth/
│       └── [cada feature]/
│           ├── actions/       # Server Actions
│           ├── components/
│           ├── index.ts       # API pública (OBRIGATÓRIO)
│           ├── schemas.ts     # Zod schemas
│           └── types.ts
│
├── shared/                 # Código compartilhado
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/      # Header, Sidebar, AdminLayoutWrapper
│   ├── lib/              # Utilitários
│   │   ├── db.ts        # Prisma client
│   │   ├── utils.ts     # cn(), formatCurrency()
│   │   ├── auth.ts      # Better-Auth server
│   │   ├── auth-client.ts
│   │   └── parsers/     # Parsers de extrato bancário
│   └── providers/
│
└── types/                # Tipos globais
```

### Padrão de Feature

Cada feature deve seguir este padrão:

```
features/[nome]/
├── actions/           # Server Actions (arquivos .ts)
│   └── feature-actions.ts
├── components/        # Componentes React (.tsx)
│   ├── FeatureList.tsx
│   ├── FeatureDialog.tsx
│   └── FeatureCard.tsx
├── index.ts           # Exportar tudo publicamente
├── schemas.ts         # Zod schemas para validação
└── types.ts           # Tipos TypeScript
```

---

## Comandos Úteis

```bash
# Desenvolvimento
pnpm dev

# Lint e Formatação (Biome)
pnpm biome check       # Verificar
pnpm biome check --write  # Corrigir automaticamente

# Database
pnpm prisma migrate dev --name nome       # Criar migration
pnpm prisma db push                      # Sync sem migration
pnpm prisma studio                       # Interface visual

# NÃO USE pnpm build para testar - apenas quando solicitado
```

---

## Autenticação (Better-Auth)

### Estrutura
- `src/shared/lib/auth.ts` - Configuração server
- `src/shared/lib/auth-client.ts` - Hooks para client
- `src/app/api/auth/[...all]/route.ts` - API route

### Campos Customizados
O User do Prisma tem campos extras:
- `displayName` - Nome de exibição customizado
- `cpf` - Para identificar transferências internas

### Uso em Server Components
```typescript
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

### Uso em Client Components
```typescript
import { useSession } from "@/shared/lib/auth-client";

const { data: session } = useSession();
```

---

## Layout e Navegação

### AdminLayoutWrapper
Componente que engloba toda a área logada.

**Props:**
```typescript
interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user: User;           // Dados do usuário logado
  sidebarInfo: SidebarInfo;  // Dados financeiros para sidebar
}
```

### Sidebar
Exibe resumo financeiro na parte inferior:
- Saldo
- Saídas (despesas do mês)
- Metas
- Reservas

### Header
Exibe:
- Toggle de sidebar
- Troca de tema (ThemeToggle)
- Avatar do usuário com menu (Perfil, Sair)

---

## Padrões de Código

### Server Actions
```typescript
// "use server" no topo do arquivo
"use server";

import { prisma } from "@/shared/lib/db";

export async function createAccount(data: CreateAccountInput) {
  const account = await prisma.bankAccount.create({ data });
  return account;
}
```

### Zod Schemas
```typescript
import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "INVESTMENT", "SAVINGS", "CASH"]),
  balance: z.number().default(0),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
```

### Componentes UI
- Usar shadcn/ui base components em `@/shared/components/ui/`
- Componentes customizados vão em `features/[name]/components/`
- Sempre exportar via `index.ts` da feature

---

## Banco de Dados (Prisma)

### Modelos Principais

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  displayName   String?
  email         String   @unique
  cpf           String?

  bankAccounts  BankAccount[]
  categories    Category[]
  investments   Investment[]
}

model BankAccount {
  id       String   @id @default(cuid())
  userId   String
  name     String
  type     String   // CHECKING, INVESTMENT, SAVINGS, CASH
  balance  Decimal  @default(0)

  user         User          @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

model Transaction {
  id            String   @id @default(cuid())
  accountId     String
  type          String   // INCOME, EXPENSE, TRANSFER
  amount        Decimal
  date          DateTime
  description   String
  isPaid        Boolean  @default(false)

  account       BankAccount @relation(fields: [accountId], references: [id])
  category      Category?   @relation(fields: [categoryId], references: [id])
}

model Investment {
  id           String   @id @default(cuid())
  userId       String
  name         String
  type         String   // FIXED, VARIABLE, CRYPTO, SAVINGS, FIIS
  balance      Decimal  @default(0)
  targetAmount Decimal?

  user         User     @relation(fields: [userId], references: [id])
}
```

---

## Parsers de Extrato

### Bancos Suportados
- Nubank (CSV, OFX, PDF)
- Bradesco (CSV, PDF)
- C6 Bank (OFX, PDF)
- Inter (CSV, OFX)
- MercadoPago (CSV, PDF)
- PicPay (PDF)

### Arquitetura
```
src/shared/lib/parsers/
├── index.ts           # Interface pública
├── csv-parser.ts      # Parser CSV
├── ofx-parser.ts      # Parser OFX
├── pdf-parser.ts      # Parser PDF
└── import-utils.ts    # Normalização
```

### Uso
```typescript
import { parseBankStatement } from "@/shared/lib/parsers";

// Detecta automaticamente o banco e formato
const transactions = await parseBankStatement(file);
```

---

## Design System

### Cores (Tailwind CSS v4 - oklch)

| Token | Light | Dark |
|-------|-------|------|
| `--background` | #FFFFFF | #252525 |
| `--foreground` | #1A1A1A | #EBEBEB |
| `--primary` | #343434 | #EBEBEB |
| `--destructive` | #DC2626 | #B91C1C |
| `--sidebar` | #FBFBFB | #343434 |

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Troubleshooting Comum

### Hydration Mismatch
- **Causa:** `new Date()` ou `Math.random()` executando no SSR
- **Solução:** Usar `useEffect` para inicializar valores no cliente

```typescript
// ERRADO ❌
const date = new Date();
const [value, setValue] = useState(Math.random());

// CERTO ✅
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
```

### Decimal para Cliente
- **Causa:** Passar Prisma.Decimal para componente cliente
- **Solução:** `balance.toNumber()` antes de passar como prop

### Chart Dimensions (Recharts)
- **Causa:** Container sem altura definida
- **Solução:** Usar altura fixa em pixels, não 100%

```typescript
// ERRADO ❌
<ResponsiveContainer width="100%" height="100%">

// CERTO ✅
<div style={{ height: 300 }}>
  <ResponsiveContainer width="100%" height={300}>
```

---

## Documentação Específica

- `src/shared/lib/parsers/AGENT.md` - Parsers de extrato
- `src/shared/components/layout/AGENT.md` - Layout components
- `src/shared/components/ui/AGENT.md` - UI components
- `docs/PROJECT_MAP.md` - Mapa completo do projeto
- `docs/ROADMAP.md` - Roadmap futuro

---

## Fluxo de Trabalho

### Criar Feature
1. Criar branch: `git checkout -b feat/nome`
2. Criar estrutura em `src/features/[nome]/`
3. Implementar Server Actions em `actions/`
4. Criar componentes em `components/`
5. Exportar via `index.ts`
6. Testar com `pnpm dev`
7. Commit com mensagem descritiva
8. PR ou merge para main

### Correção de Bug
1. Criar branch: `git checkout -b fix/descricao`
2. Identificar e corrigir o problema
3. Testar
4. Commit: `fix: descrição do problema`
5. PR ou merge

---

**Última atualização:** 2025-04-16
