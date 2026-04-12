
import fs from 'fs';
import ofxParser from 'node-ofx-parser';

function parseOFX(rawContent, userDocument) {
    const data = ofxParser.parse(rawContent);
    const bankMsgRs = data.OFX.BANKMSGSRSV1;
    let stmtTrnRs = bankMsgRs.STMTTRNRS;
    const rsArray = Array.isArray(stmtTrnRs) ? stmtTrnRs : [stmtTrnRs];
    const parsedTransactions = [];

    rsArray.forEach((rs) => {
      const stmtRs = rs.STMTRS;
      const stmts = stmtRs.BANKTRANLIST.STMTTRN;
      const transactions = Array.isArray(stmts) ? stmts : [stmts];

      transactions.forEach((trn) => {
        const amount = parseFloat(trn.TRNAMT);
        let description = typeof trn.MEMO === 'string' ? trn.MEMO : (trn.NAME || "");
        
        // NOVO LOGICA FALLBACK
        if (!description || description.trim() === "" || description === "Lançamento") {
          const typeLabel = amount < 0 ? "Débito" : "Crédito";
          const id = trn.FITID || trn.REFNUM || "";
          const suffix = id ? ` (ID: ${id.toString().slice(-5)})` : "";
          description = `Lançamento de ${typeLabel}${suffix}`;
        }

        // NOVO LOGICA IGNORE (tarifa conta não é mais ignorada no global mas testamos aqui)
        const IGNORE_KEYWORDS = [
          'lançamento de', 'saldo do dia', 'saldo anterior', 'entradas:', 'saídas:', 'total de entradas', 'total de saídas', 'demonstrativo',
        ];
        const isIgnored = IGNORE_KEYWORDS.some(keyword => description.toLowerCase().includes(keyword));
        if (isIgnored) return;

        parsedTransactions.push({
          date: trn.DTPOSTED,
          amount,
          description,
        });
      });
    });
    return parsedTransactions;
}

const ofxPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/C6 Bank/2023 - C6.ofx';
const content = fs.readFileSync(ofxPath, 'utf-8');
const txs = parseOFX(content);

console.log(`Total: ${txs.length}`);
txs.filter(t => t.description.includes('ID:') || t.description.toLowerCase().includes('tarifa')).forEach(t => {
    console.log(`${t.date} | ${t.amount} | ${t.description}`);
});
