/**
 * Types partagés entre les parsers d'import (Trade Republic, Bourse Direct, Coinbase).
 *
 * Règle : les fonctions de parsing restent dans leur fichier respectif.
 * Ce fichier ne contient que les interfaces et types — aucune logique.
 *
 * Les parsers re-exportent leurs types depuis ce fichier pour garantir
 * que les composants consommateurs n'ont pas besoin de changer leurs imports.
 */

// ─────────────────────────────────────────────────────────────
// Partagé entre tous les parsers de réconciliation
// ─────────────────────────────────────────────────────────────

/** Statut de réconciliation entre les données importées et l'état de l'app */
export type ReconciliationStatus = 'ok' | 'ecart' | 'manquant';

// ─────────────────────────────────────────────────────────────
// Trade Republic
// ─────────────────────────────────────────────────────────────

/** Une transaction parsée depuis un relevé PDF Trade Republic */
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

// ─────────────────────────────────────────────────────────────
// Bourse Direct
// ─────────────────────────────────────────────────────────────

/**
 * Représentation d'une position côté app, nécessaire pour la réconciliation
 * avec un fichier XLSX Bourse Direct.
 * Nommé BDAppHolding pour éviter la collision avec CBAppHolding (Coinbase),
 * qui a un shape différent.
 */
export interface BDAppHolding {
  isin: string;
  symbol: string;
  name: string;
  quantity: number;
  pru: number;
}

/** Une position réconciliée entre le fichier XLSX Bourse Direct et l'app */
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
  status: ReconciliationStatus;
}

// ─────────────────────────────────────────────────────────────
// Coinbase
// ─────────────────────────────────────────────────────────────

/**
 * Représentation d'une position côté app, nécessaire pour la réconciliation
 * avec un export CSV Coinbase.
 * Shape différent de BDAppHolding : pas d'ISIN, montant investi au lieu de PRU.
 */
export interface CBAppHolding {
  symbol: string;
  quantity: number;
  amountInvested: number;
}

/** Une position réconciliée entre le CSV Coinbase et l'app */
export interface CoinbasePosition {
  asset: string;
  quantity: number;
  totalInvested: number;
  currentValue: number;
  qtyApp: number;
  investedApp: number;
  diffQty: number;
  diffInvested: number;
  status: ReconciliationStatus;
}
