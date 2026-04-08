import ofxParser from 'node-ofx-parser';
import { ParsedTransaction } from '@/features/transactions/types';

/**
 * Função para checar uma transação e determinar se parece uma transferência interna
 * baseada no CPF ou nome do usuário.
 */
function isInternalTransfer(description: string, userDocumentOrName?: string): boolean {
  if (!userDocumentOrName || userDocumentOrName.trim() === '') return false;
  
  const normalizedDesc = description.toLowerCase().replace(/[\.\-\/\s]/g, '');
  const normalizedDoc = userDocumentOrName.toLowerCase().replace(/[\.\-\/\s]/g, '');
  
  // Se encontrou o CPF/Nome na descricao, ou keywords como PIX com proprio cpf
  return normalizedDesc.includes(normalizedDoc);
}

export function parseOFX(rawContent: string, userDocument?: string): ParsedTransaction[] {
  try {
    const data = ofxParser.parse(rawContent);

    // Depending on the bank OFX version, the path to transactions can vary slightly
    // Usually it's OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN
    // or OFX.CREDITCARDMSGSRSV1... for CC
    const bankMsgRs = data.OFX.BANKMSGSRSV1;
    const ccMsgRs = data.OFX.CREDITCARDMSGSRSV1;
    
    let stmtTrnRs: any = null;
    let isCC = false;

    if (bankMsgRs && bankMsgRs.STMTTRNRS) {
       stmtTrnRs = bankMsgRs.STMTTRNRS;
    } else if (ccMsgRs && ccMsgRs.CCSTMTTRNRS) {
       stmtTrnRs = ccMsgRs.CCSTMTTRNRS;
       isCC = true;
    }

    if (!stmtTrnRs) {
      throw new Error("Formato OFX não reconhecido ou inexistente.");
    }

    // Fix for arrays vs object when only one transaction is present
    const rsArray = Array.isArray(stmtTrnRs) ? stmtTrnRs : [stmtTrnRs];
    
    const parsedTransactions: ParsedTransaction[] = [];

    rsArray.forEach((rs: any) => {
      const stmtRs = isCC ? rs.CCSTMTRS : rs.STMTRS;
      if (!stmtRs || !stmtRs.BANKTRANLIST || !stmtRs.BANKTRANLIST.STMTTRN) return;
      
      const stmts = stmtRs.BANKTRANLIST.STMTTRN;
      const transactions = Array.isArray(stmts) ? stmts : [stmts];

      transactions.forEach((trn: any) => {
        // Date parsing: Format YYYYMMDDHHMMSS
        // E.g. "20230510100000"
        let rawDate = typeof trn.DTPOSTED === 'string' ? trn.DTPOSTED : '';
        if (rawDate.includes('[')) rawDate = rawDate.split('[')[0]; // discard timezone info for parsing simplicity
        
        const year = parseInt(rawDate.substring(0, 4), 10);
        const month = parseInt(rawDate.substring(4, 6), 10) - 1;
        const day = parseInt(rawDate.substring(6, 8), 10);
        
        // Se houver hora (opcional dependendo do banco)
        let hours = 0, minutes = 0, seconds = 0;
        if (rawDate.length >= 14) {
          hours = parseInt(rawDate.substring(8, 10), 10);
          minutes = parseInt(rawDate.substring(10, 12), 10);
          seconds = parseInt(rawDate.substring(12, 14), 10);
        }

        const date = new Date(year, month, day, hours, minutes, seconds);
        const amount = parseFloat(trn.TRNAMT);
        const description = typeof trn.MEMO === 'string' ? trn.MEMO : (trn.NAME || "Lançamento");
        
        // Determine Internal Transfer
        const internal = isInternalTransfer(description, userDocument);

        parsedTransactions.push({
          id: Math.random().toString(36).substr(2, 9), // temp id
          date,
          amount,
          description,
          type: internal ? "TRANSFER" : (amount < 0 ? "EXPENSE" : "INCOME"),
          isInternalTransfer: internal
        });
      });
    });

    return parsedTransactions;
  } catch (err: any) {
    console.error("OFX Parse Error: ", err);
    throw new Error("Erro ao processar o arquivo OFX.");
  }
}
