import type { TRTransaction } from '@/types/parsers';

// Re-export pour compatibilité avec les imports existants
export type { TRTransaction };

/**
 * Mini parser CSV qui supporte les guillemets et les virgules échappées.
 * Retourne une matrice [ligne][colonne].
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

export async function parseTradeRepublicCSV(file: File): Promise<TRTransaction[]> {
  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) {
    throw new Error("Fichier CSV vide ou invalide.");
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);

  const iDate = idx('date');
  const iAccountType = idx('account_type');
  const iCategory = idx('category');
  const iType = idx('type');
  const iName = idx('name');
  const iSymbol = idx('symbol');
  const iShares = idx('shares');
  const iPrice = idx('price');
  const iAmount = idx('amount');
  const iDescription = idx('description');

  if ([iDate, iAccountType, iCategory, iType, iSymbol, iShares, iAmount].some((i) => i < 0)) {
    throw new Error("Format CSV inattendu : colonnes Trade Republic manquantes.");
  }

  const transactions: TRTransaction[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const category = (row[iCategory] || '').trim().toUpperCase();
    const rawType = (row[iType] || '').trim().toUpperCase();

    if (category !== 'TRADING') continue;
    if (rawType !== 'BUY' && rawType !== 'SELL') continue;

    const isin = (row[iSymbol] || '').trim();
    if (!isin) continue;

    const description = (row[iDescription] || '').trim();
    const isDCA = /savings plan execution/i.test(description);

    let type: TRTransaction['type'];
    if (rawType === 'SELL') {
      type = 'Vente';
    } else if (isDCA) {
      type = 'DCA';
    } else {
      type = 'Achat';
    }

    const account: 'PEA' | 'CTO' = (row[iAccountType] || '').trim().toUpperCase() === 'PEA' ? 'PEA' : 'CTO';
    const quantity = parseFloat(row[iShares]) || 0;
    const amountEur = Math.abs(parseFloat(row[iAmount]) || 0);
    const priceParsed = parseFloat(row[iPrice]);
    const unitPrice = Number.isFinite(priceParsed) && priceParsed > 0
      ? priceParsed
      : (quantity > 0 ? Math.round((amountEur / quantity) * 100) / 100 : 0);

    transactions.push({
      date: (row[iDate] || '').trim(),
      type,
      isin,
      name: (row[iName] || '').trim(),
      quantity,
      amountEur,
      unitPrice,
      account,
    });
  }

  if (transactions.length === 0) {
    throw new Error("Aucune transaction de trading trouvée dans ce CSV. Vérifiez que c'est bien un export Trade Republic.");
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return transactions;
}
