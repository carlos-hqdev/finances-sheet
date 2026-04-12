
import fs from 'fs';
import { parseOFX } from '../src/shared/lib/parsers/ofx-parser.ts';

const ofxPath = '/home/carlo/Projetos/Pessoal/finances-sheet/extratos_exemplos/C6 Bank/2023 - C6.ofx';
const content = fs.readFileSync(ofxPath, 'utf-8');

try {
  const transactions = parseOFX(content);
  console.log(`Total transactions parsed: ${transactions.length}`);
  
  // Mostrar transações que antes seriam "Lançamento" ou ignoradas
  const interestingOnes = transactions.filter(t => 
    t.description.includes('Lançamento de') || t.description.toLowerCase().includes('tarifa')
  );
  
  console.log('\nInteresting Transactions:');
  interestingOnes.forEach(t => {
    console.log(`Date: ${t.date.toISOString().split('T')[0]}, Amount: ${t.amount}, Desc: ${t.description}`);
  });
} catch (err) {
  console.error(err);
}
