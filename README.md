# Solvio

Cockpit financier unifié pour freelances et indépendants français.

Solvio connecte la partie **professionnelle** (factures, URSSAF, impôts, régimes fiscaux)
à la partie **personnelle** (épargne, PER, AV, PEA, investissements) pour répondre
à une question clé : _"Après URSSAF et impôts, combien je peux investir ce mois-ci ?"_

> **Projet Lovable** : https://lovable.dev/projects/060bbf00-e8d9-4539-9bc9-5ffd38d95ca8

---

## Stack technique

| Couche | Outil |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (SWC) |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router DOM 6 |
| Data fetching | TanStack Query 5 |
| Backend / DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| Parsers | pdfjs-dist (PDF), xlsx (XLSX), PapaParse (CSV) |
| Charts | Recharts |
| Package manager | npm |

---

## Lancer en local

```bash
# 1. Cloner le repo
git clone <GIT_URL>
cd solvio-tech

# 2. Copier et remplir les variables d'environnement
cp .env.example .env
# Remplis VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY
# (disponibles dans Supabase Dashboard > Project Settings > API)

# 3. Installer les dépendances
npm install

# 4. Lancer le serveur de développement
npm run dev
# → http://localhost:8080
```

---

## Structure du repo

```
/Users/theo/PRO/Solvio/
├── solvio-tech/           ← SOURCE DE VÉRITÉ (projet Lovable actif)
│   ├── src/
│   │   ├── pages/         ← Pages React (une page = une route)
│   │   │   ├── pro/       ← Pages section /pro (Invoices, Charges, Tax)
│   │   │   └── (perso)    ← Pages section /perso à la racine (Portfolio, Investments, etc.)
│   │   ├── components/    ← Composants UI
│   │   │   ├── dashboard/ ← Widgets du dashboard patrimoine
│   │   │   ├── investments/  ← Holdings, DCA
│   │   │   ├── diversification/
│   │   │   ├── import/    ← Composants des 3 parsers (TR, BD, Coinbase)
│   │   │   ├── profile/   ← Profil investisseur MIFID II
│   │   │   ├── layout/    ← AppLayout, TopNav
│   │   │   └── ui/        ← shadcn/ui (ne pas modifier manuellement)
│   │   ├── hooks/         ← Custom hooks React Query
│   │   ├── lib/           ← Moteurs métier + parsers
│   │   │   ├── parsers/   ← tradeRepublicParser, bourseDirectParser, coinbaseParser
│   │   │   ├── diversificationScore.ts
│   │   │   ├── investorProfileEngine.ts
│   │   │   └── ...
│   │   ├── types/
│   │   │   └── parsers.ts ← Types centralisés des parsers (TRTransaction, BDPosition, etc.)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── integrations/supabase/
│   │       ├── client.ts  ← Client Supabase (auto-généré)
│   │       └── types.ts   ← Types TypeScript du schéma DB (auto-généré)
│   ├── supabase/
│   │   ├── migrations/    ← Migrations SQL (24 fichiers, nov 2025 → fév 2026)
│   │   └── functions/     ← 9 Edge Functions Deno
│   ├── .env               ← Variables locales (ne PAS committer)
│   ├── .env.example       ← Template des variables (committer)
│   └── package.json
│
├── MarketStudy_v1.md      ← Étude de marché (référence, ne pas modifier)
├── Solvio BMC.png         ← Business Model Canvas
└── Solvio VPC.pdf         ← Value Proposition Canvas
```

---

## Routes actuelles

### Section professionnelle (`/pro`)
| Route | Page | Rôle |
|---|---|---|
| `/pro/invoices` | pro/Invoices.tsx | Factures émises *(Phase B)* |
| `/pro/charges` | pro/Charges.tsx | Cotisations URSSAF *(Phase B)* |
| `/pro/tax` | pro/Tax.tsx | Provisions fiscales IR/CFE *(Phase B)* |

### Section personnelle (`/perso`)
| Route | Page | Rôle |
|---|---|---|
| `/perso/portfolio` | Portfolio.tsx | Dashboard patrimoine (P&L, allocation, liquidité) |
| `/perso/investments` | Investments.tsx | Holdings, DCA, ajout de position |
| `/perso/insights` | Insights.tsx | Analytics : performance, tendances |
| `/perso/diversification` | Diversification.tsx | Score de diversification (HHI) |

### Transversal
| Route | Page | Rôle |
|---|---|---|
| `/auth` | Auth.tsx | Connexion / inscription |
| `/dashboard` | Dashboard.tsx | Vue unifiée pro×perso *(widget net investissable en Phase B)* |
| `/import` | Import.tsx | Import : Trade Republic (PDF), Bourse Direct (XLSX), Coinbase (CSV) |
| `/decisions` | Decisions.tsx | Journal de décisions d'investissement |
| `/monthly-review` | MonthlyReview.tsx | Revue mensuelle |
| `/profile` | Profile.tsx | Profil investisseur MIFID II + fiscal *(onglet fiscal en A5)* |
| `/settings` | Settings.tsx | Paramètres |

### Redirects (anciennes URLs conservées)
| Ancienne URL | Redirige vers |
|---|---|
| `/` | `/dashboard` |
| `/investments` | `/perso/investments` |
| `/insights` | `/perso/insights` |
| `/diversification` | `/perso/diversification` |

---

## Parsers d'import

Tous dans `src/lib/parsers/`. Les types sont centralisés dans `src/types/parsers.ts`.

| Parser | Fichier source | Format | Sortie |
|---|---|---|---|
| Trade Republic | `tradeRepublicParser.ts` | PDF (relevé de compte) | `TRTransaction[]` |
| Bourse Direct | `bourseDirectParser.ts` | XLSX (export positions) | `BDPosition[]` |
| Coinbase | `coinbaseParser.ts` | CSV (export transactions) | `CoinbasePosition[]` |

### Tester un parser manuellement

```typescript
// Exemple dans la console du navigateur (après import dans un composant) :
// 1. Ouvrir /import dans l'app
// 2. Inspecter la console : les parsers loggent chaque ligne avec [TR Parser], [BD Parser], [CB Parser]
// 3. Si une transaction n'est pas parsée, inspecter fullText dans les logs [TR Parser] Page N
```

---

## Migrations Supabase

Les migrations sont dans `supabase/migrations/`. Elles sont appliquées via Lovable
(onglet Supabase dans l'éditeur) ou manuellement via la CLI :

```bash
# Appliquer toutes les migrations en attente
npx supabase db push --project-ref <VITE_SUPABASE_PROJECT_ID>
```

**Règle** : les nouvelles migrations sont nommées `YYYYMMDDHHMMSS_description.sql`
(pas de UUID aléatoire) pour garder l'historique lisible.

---

## Workflow Git

```bash
# Créer une branche pour chaque étape de la Phase A
git checkout -b feat/a1-nettoyage-repo

# Commits atomiques — une chose par commit
git commit -m "feat(types): centralisation types parsers dans src/types/parsers.ts"
git commit -m "chore(env): ajout .env.example"
git commit -m "docs: mise à jour README structure repo"

# Merger dans main après validation
git checkout main && git merge feat/a1-nettoyage-repo
```

---

## Roadmap Phase A (en cours)

- [x] A1 — Nettoyage repo (`.env.example`, types centralisés, README)
- [x] A2 — Restructuration des routes (`/pro/*`, `/perso/*`, redirects)
- [x] A3 — Navigation unifiée (toggle Pro/Perso, renommage Solen→Solvio)
- [x] A4 — Migrations Supabase (fiscal_profiles, invoices, social_contributions, tax_provisions, pro_cashflow_entries)
- [x] A5 — Onboarding fiscal (useFiscalProfile, FiscalProfileForm, onglet Fiscal dans Profile, bannière Dashboard)
- [ ] A6 — Hook `useNetInvestable` (structure)
- [ ] A7 — Smoke tests parsers
