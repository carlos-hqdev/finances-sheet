# 🤖 AGENT_PARSERS.md

Este documento serve como **memória e arquitetura de referência** para futuras IAs e agentes (ou desenvolvedores) que precisarem manter, expandir ou corrigir a funcionalidade de Importação de Extratos Bancários do projeto Finances Sheet.

## 🎯 Propósito
O módulo de Parsers (`src/shared/lib/parsers/`) foi desenhado para contornar um problema universal: a falta de padronização nas exportações de bancos brasileiros (Nubank, Bradesco, C6, PicPay, Mercado Pago, Inter, etc.).
O objetivo principal é extrair um array padronizado de objetos `ParsedTransaction` a partir de arquivos `.csv`, `.ofx` e principalmente `.pdf`, abstraindo a desordem estrutural de cada banco.

## 🏗️ Arquitetura dos Parsers

A conversão segue 3 níveis (Dispatching -> Parsing Específico -> Normalização):

### 1. Descoberta de Banco e Formato (O Dispatcher)
- **OFX (`ofx-parser.ts`)**: Biblioteca `node-ofx-parser`. Padrão robusto e universal baseado na TAG `<STMTTRN>`.
- **CSV (`csv-parser.ts`)**: Uso do `papaparse`. Detecta o banco lendo as primeiras 5 linhas. (ex: Começa com "EXTRATO DE: AG:" `=>` Bradesco). Se falhar a detecção explícita, recai no modelo genérico (procura colunas "Data", "Valor", "Descrição").
- **PDF (`pdf-parser.ts`)**: Uso do `pdfjs-dist/legacy/build/pdf.mjs`. Transforma todo o PDF em dezenas de instâncias com `x, y` e `texto`. 
  - Concatena tudo num `fullText.toUpperCase()` para buscar padrões de banco (ex: "NU PAGAMENTOS", "C6 BANK").
  - Agrupa os items textuais pelo Eixo Y usando a **tolerância de 8 pixels** em `groupItemsIntoLines` (MUITO importante não diminuir isso para evitar que navegadores separem fatias de datas).

### 2. Dicionário de Regex e Identificação
Cada parser individual tem seu escopo:
- **`parseNubankPdfItems`**: Nubank separa data ("05 MAI 2025") de "Total de saídas" em blocos que criam uma data pendente (`pendingDate`). Os valores são parseados abaixo dele na estrutura. Possui uma string `skipKw` robusta para driblar mensagens de sac dos prints em PDFs novos.
- **`parseBradescoPdfItems`**: Bradesco mistura dados em colunas. Exige `doctos`, tem data opcional, detecta sinais multiplicando `-1` se o descritor contiver nomes negativos.

### 3. Normalização de Dados (`import-utils.ts`)
Antes da emissão do objeto `ParsedTransaction`:
- **`detectPaymentMethod`**: Varre a string de descrição com `toUpperCase()` para identificar palavras-chave universais (`PIX, SAQUE, DEBITO, BOLETO`).
- **`isInternalTransfer(description, userDocument)`**: Descobre se a transferência (PIX, TED) ocorreu para o mesmo CPF/Nome de quem é dono da conta atual.
- **`shouldIgnoreTransaction`**: Bloqueia totais ("Saldo do dia", "Entradas:", "Saídas:") para não inflacionar o registro com as próprias métricas bancárias.

## 🚨 Dicas e Armadilhas Conhecidas (Edge Cases)

1. **Timeout e Web Workers no PDF.js**: No `pdf-parser.ts`, dependemos de um worker do `unpkg` (cdn). Ocorre frequentemente em navegadores corporativos com extensões restritivas (AdBlock, etc) o bloqueio silencioso da Promise no CDN. O projeto possui um `Promise.race` de 15 segundos para alertar timeouts. **NUNCA tire ou altere o worker CDN em Client-Side components sem injetar um Local Worker empacotado pelo Next.js**.
2. **"Lançamento sem descrição base"**: Bancos em transações Pix falhas e extratos de OFX costumam exportar strings estéreis (`"Lançamento"` ou campo vario). Nunca recuse a importação caso isso ocorra: o código o transforma em `[A Verificar] Lançamento sem descrição base` e preenche o form de validação visual.
3. **Caracteres Invisíveis (Ghost spaces)**: Sempre aplique `.replace(/\s+/g, ' ').trim()` nos strings que retornam do Extrator do PDFjs no Front-End para mitigar que os espaços não-quebráveis de Canvas do navegador (DOM) não quebrem as filtragens estritas. 

---
_Gerado para manutenção autônoma do Finances Sheet._
