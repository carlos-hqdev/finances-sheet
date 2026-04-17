# AGENT.md - src/features/

## Context7 MCP
**SEMPRE** use Context7 MCP para consultar documentação antes de usar bibliotecas/frameworks.

## Estrutura (Feature-Sliced Design)

Cada feature é um módulo isolado com:

```
features/[nome]/
├── actions/           # Server Actions (.ts)
├── components/        # Componentes React (.tsx)
├── index.ts           # API pública (OBRIGATÓRIO)
├── schemas.ts         # Zod schemas
└── types.ts
```

## Features

### accounts
- CRUD de contas bancárias
- Tipos: CHECKING, INVESTMENT, SAVINGS, CASH

### transactions
- CRUD de transações
- Tipos: INCOME, EXPENSE, TRANSFER
- Importação de extratos (CSV, OFX, PDF)

### categories
- CRUD de categorias
- Ícones e cores customizáveis

### credit-cards
- CRUD de cartões
- Fechamento/vencimento (closingDay/dueDay)

### dashboard
- Cards de resumo
- Gráficos (Recharts)
- Análise comparativa

### investments
- CRUD de investimentos
- Tipos: FIXED, VARIABLE, CRYPTO, SAVINGS, FIIS
- Cofrinhos com meta

### users
- Gerenciamento de perfil
- displayName, cpf

## Importação

```typescript
// CERTO ✅
import { AccountList } from "@/features/accounts";
import { createTransaction } from "@/features/transactions/actions";

// ERRADO ❌
import { AccountList } from "../../features/accounts";
```

## Serialização

```typescript
// CERTO ✅
{ balance: account.balance.toNumber() }

// ERRADO ❌
{ balance: account.balance } // Prisma.Decimal não serializa!
```
