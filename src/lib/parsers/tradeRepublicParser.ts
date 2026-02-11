import * as pdfjsLib from 'pdfjs-dist';

// Hardcode worker URL matching the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

// English format (individual order confirmations)
const ORDER_REGEX_EN = /(Buy trade|Sell trade|Savings plan execution)\s+([A-Z0-9]{12})\s+(.+?),\s*quantity:\s*([\d.]+)/i;

// French format — "Exécution d'ordre" line followed by details on adjacent lines
const EXEC_ORDRE_REGEX = /Exécution d'ordre/i;
const ISIN_REGEX = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/;
const QUANTITY_REGEX = /quantity:\s*([\d.,]+)/i;

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

function extractAmounts(text: string): number[] {
  const regex = /[\d.,]+\s*€/g;
  const matches = text.match(regex) || [];
  return matches.map((m) => parseAmount(m)).filter((v) => v > 0);
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

/**
 * Parse English-format order confirmations (Buy trade / Sell trade / Savings plan execution)
 */
function tryParseEnglishFormat(
  lines: TextLine[],
  currentDate: string | null
): { transactions: TRTransaction[]; lastDate: string | null } {
  const transactions: TRTransaction[] = [];
  let date = currentDate;

  for (const line of lines) {
    const fullText = line.items.map((i) => i.text).join(' ').trim();

    const dateCandidate = parseFrenchDate(fullText);
    if (dateCandidate) {
      date = dateCandidate;
      continue;
    }

    const orderMatch = fullText.match(ORDER_REGEX_EN);
    if (!orderMatch) continue;

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

    const amountCandidates = line.items
      .map((i) => i.text.trim())
      .filter((t) => /\d/.test(t) && (t.includes('€') || t.includes(',')))
      .map((t) => parseAmount(t))
      .filter((v) => v > 0);

    const amountEur = amountCandidates.length > 0 ? amountCandidates[amountCandidates.length - 1] : 0;
    const unitPrice = quantity > 0 ? Math.round((amountEur / quantity) * 100) / 100 : 0;

    transactions.push({
      date: date || '1970-01-01',
      type,
      isin,
      name,
      quantity,
      amountEur,
      unitPrice,
    });
  }

  return { transactions, lastDate: date };
}

/**
 * Parse French "Relevé de compte" format.
 * In this format, "Exécution d'ordre" appears on one line with amounts,
 * and the security name/ISIN/quantity appear on surrounding lines.
 * We collect all page text and use a sliding window approach.
 */
function tryParseFrenchRelevé(
  allLines: { pageNum: number; text: string; amounts: number[] }[]
): TRTransaction[] {
  const transactions: TRTransaction[] = [];
  let currentDate: string | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // Track dates
    const dateCandidate = parseFrenchDate(line.text);
    if (dateCandidate) {
      currentDate = dateCandidate;
      continue;
    }

    // Look for "Exécution d'ordre"
    if (!EXEC_ORDRE_REGEX.test(line.text)) continue;

    // Extract amount from this line
    const amounts = extractAmounts(line.text);
    const amountEur = amounts.length > 0 ? amounts[0] : 0;

    // Search surrounding lines (window of ±3) for ISIN, name, quantity
    let isin = '';
    let name = '';
    let quantity = 0;

    const windowStart = Math.max(0, i - 3);
    const windowEnd = Math.min(allLines.length - 1, i + 3);

    for (let j = windowStart; j <= windowEnd; j++) {
      const nearby = allLines[j].text;

      // Look for ISIN
      if (!isin) {
        const isinMatch = nearby.match(ISIN_REGEX);
        if (isinMatch) isin = isinMatch[1];
      }

      // Look for quantity
      if (!quantity) {
        const qtyMatch = nearby.match(QUANTITY_REGEX);
        if (qtyMatch) quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 0;
      }

      // Look for security name — lines containing ETF/fund names
      if (!name && j !== i) {
        // Name lines typically contain fund identifiers
        const nameCandidates = nearby.match(/(?:UCITS|ETF|Fund|Acc|Dist|MSCI|S&P|EURO|World|Amundi|iShares|Xtrackers|Lyxor|Vanguard|BNP|STOXX)[\w\s().,&'-]*/i);
        if (nameCandidates) {
          name = nearby.trim();
        }
      }
    }

    // If no quantity found, try to extract from "d'ordre ... quantity: X" pattern in combined text
    if (!quantity) {
      const combinedWindow = allLines.slice(windowStart, windowEnd + 1).map(l => l.text).join(' ');
      const qtyMatch = combinedWindow.match(QUANTITY_REGEX);
      if (qtyMatch) quantity = parseFloat(qtyMatch[1].replace(',', '.')) || 0;
    }

    // If we found at least an amount, create the transaction
    if (amountEur > 0) {
      const unitPrice = quantity > 0 ? Math.round((amountEur / quantity) * 100) / 100 : 0;

      const tx: TRTransaction = {
        date: currentDate || '1970-01-01',
        type: 'Achat', // Relevé de compte "Exécution d'ordre" = purchase by default
        isin: isin || 'UNKNOWN',
        name: name || (isin ? `Security ${isin}` : 'Titre inconnu'),
        quantity,
        amountEur,
        unitPrice,
      };

      console.log('[TR Parser] Found FR transaction:', tx);
      transactions.push(tx);
    }
  }

  return transactions;
}

export async function parseTradeRepublicPDF(file: File): Promise<TRTransaction[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  console.log('[TR Parser] PDF loaded, pages:', pdf.numPages);

  // Collect all lines from all pages
  const allLineTexts: { pageNum: number; text: string; amounts: number[] }[] = [];
  const allTextLines: { pageNum: number; lines: TextLine[] }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = groupIntoLines(content.items as { str: string; transform: number[] }[]);

    console.log(`[TR Parser] Page ${pageNum}: ${lines.length} lines`);
    allTextLines.push({ pageNum, lines });

    for (const line of lines) {
      const fullText = line.items.map((i) => i.text).join(' ').trim();
      if (fullText) {
        allLineTexts.push({
          pageNum,
          text: fullText,
          amounts: extractAmounts(fullText),
        });
        // Log all lines for debugging
        if (fullText.includes('ordre') || fullText.match(ISIN_REGEX) || fullText.match(QUANTITY_REGEX)) {
          console.log(`[TR Parser] P${pageNum} relevant:`, fullText.substring(0, 150));
        }
      }
    }
  }

  // Strategy 1: Try English format first (individual order confirmations)
  let transactions: TRTransaction[] = [];
  let lastDate: string | null = null;
  for (const { lines } of allTextLines) {
    const result = tryParseEnglishFormat(lines, lastDate);
    transactions.push(...result.transactions);
    lastDate = result.lastDate;
  }

  if (transactions.length > 0) {
    console.log(`[TR Parser] English format: ${transactions.length} transactions found`);
    transactions.sort((a, b) => a.date.localeCompare(b.date));
    return transactions;
  }

  // Strategy 2: Try French "Relevé de compte" format
  console.log('[TR Parser] No English format matches, trying French relevé format...');
  transactions = tryParseFrenchRelevé(allLineTexts);

  if (transactions.length > 0) {
    console.log(`[TR Parser] French format: ${transactions.length} transactions found`);
    transactions.sort((a, b) => a.date.localeCompare(b.date));
    return transactions;
  }

  throw new Error('Aucune transaction trouvée dans ce PDF. Vérifiez que c\'est bien un relevé Trade Republic.');
}
