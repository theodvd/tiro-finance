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
  isin: string;
  quantity: number;
  pru: number;
}

export async function parseBourseDirectXLSX(
  file: File,
  appHoldings?: AppHolding[]
): Promise<BDPosition[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const holdingsByIsin = new Map<string, AppHolding>();
  if (appHoldings) {
    for (const h of appHoldings) {
      holdingsByIsin.set(h.isin, h);
    }
  }

  const positions: BDPosition[] = [];

  for (const row of rows) {
    // Try multiple possible header names for ISIN
    const isin = String(row['ISIN'] ?? row['Isin'] ?? row['isin'] ?? '').trim();
    if (!isin || isin.length < 10) continue;

    const name = String(row['Nom'] ?? row['nom'] ?? '').trim();
    const currency = String(row['Devise'] ?? row['devise'] ?? 'EUR').trim();
    const qtyBD = Number(row['Quantité'] ?? row['Quantite'] ?? row['quantité'] ?? 0);
    const pruBD = Number(row['PRU (EUR)'] ?? row['PRU'] ?? row['pru'] ?? 0);
    const valorisationBD = Number(row['Valorisation (EUR)'] ?? row['Valorisation'] ?? 0);

    const appHolding = holdingsByIsin.get(isin);
    const qtyApp = appHolding?.quantity ?? 0;
    const pruApp = appHolding?.pru ?? 0;

    const diffQty = Math.round((qtyBD - qtyApp) * 1000) / 1000;
    const diffPRU = Math.round((pruBD - pruApp) * 100) / 100;

    let status: BDPosition['status'];
    if (!appHolding) {
      status = 'manquant';
    } else if (Math.abs(diffQty) <= 0.001 && Math.abs(diffPRU) <= 0.01) {
      status = 'ok';
    } else {
      status = 'ecart';
    }

    const pos: BDPosition = { name, isin, currency, qtyBD, qtyApp, diffQty, pruBD, pruApp, diffPRU, valorisationBD, status };
    console.log('[BD Parser]', pos);
    positions.push(pos);
  }

  if (positions.length === 0) {
    throw new Error("Aucune position trouvée dans ce fichier XLSX");
  }

  return positions;
}
