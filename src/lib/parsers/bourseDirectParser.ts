import * as XLSX from 'xlsx';

export interface BDPosition {
  name: string;
  isin: string;
  currency: string;
  qtyBD: number;
  qtyApp: number;
  diffQty: number;
  pruBD: number;
  pruApp: number;
  diffPRU: number;
  valorisationBD: number;
  status: 'ok' | 'ecart' | 'manquant';
}

export interface AppHolding {
  isin: string;   // actually symbol (ticker) since DB has no ISIN column
  name: string;
  quantity: number;
  pru: number;
}

/**
 * Try to match a BD position to an app holding.
 * Since the DB stores tickers (e.g. "CW8.PA") not ISINs, we try:
 * 1. Exact ISIN match (future-proof if ISIN column is added)
 * 2. Name-based fuzzy match (normalize and compare)
 */
function findMatch(isin: string, bdName: string, appHoldings: AppHolding[]): AppHolding | undefined {
  // 1. Exact ISIN/symbol match
  const exact = appHoldings.find((h) => h.isin === isin);
  if (exact) return exact;

  // 2. Fuzzy name match — normalize both sides
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bdNorm = normalize(bdName);
  if (!bdNorm) return undefined;

  return appHoldings.find((h) => {
    const appNorm = normalize(h.name);
    // Check if one contains the other (handles truncated names)
    return appNorm.includes(bdNorm) || bdNorm.includes(appNorm);
  });
}

export async function parseBourseDirectXLSX(
  file: File,
  appHoldings: AppHolding[] = []
): Promise<BDPosition[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const positions: BDPosition[] = [];

  for (const row of rows) {
    const isin = String(row['ISIN'] ?? row['Isin'] ?? row['isin'] ?? '').trim();
    if (!isin || isin.length < 10) continue;

    const name = String(row['Nom'] ?? row['nom'] ?? '').trim();
    const currency = String(row['Devise'] ?? row['devise'] ?? 'EUR').trim();
    const qtyBD = Number(row['Quantité'] ?? row['Quantite'] ?? row['quantité'] ?? 0);
    const pruBD = Number(row['PRU (EUR)'] ?? row['PRU'] ?? row['pru'] ?? 0);
    const valorisationBD = Number(row['Valorisation (EUR)'] ?? row['Valorisation'] ?? 0);

    const appMatch = findMatch(isin, name, appHoldings);
    const qtyApp = appMatch?.quantity ?? 0;
    const pruApp = appMatch?.pru ?? 0;

    const diffQty = Math.round((qtyBD - qtyApp) * 1000) / 1000;
    const diffPRU = Math.round((pruBD - pruApp) * 100) / 100;

    let status: BDPosition['status'];
    if (!appMatch) {
      status = 'manquant';
    } else if (Math.abs(diffQty) > 0.001 || Math.abs(diffPRU) > 0.01) {
      status = 'ecart';
    } else {
      status = 'ok';
    }

    const pos: BDPosition = { name, isin, currency, qtyBD, qtyApp, diffQty, pruBD, pruApp, diffPRU, valorisationBD, status };
    console.log('[BD Parser]', { name, isin, qtyBD, qtyApp, status, matchedTo: appMatch?.name ?? 'none' });
    positions.push(pos);
  }

  if (positions.length === 0) {
    throw new Error("Aucune position trouvée dans ce fichier XLSX");
  }

  return positions;
}
