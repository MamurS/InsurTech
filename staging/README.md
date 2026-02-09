# Mosaic ERP Staging Database Setup

Complete guide for setting up a staging Supabase project with imported portfolio data.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STAGING                           PRODUCTION                    │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │ mosaic-erp-staging   │         │ onppnfyoffhyaxemsqoz     │  │
│  │ (Your new project)   │         │ (Render deployment)      │  │
│  └──────────┬───────────┘         └──────────────────────────┘  │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────┐                                        │
│  │ npm run dev (local)  │                                        │
│  │ localhost:5173       │                                        │
│  └──────────────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- A Supabase account

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it `mosaic-erp-staging` (or similar)
3. Choose a region close to you
4. Set a strong database password (save it somewhere safe)
5. Wait for the project to finish provisioning (~2 minutes)

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `mosaic_staging_schema.sql` from this folder
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** (or Cmd/Ctrl + Enter)
5. Wait for the schema to be created
6. You should see a verification table at the bottom showing all tables with 0 rows (except `inward_reinsurance_presets` which has seed data)

## Step 3: Create Test User

1. Go to **Authentication → Users**
2. Click **Add User** → **Create new user**
3. Enter an email and password
4. Click **Create User**
5. Go to **Table Editor → users**
6. Find your user and update the `role` column to `Super Admin`

## Step 4: Get API Credentials

1. Go to **Project Settings → API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdef.supabase.co`)
   - **service_role key** (the secret one, not anon)

## Step 5: Configure Import Script

```bash
cd staging

# Create .env from template
cp .env.template .env

# Edit .env with your values
nano .env  # or use any editor
```

Fill in your `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key...
EXCEL_FILE=Reinsurance_Portfolio.xlsb
EXCEL_PASSWORD=
DRY_RUN=true
```

## Step 6: Install Python Dependencies

```bash
pip install supabase pyxlsb msoffcrypto-tool python-dotenv
```

## Step 7: Dry Run Import

```bash
# Make sure your Excel file is in the staging folder
# or update EXCEL_FILE path in .env

python import_portfolio.py
```

This will:
1. Decrypt the Excel file (if encrypted)
2. Parse all rows
3. Write first 20 records to `import_preview.json`
4. Exit without inserting anything

Review `import_preview.json` to verify the data looks correct.

## Step 8: Real Import

```bash
# Edit .env and set:
# DRY_RUN=false

python import_portfolio.py
```

The script will:
1. Insert records in batches of 50
2. Retry failed batches row-by-row
3. Print a summary of inserted/failed records

## Step 9: Point React App at Staging

Edit the **root** `.env` file (not the staging one):

```env
# Root .env file
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_KEY=eyJ...your-anon-key...  # Use anon key, not service_role
```

**Note:** The app uses plain `SUPABASE_URL` and `SUPABASE_KEY` (without `VITE_` prefix). The `vite.config.ts` injects these via `loadEnv` + `define`.

## Step 10: Run the App

```bash
# From project root
npm run dev
```

Open http://localhost:5173 and log in with your test user.

## Verify Data

1. Go to **Inward Reinsurance → Foreign** or **Domestic**
2. You should see the imported records
3. Go to **Analytics Dashboard** to see KPI summaries

---

## Known Issues

### Analytics Shows No Data

The `hooks/useAnalytics.ts` file queries snake_case column names (`gross_premium_original`, `is_deleted`) but the `policies` table uses camelCase (`"grossPremium"`, `"isDeleted"`).

**Quick Fix:** Edit `hooks/useAnalytics.ts` and change:
```typescript
// FROM:
.select('gross_premium_original, net_premium_original, status')
.eq('is_deleted', false);

// TO:
.select('"grossPremium", "netPremium", status')
.eq('"isDeleted"', false);
```

Note the double-quotes around camelCase column names (required by PostgreSQL).

---

## Column Naming Convention Reference

The database has **two naming conventions** that must be preserved:

| Tables (camelCase in quotes) | Tables (snake_case) |
|------------------------------|---------------------|
| `users` | `inward_reinsurance` |
| `policies` | `inward_reinsurance_presets` |
| `clauses` | `claims` |
| `slips` | `claim_transactions` |
| `templates` | `claim_documents` |
| `legal_entities` | `agenda_tasks` |
| `entity_logs` | `activity_log` |
| | `departments` |
| | `fx_rates` |

**camelCase example:** `SELECT "grossPremium", "insuredName", "isDeleted" FROM policies`

**snake_case example:** `SELECT gross_premium, cedant_name, is_deleted FROM inward_reinsurance`

---

## File Structure

```
staging/
├── mosaic_staging_schema.sql   # Complete DB schema (run in SQL Editor)
├── import_portfolio.py         # Python import script
├── .env.template               # Environment template
├── .env                        # Your local config (git-ignored)
├── import_preview.json         # Generated by dry run
└── README.md                   # This file
```

---

## Troubleshooting

### "relation does not exist"
Run the schema SQL again - some tables may have failed to create.

### "permission denied for table"
Make sure you're using the **service_role** key for the import script (bypasses RLS).

### "duplicate key value violates unique constraint"
The data was already imported. Truncate the table first:
```sql
TRUNCATE TABLE inward_reinsurance CASCADE;
```

### Import script can't read .xlsb file
Make sure you have `pyxlsb` and `msoffcrypto-tool` installed:
```bash
pip install pyxlsb msoffcrypto-tool
```

### Dates look wrong
The script handles Excel serial numbers and various date formats. Check `import_preview.json` to see how dates are being parsed.
