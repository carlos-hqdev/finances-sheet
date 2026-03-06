# Roadmap de Produto - Finanças

## v1.0.0 (MVP)
- [x] CRUD e base de Contas Correntes.
- [x] CRUD e regras de negócio de Caixinhas/Investimentos (Regra PEPS, Lotes).
- [ ] Módulo de Cartão de Crédito (Criar limite, faturas e lançamentos).
- [ ] Revisão geral e validação total dos fluxos de Transações e Contas.
- [ ] Dashboard Dinâmico: Substituir os dados estáticos/desenhados por dados reais puxados do banco de dados (Prisma).

## v1.1.0
- [ ] Página de Configurações Globais: Interface para o usuário parametrizar variáveis econômicas (ex: valor atual do CDI, Selic) para uso dinâmico no cálculo de rendimentos das caixinhas.
- [ ] Visão Detalhada e Separação de Renda Fixa (IPCA/Selic/CDI).
- [ ] Módulo de Metas Financeiras (Atreladas a Caixinhas ou soltas).
- [ ] Categorização automática de lançamentos e análise de despesas por categoria.

## v2.0.0
- [ ] Importação de extratos via arquivos OFX (Extratos Bancários).
- [ ] Geração de Relatório Anual consolidado para Imposto de Renda.
- [ ] (Opcional) Integração Bank Sync / Open Finance para leitura automática de saldos.
