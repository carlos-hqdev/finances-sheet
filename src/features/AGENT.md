# AGENT.md - src/features/

Este diretório contém os módulos de negócio auto-contidos do projeto Finances Sheet, seguindo o padrão Feature-Sliced Design.

## Propósito e Intenção

Cada feature é um módulo isolado que encapsula componentes, server actions, schemas e tipos relacionados a uma funcionalidade específica.

### Feature: accounts (Contas Bancárias)
- **Propósito**: Gerenciar contas correntes, investimentos e carteiras físicas
- **Intenção**: CRUD de contas com tipos (CHECKING, INVESTMENT, WALLET)
- **Dependências**: `@/shared/lib/db`, `zod`
- **Componentes**: AccountActions, AccountForm, AccountList
- **Por quê foi escolhido**: Separação clara entre controle de saldo e transações

### Feature: transactions (Transações Financeiras)
- **Propósito**: Registro e importação de receitas/despesas/transferências
- **Intenção**: CRUD completo + importação de extratos (CSV/OFX/PDF)
- **Dependências**: `@/shared/lib/db`, `@/shared/lib/parsers`
- **Componentes**: TransactionDialog, TransactionsTable, ImportTransactionsDialog
- **Por quê foi escolhido**: Центральна tabela do sistema financeiro

### Feature: categories (Categorias)
- **Propósito**: Categorização de transações com ícones e cores
- **Intenção**: CRUD de categorias personalizadas
- **Dependências**: `@/shared/lib/db`, `lucide-react` (ícones)
- **Componentes**: CategoryDialog, CategoryActions

### Feature: credit-cards (Cartões de Crédito)
- **Propósito**: Gerenciar cartões e limites
- **Intenção**: CRUD com fechamento/vencimento (closingDay/dueDay)
- **Dependências**: `@/shared/lib/db`, Feature accounts
- **Componentes**: CreditCardDialog, CreditCardActions

### Feature: dashboard (Painel Principal)
- **Propósito**: Visualização consolidated de finanças
- **Intenção**: Cards resumo, gráficos de fluxo de caixa e patrimônio
- **Dependências**: `recharts`, Feature transactions, Feature accounts
- **Componentes**: SummaryCard, CashFlowChart, PatrimonyChart, YearlyComparisonChart
- **Por quê foi escolhido**: Visualização principal do usuário

### Feature: investments (Investimentos)
- **Propósito**: Portfólio de investimentos (poupança, ações, FIIs, etc)
- **Intenção**: CRUD + cálculo de rendimentos (yield)
- **Dependências**: `@/shared/lib/db`, Feature accounts
- **Componentes**: InvestmentDialog, SavingsList, InvestmentLotTable

### Feature: auth (Autenticação)
- **Propósito**: Login e cadastro de usuários
- **Intenção**: Formulários com validação Zod
- **Dependências**: `@/shared/lib/auth-client`, `zod`
- **Componentes**: SignInForm, SignUpForm

### Feature: users (Usuários)
- **Propósito**: Gerenciamento de perfil
- **Intenção**: Atualização de dados do usuário logado
- **Dependências**: `@/shared/lib/db`, Feature auth
- **Por quê foi escolhido**: Dados adicionais (displayName, cpf)