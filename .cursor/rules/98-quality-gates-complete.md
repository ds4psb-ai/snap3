# Quality Gates Complete & Schema Validation

## Hook Gate Validation
**Purpose**: Validates VDP files for Hook Gate compliance (≤3s & ≥0.70)

### Command Usage
```bash
./scripts/validate-hook-gate.sh '/tmp/*.vdp.json'
./scripts/validate-hook-gate.sh 'out/hook/*.vdp.json'
```

### Hook Gate Rules
- `start_sec` ≤ 3.0 seconds
- `strength_score` ≥ 0.70

### JQ Logic
```bash
jq '{start_sec:.overall_analysis.hookGenome.start_sec,
     strength:.overall_analysis.hookGenome.strength_score,
     pass:(.overall_analysis.hookGenome.start_sec<=3
           and .overall_analysis.hookGenome.strength_score>=0.70)}' \
    /tmp/*.vdp.json
```

### Features
- ✅ Colorized output with pass/fail indicators
- ✅ Detailed failure reasons (time exceeded, strength too low, missing fields)
- ✅ Comprehensive summary with pass/fail counts
- ✅ Pattern-based file matching

## AJV Schema Validation
**Purpose**: Validates VDP JSON files against official schema using AJV CLI

### Command Usage
```bash
./scripts/validate-vdp-schema.sh '/tmp/*.vdp.json'
./scripts/validate-vdp-schema.sh 'test_file.vdp.json'
```

### Schema File
- **Master Schema**: `vdp.schema.json` (815 lines of comprehensive validation)
- **Compliance**: JSON Schema Draft 2020-12

### Core Command
```bash
npx ajv-cli validate -s vdp.schema.json -d '/tmp/*.vdp.json' --spec=draft2020
```

### Features
- ✅ Individual file validation with detailed error reporting
- ✅ Batch validation for multiple files
- ✅ JSON Schema Draft 2020-12 compliance
- ✅ Specific validation error messages with field paths

## VDP Schema Backfill
**Purpose**: Converts legacy VDP format (hookSec) to new format (hookGenome)

### Command Usage
```bash
./scripts/backfill-vdp-schema.sh 'legacy/*.vdp.json' 'backfilled/'
./scripts/backfill-vdp-schema.sh 'old_file.vdp.json'
```

### Conversion Logic
```bash
jq 'if .overall_analysis and .overall_analysis.hookSec and (.overall_analysis.hookGenome|not)
    then .overall_analysis.hookGenome = {
           pattern_code:"UNKNOWN",
           delivery:"unknown",
           trigger_modalities:[],
           start_sec:(.overall_analysis.hookSec),
           strength_score:0.70
         }
    else . end' old.vdp.json > old.patched.vdp.json
```

### Features
- ✅ Automatic legacy format detection
- ✅ Safe conversion with backup preservation
- ✅ Detailed conversion reporting
- ✅ Error handling for malformed files

## GOLD JSONL Pipeline
**Purpose**: Converts VDP files to JSONL format and loads to BigQuery

### Command Usage
```bash
./scripts/vdp-to-gold-jsonl.sh '/tmp/*.vdp.json' --validate --upload-gcs --load-bq
./scripts/vdp-to-gold-jsonl.sh 'files/*.vdp.json' --date 2025-08-15
```

### JSONL Generation
```bash
mkdir -p out/gold/$(date +%F)
jq -c '{content_id, metadata, overall_analysis, scenes, load_date:"'$(date +%F)'", load_timestamp:now|tojson}' \
   /tmp/*.vdp.json > out/gold/$(date +%F)/vdp-gold.jsonl
```

### BigQuery Load
```bash
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --ignore_unknown_values \
  --schema_update_option=ALLOW_FIELD_ADDITION \
  vdp_dataset.vdp_gold \
  gs://tough-variety-gold/dt=$(date +%F)/vdp-gold.jsonl
```

### Features
- ✅ Integrated validation pipeline
- ✅ GCS upload with size verification
- ✅ BigQuery loading with schema evolution
- ✅ Load verification and record counting
- ✅ Configurable date and output directories

## Comprehensive Test Suite
**Purpose**: Tests all quality gate components with sample data

### Command Usage
```bash
./scripts/test-quality-gates.sh
```

### Features
- ✅ Hook Gate validation testing
- ✅ Schema validation testing
- ✅ JSONL generation testing
- ✅ End-to-end pipeline testing with synthetic data
- ✅ Automatic test file creation and cleanup

## Integration Points

### Multi-Platform Scripts
All platform-specific scripts now automatically use quality gates:
- `vdp-extract-multiplatform.sh` → integrated validation
- `vdp-extract-upgraded.sh` → Hook Gate checking
- `vdp-extract-instagram.sh` → Hook Gate checking  
- `vdp-extract-tiktok.sh` → Hook Gate checking

### t2-extract Service
Schema enforcement active at API level:
- Gemini responses validated against schema
- Hook Gate validation in API response
- RFC 9457 error handling for failures

### BigQuery Integration
GOLD pipeline ready for production:
- Schema evolution support (`ALLOW_FIELD_ADDITION`)
- Partitioned by load_date
- Load verification and monitoring
- JSONL format optimized for BigQuery

## Error Codes
- `HOOK_GATE_FAILED` — Hook start time >3s or strength <0.70
- `SCHEMA_VALIDATION_FAILED` — VDP structure violates schema requirements
- `LEGACY_FORMAT_DETECTED` — Old hookSec format found, conversion needed
- `JSONL_GENERATION_FAILED` — JSONL conversion or BigQuery load failed

## Auto-attach Triggers
This rule auto-attaches when working on:
- Quality gate implementation
- Schema validation systems
- Hook Gate validation
- VDP format conversion
- BigQuery data pipelines
- JSONL generation
- Test suite development
- Validation error handling
- Data quality assurance
- Pipeline monitoring

## Reference Files
- @QUALITY_GATES_COMPLETE.md
- @scripts/validate-hook-gate.sh
- @scripts/validate-vdp-schema.sh
- @scripts/backfill-vdp-schema.sh
- @scripts/vdp-to-gold-jsonl.sh
- @scripts/test-quality-gates.sh
- @vdp.schema.json

