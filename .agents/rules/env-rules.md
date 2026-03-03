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

## Idioma e Comunicação
1. Toda a comunicação, explicações, comentários de código e logs de alteração devem ser obrigatoriamente em **Português do Brasil (pt-BR)**.
2. Explique detalhadamente o que está sendo alterado ou por que determinada abordagem foi escolhida antes de aplicar as mudanças.

## Restrições de Código
1. Ao sugerir novos arquivos ou refatorações, siga a estrutura de pastas existente no projeto (ex: mantenha a consistência entre `src/actions` e `features` conforme o padrão detectado).
2. Não remova comentários de documentação existentes.