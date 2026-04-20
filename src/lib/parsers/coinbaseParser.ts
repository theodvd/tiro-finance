import Papa from 'papaparse';
import type { CoinbasePosition, CBAppHolding } from '@/types/parsers';

// Re-exports pour compatibilité avec les imports existants
export type { CoinbasePosition };
// AppHolding est l'ancien nom de CBAppHolding — conservé pour ne pas casser les consommateurs
export type { CBAppHolding as AppHolding };

export async function parseCoinbaseCSV(
  file: File,
  appHoldings: CBAppHolding[] = []
): Promise<CoinbasePosition[]> {
  const text = await file.text();

  const lines = text.split('\n');
  const headerIndex = lines.findIndex(line =>
    line.includes('Timestamp') && line.includes('Transaction Type')
  );
  if (headerIndex === -1) {
    throw new Error('Format CSV Coinbase non reconnu. Cherche la ligne "Timestamp" comme en-tête.');
  }

  const csvData = lines.slice(headerIndex).join('\n');
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    console.warn('[CB Parser] Parse warnings:', parsed.errors);
  }

  console.log('[CB Parser] Rows parsed:', parsed.data.length);

  const assetMap: Record<string, { qty: number; invested: number }> = {};

  for (const row of parsed.data as any[]) {
    const txType = (row['Transaction Type'] || '').trim();
    const asset = (row['Asset'] || '').trim();
    const quantity = Math.abs(parseFloat(
      (row['Quantity Transacted'] || '0').toString().replace(',', '.')
    )) || 0;
    const total = parseFloat(
      (row['Total (inclusive of fees and/or spread)'] || row['Total'] || '0')
        .toString()
        .replace('-€', '-')
        .replace('€', '')
        .replace(',', '.')
        .replace(/\s/g, '')
    ) || 0;

    if (['EUR', 'USD', 'GBP', 'EURC', 'USDC'].includes(asset)) continue;
    if (!asset) continue;

    if (!assetMap[asset]) {
      assetMap[asset] = { qty: 0, invested: 0 };
    }

    if (txType === 'Buy') {
      assetMap[asset].qty += quantity;
      assetMap[asset].invested += Math.abs(total);
    } else if (txType === 'Sell') {
      const currentQty = assetMap[asset].qty;
      const currentInvested = assetMap[asset].invested;
      const avgCost = currentQty > 0 ? currentInvested / currentQty : 0;
      assetMap[asset].qty -= quantity;
      assetMap[asset].invested -= avgCost * quantity;
    } else if (txType === 'Staking Income') {
      assetMap[asset].qty += quantity;
    } else if (txType === 'Incentives Rewards Payout') {
      assetMap[asset].qty += quantity;
    } else if (txType === 'Subscription') {
      assetMap[asset].qty += quantity;
    }

    console.log(`[CB Parser] ${txType} ${asset}: qty=${quantity}, total=${total}`);
  }

  const positions: CoinbasePosition[] = [];

  for (const [asset, data] of Object.entries(assetMap)) {
    if (Math.abs(data.qty) < 0.00000001) continue;

    const appMatch = appHoldings.find(h => h.symbol === asset);
    const qtyApp = appMatch?.quantity || 0;
    const investedApp = appMatch?.amountInvested || 0;

    const diffQty = data.qty - qtyApp;
    const diffInvested = data.invested - investedApp;

    let status: CoinbasePosition['status'];
    if (!appMatch) {
      status = 'manquant';
    } else if (Math.abs(diffQty) > 0.00000001 || Math.abs(diffInvested) > 0.01) {
      status = 'ecart';
    } else {
      status = 'ok';
    }

    positions.push({
      asset,
      quantity: Math.max(0, data.qty),
      totalInvested: Math.max(0, data.invested),
      currentValue: 0,
      qtyApp,
      investedApp,
      diffQty,
      diffInvested,
      status,
    });

    console.log(`[CB Parser] Position ${asset}:`, {
      qty: data.qty, invested: data.invested, qtyApp, investedApp, status
    });
  }

  if (positions.length === 0) {
    throw new Error('Aucune position crypto trouvée dans ce CSV.');
  }

  return positions;
}
