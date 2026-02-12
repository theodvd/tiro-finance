

## Probleme actuel

Actuellement, l'etape 4 (upsert holdings) **additionne** les parts importees aux holdings existants. Si tu reimportes le meme PDF le mois suivant, les montants doublent au lieu de se recalculer.

L'objectif est clair : chaque import mensuel doit **recalculer les holdings TR a partir de l'ensemble des transactions en base**, pas juste ajouter les nouvelles.

## Solution

Modifier l'etape 4 de `persistTradeRepublicImport.ts` pour :

1. **Apres insertion des nouvelles transactions**, requeter **toutes** les transactions en base pour chaque couple (account TR + security) concerne
2. **Recalculer** le total de parts, le montant investi et le PRU a partir de l'historique complet (pas seulement le PDF courant)
3. **Ecraser** le holding existant avec les valeurs recalculees (update) ou le creer si absent (insert)

Cela garantit que meme si des transactions anciennes existaient deja, le holding reflette toujours la realite complete.

## Details techniques

### Fichier modifie : `src/lib/persistTradeRepublicImport.ts`

**Remplacer l'etape 4** : au lieu d'aggreger uniquement les transactions du PDF, on :

1. Collecte la liste des `(accountId, securityId)` touches par l'import
2. Pour chaque paire, on fait un `SELECT` de **toutes** les transactions en base (`WHERE account_id = X AND security_id = Y AND user_id = Z`)
3. On recalcule : `shares = SUM(BUY/DCA) - SUM(SELL)`, `totalInvested = SUM montants BUY/DCA - SUM montants SELL`, `avgPrice = totalInvested / shares`
4. On fait un upsert du holding avec ces valeurs calculees depuis l'historique complet

```
-- Pseudo-logique
Pour chaque (accountId, securityId) impacte :
  allTx = SELECT * FROM transactions WHERE account_id AND security_id AND user_id
  shares = somme des achats - somme des ventes
  invested = somme montants achats - somme montants ventes
  avgPrice = invested / shares

  UPSERT holdings SET shares, amount_invested_eur, avg_buy_price_native
```

Aucun autre fichier n'est modifie. L'UI reste identique.

