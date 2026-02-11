import * as pdfjsLib from 'pdfjs-dist';

// pdfjs-dist v4 worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

export interface TRTransaction {
  date: string;
  type: 'Achat' | 'Vente' | 'DCA';
  isin: string;
  name: string;
  quantity: number;
  amountEur: number;
  unitPrice: number;
}

const FRENCH_MONTHS: Record<string, string> = {
  'janv.': '01', 'févr.': '02', 'mars': '03', 'avr.': '04',
  'mai': '05', 'juin': '06', 'juil.': '07', 'août': '08',
  'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12',
};

const DATE_REGEX = /(\d{1,2})\s+(janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.)\s+(\d{4})/;
const ORDER_REGEX = /(Buy trade|Sell trade|Savings plan execution)\s+([A-Z0-9]{12})\s+(.+?),\s*quantity:\s*([\d.]+)/i;

function parseFrenchDate(raw: string): string | null {
  const m = raw.trim().match(DATE_REGEX);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = FRENCH_MONTHS[m[2]];
  const year = m[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d,.\-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

interface TextLine {
  y: number;
  items: { x: number; text: string }[];
}

function groupIntoLines(items: { str: string; transform: number[] }[]): TextLine[] {
  const lines: TextLine[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    let line = lines.find((l) => Math.abs(l.y - y) <= 2);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push({ x, text: item.str });
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }
  return lines;
}

export async function parseTradeRepublicPDF(file: File): Promise<TRTransaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const transactions: TRTransaction[] = [];
  let currentDate: string | null = null;

  console.log('[TR Parser] PDF loaded, pages:', pdf.numPages);

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = groupIntoLines(content.items as { str: string; transform: number[] }[]);

    console.log(`[TR Parser] Page ${pageNum}: ${lines.length} lines`);

    for (const line of lines) {
      const fullText = line.items.map((i) => i.text).join(' ').trim();

      // Try to detect a date
      const dateCandidate = parseFrenchDate(fullText);
      if (dateCandidate) {
        currentDate = dateCandidate;
        continue;
      }

      // Skip non-order lines
      if (!fullText.includes("Exécution d'ordre") && !fullText.includes('ordre')) continue;

      // Try to find order details on this line
      const orderMatch = fullText.match(ORDER_REGEX);
      if (!orderMatch) {
        console.log('[TR Parser] Order line but no match:', fullText.substring(0, 120));
        continue;
      }

      const tradeType = orderMatch[1].toLowerCase();
      const isin = orderMatch[2];
      const name = orderMatch[3].trim();
      const quantity = parseFloat(orderMatch[4]);

      let type: TRTransaction['type'];
      if (tradeType.includes('savings plan')) {
        type = 'DCA';
      } else if (tradeType.includes('sell')) {
        type = 'Vente';
      } else {
        type = 'Achat';
      }

      // Extract amount from rightmost numeric items
      const amountCandidates = line.items
        .map((i) => i.text.trim())
        .filter((t) => /\d/.test(t) && (t.includes('€') || t.includes(',')))
        .map((t) => parseAmount(t))
        .filter((v) => v > 0);

      const amountEur = amountCandidates.length > 0 ? amountCandidates[amountCandidates.length - 1] : 0;
      const unitPrice = quantity > 0 ? Math.round((amountEur / quantity) * 100) / 100 : 0;

      const tx: TRTransaction = {
        date: currentDate || '1970-01-01',
        type,
        isin,
        name,
        quantity,
        amountEur,
        unitPrice,
      };

      console.log('[TR Parser] Found transaction:', tx);
      transactions.push(tx);
    }
  }

  if (transactions.length === 0) {
    throw new Error('Aucune transaction trouvée dans ce PDF');
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return transactions;
}
