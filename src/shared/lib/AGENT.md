# AGENT.md - src/shared/lib/

Este diretório contém as bibliotecas centrais e utilitários compartilhados do projeto Finances Sheet.

## Propósito e Intenção

Cada arquivo neste diretório serve como configuração global ou utilitário de baixo nível que todas as features dependem.

### db.ts
- **Propósito**: Inicialização do cliente Prisma com adapter PostgreSQL
- **Intenção**: Ser o punto único de acesso ao banco de dados
- **Dependências**: `dotenv/config`, `@prisma/adapter-pg`, `@prisma/client`
- **Por quê foi escolhido**: Prisma com PostgreSQL oferece tipagem forte e migrations versionadas

### utils.ts
- **Propósito**: Funções utilitárias de UI e formatação
- **Intenção**: Fornecer `cn()` (className merge) e `formatCurrency()` (formatação BRL)
- **Dependências**: `clsx`, `tailwind-merge`
- **Por quê foi escolhido**: clsx + tailwind-merge é o padrão shadcn/ui para merging de classes

### auth.ts
- **Propósito**: Configuração do Better-Auth no servidor
- **Intenção**: Autenticação via email/senha com campos customizados (displayName, cpf)
- **Dependências**: `better-auth`, `better-auth/adapters/prisma`, `./db`
- **Por quê foi escolhido**: Better-Auth é a solução mais completa para auth em Next.js

### auth-client.ts
- **Propósito**: Cliente de autenticação para componentes cliente
- **Intenção**: Expor signIn, signUp, useSession, signOut
- **Dependências**: `better-auth/react`
- **Por quê foi escolhido**: Integração oficial do Better-Auth com React hooks

### auth-server.ts
- **Propósito**: Helper de sessão para Server Actions
- **Intenção**: Validar sessão em chamadas server-side
- **Dependências**: `better-auth`, `./auth`
- **Por quê foi escolhido**: Padrão Better-Auth para getSession()

### finance-utils.ts
- **Propósito**: Cálculo de mês de referência financeira
- **Intenção**: Determinar qual "mês financeiro" estou baseado no dia do salário (padrão 25)
- **Dependências**: Nenhuma dependência externa
- **Por quê foi escolhido**: Lógica de negócio específica do projeto para fechamento de mês dinâmico

### parsers/
Ver `src/shared/lib/parsers/AGENT.md` para documentação específica dos parsers de extrato.