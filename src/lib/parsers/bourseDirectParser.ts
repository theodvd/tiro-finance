// Bourse Direct XLSX parser — mock implementation
// Real parsing will be implemented in a future prompt

export interface BDPosition {
  name: string;
  isin: string;
  qtyBD: number;
  qtyApp: number;
  diffQty: number;
  pruBD: number;
  pruApp: number;
  diffPRU: number;
  status: 'ok' | 'ecart' | 'manquant';
}

export async function parseBourseDirectXLSX(_file: File): Promise<BDPosition[]> {
  // Simulate parsing delay
  await new Promise((r) => setTimeout(r, 1500));

  // Return mock data
  return [
    { name: 'iShares Core MSCI World', isin: 'IE00B4L5Y983', qtyBD: 50, qtyApp: 50, diffQty: 0, pruBD: 85.20, pruApp: 85.20, diffPRU: 0, status: 'ok' },
    { name: 'Amundi MSCI EM', isin: 'LU1681043599', qtyBD: 30, qtyApp: 25, diffQty: 5, pruBD: 24.50, pruApp: 25.10, diffPRU: -0.60, status: 'ecart' },
    { name: 'TotalEnergies SE', isin: 'FR0000120271', qtyBD: 15, qtyApp: 15, diffQty: 0, pruBD: 58.30, pruApp: 58.30, diffPRU: 0, status: 'ok' },
    { name: 'BNP Paribas', isin: 'FR0000131104', qtyBD: 10, qtyApp: 0, diffQty: 10, pruBD: 62.40, pruApp: 0, diffPRU: 62.40, status: 'manquant' },
    { name: 'Lyxor CAC 40 ETF', isin: 'FR0007052782', qtyBD: 40, qtyApp: 38, diffQty: 2, pruBD: 55.00, pruApp: 56.20, diffPRU: -1.20, status: 'ecart' },
  ];
}
