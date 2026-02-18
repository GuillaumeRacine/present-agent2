# Present Agent2 - Data Manifest

> Complete inventory of data sources and locations

---

## Product Catalog (B-Corp Brands)

### Primary Location
**iCloud:** `~/Library/Mobile Documents/com~apple~CloudDocs/Knowledge/BCorp/`

### Files

| File | Size | Records | Created | Status |
|------|------|---------|---------|--------|
| `PresentAgentList-1.json` | 5.2MB | 70,159 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-2.json` | 5.2MB | 79,498 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-3.json` | 5.2MB | 62,822 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-4.json` | 5.2MB | 96,746 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-5.json` | 5.2MB | 61,909 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-6.json` | 5.2MB | 64,593 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-7.json` | 5.2MB | 56,178 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-8.json` | 5.2MB | 59,148 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-9.json` | 5.2MB | 62,624 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-10.json` | 5.2MB | 52,339 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-11.json` | 5.2MB | 67,761 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-12.json` | 5.2MB | 42,571 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-13.json` | 5.2MB | 84,228 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-14.json` | 5.2MB | 58,367 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-15.json` | 5.2MB | 54,275 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-16.json` | 5.2MB | 75,175 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-17.json` | 5.2MB | 62,767 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-18.json` | 5.2MB | 53,637 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-19.json` | 5.2MB | 47,136 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-20.json` | 5.2MB | 54,363 lines | Nov 2023 | ✓ Available |
| `PresentAgentList-21.json` | 1.9MB | 13,476 lines | Nov 2023 | ✓ Available |
| **TOTAL** | **102MB** | **1,279,772 lines** | | |

### Supporting Files

| File | Size | Purpose |
|------|------|---------|
| `master.json` | 26.9MB | Combined dataset |
| `master.csv` | 24.1MB | CSV export |
| `BCorps_Products_Cleaned.json` | 9.3MB | Cleaned version |
| `all_gifts_skus.csv` | 14.4MB | SKU mapping |

### Schema

```json
{
  "Brand URL": "https://example.com/",
  "Product URL": "https://example.com/products/...",
  "Product Title": "Product Name",
  "Price": "32.00",
  "Currency": "USD",
  "Sizes/Formats available": "Size Color",
  "Variants (colors, etc.)": "One Size / Color",
  "Text Product Description": "Description text"
}
```

### Sample Brands

- Marine Layer (sustainable apparel)
- B-Corp certified DTC brands
- Ethical/sustainable products
- Gift-appropriate items

---

## Research Papers (Gift Psychology)

### Location
**Seagate:** `/Volumes/Seagate 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research Papers/Gifts/`

### Papers (14 total)

| File | Size | Topics |
|------|------|--------|
| `Gift recommendation systems_ a review _ Electronic Commerce Research.md` | 17.6KB | RS frameworks, evaluation metrics |
| `Gift giving in the age of AI_ The role of social closeness - Fu - 2024.md` | 108.9KB | AI tools, trust, adoption |
| `An integrative review of gift‐giving research - Givi - 2023.md` | 38.3KB | Consumer behavior, marketing |
| `Give a piece of you_ Gifts that reflect givers promote closeness.md` | 14.6KB | Personalization, relationships |
| `Giver‐receiver discrepancy in probabilistic vs regular gifts - Peng - 2024.md` | 21.1KB | Decision patterns, risk |
| `Your gift choice for boss vs subordinate - ScienceDirect.md` | 12.2KB | Power dynamics |
| `Self-gifting consumer behavior - Management Review Quarterly.md` | 29.7KB | Self-gifting patterns |
| `Understanding AI impact on charitable giving - Yang - 2024.md` | 22.7KB | Justice, trust, regulation |
| `Giving pleasure or avoiding risk - Asia Pacific Journal.md` | 2.9KB | Social closeness effects |
| `Your gift, but my attitude - European Journal of Marketing.md` | 5.3KB | Attitude-inconsistent gifts |
| `2410.19744v1.md` (2 versions) | 157.8KB | Latest research |
| `2501.12152v2.md` | 67.2KB | Recent findings |
| `s10462-025-11189-8.md` | 109.9KB | Latest systems review |

**Total Size:** ~750KB
**Date Range:** 2023-2025 (mostly Dec 2024)

---

## Codebase Location

### Primary (Active Development)
**Crucial X8 SSD:** `/Volumes/Crucial/X8/Code/Present/Agent2/` ⚠️ **Currently unmounted**

**Last Session:** Dec 11, 2025
**Working on:** NewsAPI integration

### Secondary (This Location)
**Seagate 2TB:** `/Volumes/Seagate 2TB/1_Projects/Protoypes/present-agent2/`

**Status:** Empty structure ready for code migration

### Vault Reference
**Obs_Vault:** `/Users/gui/Obs_Vault/1_Projects/Present_Agent2/`

**Purpose:** Documentation, planning, research synthesis

---

## GitHub Repository

**Repo:** `GuillaumeRacine/present-agent2`
**Status:** Private
**Auth:** Token expired (needs `gh auth login`)

**To access:**
```bash
gh auth login
gh repo view GuillaumeRacine/present-agent2
gh repo clone GuillaumeRacine/present-agent2
```

---

## Data Loading Scripts

### Expected Scripts (in codebase)

```bash
# Load product catalog into Neo4j
npm run load-products

# Generate embeddings
npm run generate-embeddings

# Build graph relationships
npm run build-graph

# Import research insights
npm run load-research

# Validate data
npm run validate-data
```

---

## Migration Checklist

### From iCloud to Local

- [ ] Copy all 21 PresentAgentList JSON files
- [ ] Copy master.json and master.csv
- [ ] Copy cleaned dataset
- [ ] Verify file integrity (checksums)
- [ ] Total size: ~102MB

### From Crucial X8 to Seagate

- [ ] Mount Crucial X8 drive
- [ ] Copy entire codebase
- [ ] Copy node_modules or run npm install
- [ ] Copy .env.local (if exists)
- [ ] Copy any local Neo4j data
- [ ] Verify Git status

### From Research Backup

- [ ] Copy or symlink 14 research papers
- [ ] Create paper summaries
- [ ] Extract key insights
- [ ] Build reference index

---

## Data Pipeline

```
iCloud BCorp Data (102MB)
    ↓
Clean & Transform (scripts/clean.js)
    ↓
Generate Embeddings (Cohere)
    ↓
Load into Neo4j
    ↓
Build Graph Relationships
    ↓
Index for Vector Search
    ↓
Ready for Agent System
```

---

## Quick Access Commands

```bash
# Product data
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Knowledge/BCorp/

# Research papers
cd /Volumes/Seagate\ 2TB/0_System/Obsidian_Private/ID/_Backup/Knowledge/Research\ Papers/Gifts/

# Project location
cd /Volumes/Seagate\ 2TB/1_Projects/Protoypes/present-agent2/

# Vault reference
cd ~/Obs_Vault/1_Projects/Present_Agent2/
```

---

*Last updated: 2026-02-15*
