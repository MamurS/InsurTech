# Data Import Tool

Comprehensive production import tool with full rollback capability.

## Summary

### Files Created in `/production/`

| File | Purpose |
|------|---------|
| `import_production.py` | Main import script with all functionality |
| `.env.template` | Template for your credentials |
| `add_import_tracking_columns.sql` | One-time migration (run before first import) |
| `README.md` | Detailed usage instructions |

### Checkpoint/Rollback Strategy

**Three rollback options:**

1. **Rollback by Batch ID** - Delete only records from a specific import:
   ```bash
   python import_production.py --rollback abc123
   ```

2. **Full Restore** - Restore entire database to pre-import state:
   ```bash
   python import_production.py --restore backup_20260210_143000
   ```

3. **Manual Backup** - Create backup anytime:
   ```bash
   python import_production.py --backup
   ```

### To Run the Production Import

On your local Mac:

1. **Copy files to your Mac** (where the Excel file is):
   ```bash
   # Copy the production folder from the repo
   ```

2. **Set up environment**:
   ```bash
   cd production
   cp .env.template .env
   # Edit .env with production Supabase credentials
   ```

3. **Run migration ONCE** (in Supabase SQL Editor):
   ```sql
   -- Run add_import_tracking_columns.sql
   ```

4. **Preview first** (dry run):
   ```bash
   python import_production.py --dry-run
   ```

5. **Execute import**:
   ```bash
   python import_production.py --import
   ```

### What Gets Imported

- **All sheets** from Excel (each year as separate sheet)
- **Legal entities** extracted automatically:
  - Cedants → Insurance Company/Reinsurer
  - Brokers → Broker
  - Original Insureds → Insured
- **Deduplication**: Won't create duplicate entities

### For Previous Years

Each import gets its own batch ID:
```bash
EXCEL_FILE=Portfolio_2023.xlsb python import_production.py --import
EXCEL_FILE=Portfolio_2022.xlsb python import_production.py --import
```

Each can be independently rolled back if needed.
