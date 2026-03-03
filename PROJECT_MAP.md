# Projeto finances-sheet - Mapa Estrutural Completo

Este documento apresenta o estado atual da arquitetura, stack tecnológica e regras de negócios do projeto de controle financeiro `finances-sheet`. O objetivo principal é guiar as futuras evoluções (fechamento de mês dinâmico, automação de faturas, rendimentos automáticos de cofrinhos e relatórios comparativos).

## 1. Arquitetura de Pastas

O projeto utiliza o App Router do Next.js e segue uma estrutura baseada em *Feature-Sliced Design* ou *Atomic Design* adaptado, dividida nas seguintes pastas principais dentro de `src/`:

```text
src/
├── actions/             # Server actions globais (ex: financials.ts)
├── app/                 # Rotas do Next.js (App Router)
│   ├── accounts/        
│   ├── categories/
│   ├── credit-cards/
│   ├── investments/
│   ├── reports/
│   └── transactions/
├── entities/            # Entidades de domínio e tipos globais
├── features/            # Módulos isolados por contexto (Feature-Sliced)
│   ├── accounts/        # Componentes, schemas e lógicas de Contas
│   ├── categories/      # Componentes e lógicas de Categorias
│   ├── credit-cards/    # Componentes e lógicas de Cartões de Crédito
│   ├── dashboard/       # Componentes da visão geral (SummaryCard, etc)
│   └── transactions/    # Formulários e modais de Transações
└── shared/              # Código compartilhado entre as features
    ├── components/      # Componentes de UI genéricos (Shadcn/UI, Layout)
    ├── hooks/           # Custom hooks utilitários
    ├── lib/             # Configurações globais (db.ts, utils)
    ├── providers/       # Contextos e Providers (Themes, etc)
    └── widgets/         # Componentes complexos compartilhados (Dashboard Layout)
```

## 2. Tech Stack

O aplicativo está configurado com ferramentas modernas e robustas para o ecossistema React/Next:

- **Framework:** Next.js 16.0.10 (App Router) e React 19.2.1
- **Estilização:** Tailwind CSS v4 com `next-themes` para suporte a Light/Dark mode.
- **Componentes UI:** Shadcn/UI (baseado no Radix UI primitivos, utilizando `clsx` e `tailwind-merge`). Animações sutis via `framer-motion`.
- **Formulários e Validação:** `react-hook-form` e `zod`.
- **Banco de Dados (ORM):** Prisma ORM (`@prisma/client` v7.1.0) utilizando o `@prisma/adapter-pg` conectado a um PostgreSQL.
- **Gráficos:** Recharts.
- **Ferramentas de Qualidade:** Biome (para linting/formatação).

## 3. Modelagem do Banco de Dados (Prisma)

A modelagem reflete uma estrutura relacional centralizada no usuário, contas, transações e cartões de crédito.

### Entidades Principais e Relacionamentos:
- **User:** Tabela raiz. Possui relação de *1-para-muitos* com Accounts, Categories, Budgets e Investments.
- **Account:** Representa contas físicas (Corrente, Investimento, Carteira). 
  - Possui `balance` com valor padrão (0).
  - Relaciona-se com `Transaction` (como origem e destino de transferências e vinculação normal) e `CreditCard`.
- **CreditCard:** Vinculado a uma `Account`. Cadastra `limit`, `closingDay` (dia de fechamento) e `dueDay` (vencimento).
- **Category:** Categorias de gastos/receitas, com ícone e cor customizáveis.
- **Transaction:** Tabela principal de movimentações.
  - Guarda `amount`, `type` (INCOME, EXPENSE, TRANSFER), `paymentMethod`, `date`, `isPaid`.
  - Suporta lógica condicional básica (`A_VISTA`, `PARCELADO`) e lógica futura de repetição (`isRecurring`).
  - Vincula-se a uma `Account`, podendo opcionalmente referenciar um `CreditCard` e/ou uma `Category`.
  - Para transferências, utiliza `destinationAccountId` apontando para a `Account` de destino.
- **Budget & Investment / InvestmentHistory:** Tabelas avulsas para gerenciar orçamentos estipulados por categoria e o controle de investimentos/cofrinhos e seus históricos de saldo ao longo do tempo.

## 4. Lógica de Negócio Atual (Saldos e Faturas)

**Aviso Importante para Futuras Melhorias:** O sistema encontra-se hoje com lógicas estritamente de banco de dados, mas carece de gatilhos automáticos.

- **Cálculo de Saldos (Contas):**
  Atualmente, a tabela `Account` possui uma coluna `balance`. Durante a criação de uma `Transaction` (em `src/actions/financials.ts`), o valor da transação **não** está deduzindo ou somando automaticamente no `balance` da tabela `Account`. A interface apenas lê o campo persistido na criação ou exige atualização manual.
  *Melhoria Necessária:* Implementar lógicas no serviço (ou triggers de Banco/Prisma middlewares) para recalcular e atualizar o saldo da conta baseando-se nas movimentações e no status de `isPaid`.

- **Cálculo de Faturas (Cartão de Crédito):**
  Ainda **não existe** uma entidade ou agregação nativa automatizada para processamento de fatura mensal que envolva pagamento e abatimento inteligente.
  Lançamentos feitos no cartão via `createTransaction` inserem a relação com o `creditCardId`. O `CreditCard` tem `closingDay` e `dueDay`, mas isso age apenas como dados soltos. A despesa de crédito não vira automaticamente uma cobrança agregada para ser lançada contra o fluxo de caixa na data X.
  *Melhoria Necessária:* Criar uma visualização e/ou fechamento de Fatura dinâmica, que intercepte transações baseadas no dia do mês entre `closingDay` anterior e o atual.

- **Rendimentos / Cofrinhos:**
  O rendimento automático não está implementado hoje na modelagem de negócios. O saldo de cada `Investment` ou é injetado estaticamente ou é editado manualmente adicionando entradas no histórico (`InvestmentHistory`).

- **Fechamento de Mês Dinâmico:**
  Toda a visualização das Listagens e do Dashboard reflete as transações e o total estático em conta real, sem filtragem inteligente de "períodos de salário" customizados (25 até 24 do próximo mês). No Dashboard, a divisão dos dados é ainda genérica/anual.

## 5. UI/UX (Layout e Navegação)

- **Layout Geral:** Utiliza um `DashboardLayout` envelopando todo o aplicativo provendo barra lateral e conteúdo contâiner, com temas centralizados Light/Dark mode pelo next-themes.
- **Página Inicial (Dashboard):** 
  - Exibe 4 Cartões Resumo (Saldo Total, Receitas, Despesas, Investimentos) utilizando o componente genérico `SummaryCard`.
  - Apresenta um Bento Grid Moderno (grid responsivo) na área central inferior projetado para alocar os gráficos de `Fluxo de Caixa` (via Lib Recharts) e `Gastos por Categoria`.
- **Experiência Limpa (Modais):** As inserções de novas Transações, Categorias ou Cartões de Crédito (`TransactionDialog`, `CreditCardDialog`, etc) foram sabiamente abstraídas em `features/` dentro de Modais/Dialogs que reaproveitam contexto, mantendo o usuário na página sem recarregamentos pesados. As animações da Framer Motion melhoram a responsividade condicional.

---
**Conclusão:**
O projeto está solidamente estruturado com ferramentas espetaculares de Front-end (Shadcn, Tailwind v4, React Hook Form) e Modelagem de Dados bem dividida (Feature-Sliced). O esforço focado agora, para atingir o seu objetivo, será criar o núcleo inteligente de back-end: *Cálculos Dinâmicos* em vez de persistências C.R.U.D secas. Há a base robusta para iniciarmos a injeção do fechamento automático e a "virada de mês" com data do seu salário. O Mapa está pronto.
