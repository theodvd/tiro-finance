import * as pdfjsLib from 'pdfjs-dist';

// Dynamically match worker URL to the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface TRTransaction {
  date: string;
  type: 'Achat' | 'Vente' | 'DCA';
  isin: string;
  name: string;
  quantity: number;
  amountEur: number;
  unitPrice: number;
  account: 'PEA' | 'CTO';
}

const FRENCH_MONTHS: Record<string, string> = {
  'janv.': '01', 'févr.': '02', 'mars': '03', 'avr.': '04',
  'mai': '05', 'juin': '06', 'juil.': '07', 'août': '08',
  'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12',
  'janv': '01', 'févr': '02', 'avr': '04',
  'juil': '07', 'sept': '09', 'oct': '10', 'nov': '11', 'déc': '12',
};

function parseFrenchDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\s+(janv\.?|févr\.?|mars|avr\.?|mai|juin|juil\.?|août|sept\.?|oct\.?|nov\.?|déc\.?)\s+(\d{4})/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const monthKey = m[2].replace(/\.$/, '');
  const month = FRENCH_MONTHS[monthKey] || FRENCH_MONTHS[m[2]];
  if (!month) return null;
  return `${m[3]}-${month}-${day}`;
}

export async function parseTradeRepublicPDF(file: File): Promise<TRTransaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const transactions: TRTransaction[] = [];
  let currentAccount: 'PEA' | 'CTO' = 'CTO';

  console.log('[TR Parser] PDF loaded, pages:', pdf.numPages);

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Concatenate all text items with spaces
    const fullText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ');

    console.log(`[TR Parser] Page ${pageNum} text (first 500 chars):`, fullText.substring(0, 500));

    // Detect account type from page header
    if (/Compte PEA/i.test(fullText)) {
      currentAccount = 'PEA';
      console.log(`[TR Parser] Page ${pageNum}: detected PEA account`);
    } else if (/Compte courant/i.test(fullText) || /IBAN/i.test(fullText)) {
      currentAccount = 'CTO';
      console.log(`[TR Parser] Page ${pageNum}: detected CTO account`);
    }

    // Find all order executions using a global regex on the full page text
    const orderRegex = /(Buy trade|Sell trade|Savings plan execution)\s+([A-Z0-9]{12})\s+(.+?),?\s*quantity:\s*([\d.,]+)/gi;

    let match;
    while ((match = orderRegex.exec(fullText)) !== null) {
      const tradeType = match[1].toLowerCase();
      const isin = match[2];
      const rawName = match[3].trim().replace(/,\s*$/, '');
      const quantity = parseFloat(match[4].replace(',', '.'));

      let type: TRTransaction['type'];
      if (tradeType.includes('savings plan')) {
        type = 'DCA';
      } else if (tradeType.includes('sell')) {
        type = 'Vente';
      } else {
        type = 'Achat';
      }

      // Find the nearest date before this match
      const textBefore = fullText.substring(0, match.index);
      const dateMatches = [...textBefore.matchAll(/(\d{1,2})\s+(janv\.?|févr\.?|mars|avr\.?|mai|juin|juil\.?|août|sept\.?|oct\.?|nov\.?|déc\.?)\s+(\d{4})/gi)];
      let date = '1970-01-01';
      if (dateMatches.length > 0) {
        const lastDate = dateMatches[dateMatches.length - 1];
        const parsed = parseFrenchDate(lastDate[0]);
        if (parsed) date = parsed;
      }

      // Find EUR amount after the order match
      // Use a tighter regex: 1-6 digits, optional thousands separator, comma/dot, 2 decimals, then €
      const textAfterOrder = fullText.substring(match.index + match[0].length, match.index + match[0].length + 150);
      const amountMatches = [...textAfterOrder.matchAll(/(\d{1,3}(?:[\s.]\d{3})*[,]\d{2})\s*€/g)];
      let amountEur = 0;
      if (amountMatches.length > 0) {
        amountEur = parseFloat(amountMatches[0][1].replace(/[\s.]/g, '').replace(',', '.')) || 0;
      }

      const unitPrice = quantity > 0 ? Math.round((amountEur / quantity) * 100) / 100 : 0;

      const tx: TRTransaction = {
        date,
        type,
        isin,
        name: rawName,
        quantity,
        amountEur,
        unitPrice,
        account: currentAccount,
      };

      console.log('[TR Parser] Found:', tx);
      transactions.push(tx);
    }
  }

  if (transactions.length === 0) {
    throw new Error("Aucune transaction trouvée dans ce PDF. Vérifiez que c'est bien un relevé de compte Trade Republic.");
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`[TR Parser] Total: ${transactions.length} transactions`);
  return transactions;
}
