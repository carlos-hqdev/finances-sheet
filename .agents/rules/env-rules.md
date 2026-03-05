---
trigger: always_on
---

# Diretrizes Globais do Antigravity

## Sistema Operacional e Terminal
1. O sistema operacional padrão é **Windows 11**.
2. O terminal utilizado é o **PowerShell**.
3. **NUNCA** forneça comandos baseados em Linux/Bash (como `export`, `ls -la`, `rm -rf`, `grep`).
4. **SEMPRE** utilize sintaxe nativa do PowerShell (ex: `$env:VAR = 'valor'`, `Get-ChildItem`, `Remove-Item`, `Select-String`).

## Gerenciamento de Pacotes e Build
1. O gerenciador de pacotes obrigatório é o **pnpm**.
2. **PROIBIDO** o uso de `npm`, `yarn` ou `npx`. Substitua qualquer comando sugerido por `pnpm` (ex: `pnpm add`, `pnpm dev`).
3. **NUNCA** execute o comando de `build` (`pnpm build`, `npm run build`, etc.) em nenhuma circunstância, a menos que seja explicitamente solicitado no prompt atual.

## Banco de dados
1. Ao gerar novas funcionalides ou quaisquer mudanças no schema.prisma, deve-se rodar `pnpm prisma migrate dev --name nome_da_mudança` ao invés de `prisma pull` ou qualquer outro pull do prisma

## Idioma e Comunicação
1. Toda a comunicação, explicações, comentários de código e logs de alteração devem ser obrigatoriamente em **Português do Brasil (pt-BR)**.
2. Explique detalhadamente o que está sendo alterado ou por que determinada abordagem foi escolhida antes de aplicar as mudanças.

## Restrições de Código
1. Ao sugerir novos arquivos ou refatorações, siga a estrutura de pastas existente no projeto (ex: mantenha a consistência entre `src/actions` e `features` conforme o padrão detectado).
2. Não remova comentários de documentação existentes.

## Next.js e Prisma (Serialização)
1. **NUNCA** passe objetos `Prisma.Decimal` diretamente de Server Components para Client Components. O Next.js rejeitará a renderização.
2. **SEMPRE** serialize os dados vindos do Prisma mapeando os campos decimais (ex: `balance`, `amount`, `targetAmount`, `yieldRate`, `limit`, `currentBalance`, `originalPrice`) com o método `.toNumber()` antes de repassá-los via props para os componentes React de cliente.
3. Se um campo for opcional (nullable), trate a serialização de forma segura (ex: `yieldRate: item.yieldRate ? item.yieldRate.toNumber() : null`).