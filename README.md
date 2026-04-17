# Finances Sheet

Aplicação pessoal de gestão financeira com foco em controle de gastos, investimentos e análises.

## Tech Stack

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| Next.js | 16.x | Framework React com App Router |
| React | 19.x | Biblioteca UI |
| TypeScript | - | Tipagem estática |
| Prisma | 7.x | ORM para PostgreSQL |
| Better-Auth | - | Sistema de autenticação |
| Tailwind CSS v4 | - | Estilização |
| shadcn/ui | - | Componentes UI baseados em Radix |
| Recharts | - | Gráficos |
| Zod | - | Validação de schemas |
| React Hook Form | - | Gerenciamento de formulários |
| pnpm | - | Gerenciador de pacotes |

## Começando

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- PostgreSQL (local ou Docker)
- Docker (opcional, para PostgreSQL)

### Instalação

```bash
# Clonar repositório
git clone https://github.com/carlos-hqdev/finances-sheet.git
cd finances-sheet

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Gerar cliente Prisma
pnpm prisma generate

# Executar migrations
pnpm prisma migrate dev

# Iniciar desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/finances"

# Auth (Better-Auth)
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Scripts Disponíveis

```bash
pnpm dev          # Desenvolvimento
pnpm build        # Build de produção (NÃO usar para testar)
pnpm start        # Iniciar produção
pnpm lint         # Verificar lint
pnpm biome check  # Verificar/corrigir código com Biome
pnpm biome format # Formatar código
pnpm prisma studio # Interface visual do banco
pnpm prisma migrate dev # Criar migration
pnpm prisma db push  # Sincronizar schema sem migration
```

## Arquitetura do Projeto

### Estrutura de Pastas (Feature-Sliced Design)

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
│       └── transactions/
├── features/               # Módulos de negócio (autossuficientes)
│   ├── accounts/
│   │   ├── actions/       # Server Actions
│   │   ├── components/
│   │   ├── index.ts       # API pública
│   │   └── schemas.ts     # Zod schemas
│   ├── transactions/
│   ├── categories/
│   ├── credit-cards/
│   ├── dashboard/
│   ├── investments/
│   └── auth/
├── shared/                 # Código compartilhado
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/      # Header, Sidebar, AdminLayoutWrapper
│   ├── lib/              # Utilitários
│   │   ├── db.ts        # Prisma client
│   │   ├── utils.ts     # cn(), formatCurrency()
│   │   ├── auth.ts      # Better-Auth server config
│   │   ├── auth-client.ts
│   │   ├── parsers/     # Parsers de extrato bancário
│   │   └── finance-utils.ts
│   └── providers/        # React Context providers
└── types/                # Tipos globais
```

### Regras Importantes

1. **SEMPRE** use path aliases: `@/features/...`, `@/shared/...`
2. **NUNCA** use caminhos relativos como `../../lib/`
3. **NUNCA** execute `pnpm build` para testar mudanças
4. **SEMPRE** exporte API pública via `index.ts` em cada feature
5. **SEMPRE** serializar `Prisma.Decimal` com `.toNumber()` antes de passar para cliente

### Exemplos

```typescript
// CERTO: Usar path alias
import { Button } from "@/shared/components/ui/button";
import { getUser } from "@/features/users";

// ERRADO: Usar caminho relativo
import { Button } from "../../shared/components/ui/button";

// CERTO: Serializar Decimal
const data = {
  balance: account.balance.toNumber(), // Decimal → number
  yieldRate: investment.yieldRate?.toNumber() ?? null
};
```

## Funcionalidades Implementadas

### Dashboard
- [x] Cards de resumo (Saldo, Receitas, Despesas, Reserva de Emergência)
- [x] Gráfico de Fluxo de Caixa
- [x] Gráfico de Patrimônio (Pizza)
- [x] Comparativo Anual
- [x] Análise por Períodos (Trimestres/Semestres)
- [x] Seletor de Mês

### Contas
- [x] CRUD de contas bancárias
- [x] Tipos: Corrente, Investimento, Poupança, Carteira
- [x] Saldo atual

### Transações
- [x] CRUD de transações
- [x] Tipos: Receita, Despesa, Transferência
- [x] Parcelamento
- [x] Recorrência básica
- [x] Importação de extratos (CSV, OFX, PDF)
- [x] Suporte a múltiplos bancos: Nubank, Bradesco, C6 Bank, Inter, MercadoPago, PicPay

### Cartões de Crédito
- [x] CRUD de cartões
- [x] Configuração de limite, dia de fechamento, vencimento
- [x] Faturas

### Investimentos
- [x] CRUD de investimentos
- [x] Tipos: Renda Fixa, Variável, Crypto, FIIs, Poupança
- [x] Cofrinhos com meta e rendimento
- [x] Histórico de saldo

### Categorias
- [x] CRUD de categorias
- [x] Ícones e cores customizáveis
- [x] Orçamentos mensais

### Autenticação
- [x] Login/Registro via email
- [x] Campos customizados: displayName, CPF
- [x] Tema claro/escuro

## Funcionalidades Futuras

- [ ] Fechamento de mês dinâmico (baseado em data de salário)
- [ ] Alertas de orçamento
- [ ] Importação automática de rendimentos
- [ ] Relatórios avançados PDF/Excel
- [ ] Multi-moeda
- [ ] Backup automático

## Banco de Dados

### Schema Principal (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  displayName   String?  // Nome de exibição customizado
  email         String   @unique
  emailVerified Boolean  @default(false)
  image         String?
  cpf           String?  // Para identificar transferências internas

  bankAccounts  BankAccount[]
  categories    Category[]
  budgets       Budget[]
  investments   Investment[]
}

model BankAccount {
  id          String   @id @default(cuid())
  userId      String
  name        String
  type        String   // CHECKING, INVESTMENT, SAVINGS, CASH
  balance     Decimal  @default(0)

  user        User     @relation(...)
  transactions Transaction[]
}

model Transaction {
  id            String   @id @default(cuid())
  accountId     String
  categoryId    String?
  type          String   // INCOME, EXPENSE, TRANSFER
  amount        Decimal
  date          DateTime
  description   String
  isPaid        Boolean  @default(false)
  // ... campos adicionais
}

model Investment {
  id           String   @id @default(cuid())
  userId       String
  name         String
  type         String   // FIXED, VARIABLE, CRYPTO, SAVINGS, FIIS
  balance      Decimal  @default(0)
  targetAmount Decimal? // Meta para cofrinhos
  // ... campos adicionais
}
```

### Comandos Prisma

```bash
# Criar migration
pnpm prisma migrate dev --name add_new_field

# Sync sem migration (desenvolvimento)
pnpm prisma db push

# Resetar banco
pnpm prisma migrate reset

# Studio visual
pnpm prisma studio
```

## Estilização

### Design System (oklch)

| Variável | Light | Dark |
|----------|-------|------|
| background | #FFFFFF | #252525 |
| foreground | #1A1A1A | #EBEBEB |
| primary | #343434 | #EBEBEB |
| destructive | #DC2626 | #B91C1C |
| sidebar | #FBFBFB | #343434 |

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## API de Parsers de Extrato

O projeto inclui parsers para importar transações de diversos bancos:

```typescript
// src/shared/lib/parsers/
├── index.ts           # Interface pública
├── csv-parser.ts      # Parser CSV genérico
├── ofx-parser.ts      # Parser OFX
├── pdf-parser.ts      # Parser PDF (Nubank, Bradesco, etc)
└── import-utils.ts    # Normalização e detecção
```

### Bancos Suportados

| Banco | CSV | OFX | PDF |
|-------|-----|-----|-----|
| Nubank | ✅ | ✅ | ✅ |
| Bradesco | ✅ | - | ✅ |
| C6 Bank | - | ✅ | ✅ |
| Inter | ✅ | ✅ | - |
| MercadoPago | ✅ | - | ✅ |
| PicPay | - | - | ✅ |

## Contribuição

1. Criar branch: `git checkout -b feat/nome-da-feature`
2. Fazer commits com mensagens descritivas
3. Push: `git push origin feat/nome-da-feature`
4. Criar Pull Request

### Regras de Commit

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Estilo (formatação)
- `refactor:` Refatoração
- `perf:` Performance
- `test:` Testes
- `chore:` Tarefas gerais

## Licença

Projeto pessoal - Todos os direitos reservados.
