import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface TRTransaction {
  date: string;        // YYYY-MM-DD
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

const DATE_REGEX = /^(\d{1,2})\s+(janv\.|févr\.|mars|avr\.|mai|juin|juil\.|août|sept\.|oct\.|nov\.|déc\.)\s+(\d{4})$/;

const ORDER_REGEX = /(Buy trade|Sell trade|Savings plan execution)\s+([A-Z0-9]{12})\s+(.+?),\s*quantity:\s*([\d.]+)/i;

const IGNORED_TYPES = ['Virement', 'Intérêts', 'Parrainage', 'Cadeau', 'Contribution'];

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
  // Sort lines top to bottom (higher Y = higher on page in PDF coords → we want top-first so descending Y)
  lines.sort((a, b) => b.y - a.y);
  // Sort items within each line left to right
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

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = groupIntoLines(content.items as { str: string; transform: number[] }[]);

    for (const line of lines) {
      const fullText = line.items.map((i) => i.text).join(' ').trim();

      // Try to detect a date line
      const dateCandidate = parseFrenchDate(fullText);
      if (dateCandidate) {
        currentDate = dateCandidate;
        continue;
      }

      // Skip ignored transaction types
      if (IGNORED_TYPES.some((t) => fullText.includes(t))) continue;

      // Check for order execution
      if (!fullText.includes("Exécution d'ordre") && !fullText.includes("Exécution d'ordre")) continue;

      // Try to find the order details — could be on this line or we need to look at the description
      // The description with Buy/Sell/Savings plan may be on the same line or the next
      const orderMatch = fullText.match(ORDER_REGEX);
      if (!orderMatch) continue;

      const tradeType = orderMatch[1].toLowerCase();
      const isin = orderMatch[2];
      const name = orderMatch[3].trim();
      const quantity = parseFloat(orderMatch[4]);

      // Determine transaction type
      let type: TRTransaction['type'];
      if (tradeType.includes('savings plan')) {
        type = 'DCA';
      } else if (tradeType.includes('sell')) {
        type = 'Vente';
      } else {
        type = 'Achat';
      }

      // Extract amount — look for EUR amounts in the line items
      // Amounts are typically in the rightmost columns
      const amountCandidates = line.items
        .map((i) => i.text.trim())
        .filter((t) => /\d/.test(t) && (t.includes('€') || t.includes(',')))
        .map((t) => parseAmount(t))
        .filter((v) => v > 0);

      // Take the last non-zero amount (typically the transaction amount)
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

      console.log('[TR Parser]', tx);
      transactions.push(tx);
    }
  }

  if (transactions.length === 0) {
    throw new Error("Aucune transaction trouvée dans ce PDF");
  }

  // Sort by date ascending
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions;
}
