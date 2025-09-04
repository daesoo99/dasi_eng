# Data Directory

## 📋 File Status

### ✅ Available (in Git)
- `l*_meta.json` - Level metadata (small)
- `*_report.json` - Analysis reports  
- `validation_*.json` - Validation results
- `vocabulary_*.json` - Vocabulary lists

### 🚚 Externalized (Firebase Storage)
Large data files moved to Firebase Storage for better performance:

- `classified_sentences.json` (21MB) → `gs://dasi-eng.appspot.com/data/v1/classified_sentences.json`
- `extracted_sentences.json` (15MB) → `gs://dasi-eng.appspot.com/data/v1/extracted_sentences.json`  
- `unassigned_sentences.json` (11MB) → `gs://dasi-eng.appspot.com/data/v1/unassigned_sentences.json`
- `reorganization_results.json` (102KB) → `gs://dasi-eng.appspot.com/data/v1/reorganization_results.json`

### 🔧 Development Access
For local development, use the backup files in `data_backup/` directory (not committed to Git).

### 📱 Production Access  
Use `FirebaseStorageDataAdapter` to load these files dynamically.