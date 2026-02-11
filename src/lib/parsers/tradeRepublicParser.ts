// Trade Republic PDF parser — mock implementation
// Real parsing will be implemented in a future prompt

export interface TRTransaction {
  date: string;
  type: 'Achat' | 'Vente' | 'DCA';
  isin: string;
  name: string;
  quantity: number;
  amountEur: number;
  unitPrice: number;
}

export async function parseTradeRepublicPDF(_file: File): Promise<TRTransaction[]> {
  // Simulate parsing delay
  await new Promise((r) => setTimeout(r, 1500));

  // Return mock data
  return [
    { date: '2025-01-15', type: 'Achat', isin: 'IE00B4L5Y983', name: 'iShares Core MSCI World', quantity: 12, amountEur: 1044.00, unitPrice: 87.00 },
    { date: '2025-01-20', type: 'DCA', isin: 'IE00B4L5Y983', name: 'iShares Core MSCI World', quantity: 5, amountEur: 440.00, unitPrice: 88.00 },
    { date: '2025-02-01', type: 'Achat', isin: 'LU1681043599', name: 'Amundi MSCI Emerging Markets', quantity: 20, amountEur: 520.00, unitPrice: 26.00 },
    { date: '2025-02-10', type: 'Vente', isin: 'FR0000120271', name: 'TotalEnergies SE', quantity: 8, amountEur: 480.00, unitPrice: 60.00 },
    { date: '2025-02-15', type: 'DCA', isin: 'IE00B4L5Y983', name: 'iShares Core MSCI World', quantity: 5, amountEur: 445.00, unitPrice: 89.00 },
  ];
}
