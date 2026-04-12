import fs from 'fs';
import path from 'path';

// Precisamos importar via tsx dinâmico ou importar as funções construídas.
// O mais prático seria invocar uma função node-tsx
import { parsePdfFile } from '../src/shared/lib/parsers/pdf-parser.ts';
import { parseCSV } from '../src/shared/lib/parsers/csv-parser.ts';
import { parseOFX } from '../src/shared/lib/parsers/ofx-parser.ts';

// Configurando PDF.js worker
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '';

async function parseFileSafely(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  
  try {
    if (ext === '.pdf') {
      let pwd = undefined;
      if (filePath.includes('C6 Bank')) pwd = "170420";
      const txs = await parsePdfFile(buffer.buffer, undefined, pwd);
      return txs.length;
    } 
    if (ext === '.csv') {
      const text = buffer.toString('utf-8');
      const txs = await parseCSV(text);
      return txs.length;
    }
    if (ext === '.ofx') {
      const text = buffer.toString('utf-8');
      const txs = parseOFX(text);
      return txs.length;
    }
  } catch(e) {
    return `ERROR: ${e.message}`;
  }
  return 0;
}

function findFilesRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFilesRecursive(fullPath));
    } else {
      if (!file.includes('Zone.Identifier')) {
         results.push(fullPath);
      }
    }
  }
  return results;
}

async function run() {
  const allFiles = findFilesRecursive('extratos_exemplos');
  
  // Agrupar: Bank -> YearMonth -> Extension -> Count
  const groups = {};
  
  for (const f of allFiles) {
    const bank = path.basename(path.dirname(f));
    const filename = path.basename(f);
    
    // Tenta achar YYYYMM ou MM-YY (PicPay usa 01-23)
    let ymMatch = filename.match(/^(\d{4})(\d{2})/); // ex: 202405
    let cycle = "UNKNOWN";
    if (ymMatch) {
      cycle = `${ymMatch[1]}-${ymMatch[2]}`;
    } else {
       // Tenta achar MM-YY (PicPay 01-23 / 01-24)
       const shortYm = filename.match(/(\d{2})-(\d{2})/);
       if (shortYm) cycle = `20${shortYm[2]}-${shortYm[1]}`;
       else cycle = filename.substring(0, 10); // fallback cru
    }

    const ext = path.extname(filename).toLowerCase();
    
    if(!groups[bank]) groups[bank] = {};
    if(!groups[bank][cycle]) groups[bank][cycle] = {};
    
    const count = await parseFileSafely(f);
    groups[bank][cycle][ext] = count;
  }

  // Print results
  console.log("=== VISTORIA DE PARIDADE CRUZADA ===");
  for (const bank in groups) {
    console.log(`\n🏦 ${bank}`);
    let mismatches = 0;

    for (const cycle in groups[bank]) {
      const exts = groups[bank][cycle];
      // Se tem mais de 1 formato para o mesmo mes, checar se sao iguais
      const counts = Object.values(exts).filter(v => typeof v === 'number');
      let msg = `${cycle}: `;
      for (const e in exts) {
        msg += `[${e.toUpperCase()}: ${exts[e]}] `;
      }
      
      const allEqual = counts.every(val => val === counts[0]);
      if (counts.length > 1 && !allEqual) {
         msg += " ❌ DISCREPANCIA!";
         mismatches++;
      } else if (counts.length > 1) {
         msg += " ✅ PAREADO";
      }

      console.log(`  |- ${msg}`);
    }
  }
}

run().catch(console.error);
