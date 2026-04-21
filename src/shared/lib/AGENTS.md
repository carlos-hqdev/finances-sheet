# AGENTS.md - src/shared/lib/

## Context7 MCP
**SEMPRE** use Context7 MCP para consultar documentação antes de usar bibliotecas.

## db.ts
- Cliente Prisma com adapter PostgreSQL
- **Única fonte** de acesso ao banco
- Serialização obrigatória: `.toNumber()` em Decimal

```typescript
import { prisma } from "@/shared/lib/db";

const account = await prisma.bankAccount.findFirst();
const balance = account.balance.toNumber(); // OBRIGATÓRIO
```

## utils.ts
- `cn()`: Merge de classes (clsx + tailwind-merge)
- `formatCurrency()`: Formatação BRL

## auth.ts
- Configuração Better-Auth server
- Campos customizados: `displayName`, `cpf`

## auth-client.ts
- Hooks: `useSession()`, `signIn()`, `signOut()`

## parsers/
Ver `src/shared/lib/parsers/AGENTS.md` para parsers de extrato.
- Suporta: Nubank, Bradesco, C6, Inter, MercadoPago, PicPay
- Formatos: CSV, OFX, PDF
