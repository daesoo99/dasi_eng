# Decision Log

## 2025-08-30: Project Structure Cleanup

### Archive Legacy Code
**Decision**: Move deprecated code to `archive/` following enterprise standards
- `functions/` → `archive/firebase_functions/` (replaced by Docker backend)
- `.firebaserc` → `archive/.firebaserc` (can regenerate with `firebase init`)
- `test_html_files/` → `archive/prototypes/` (replaced by React app)

**Context**: Firebase Functions was never deployed, Docker system handles all containerization. HTML prototypes served as early UI experiments but React app is now production-ready.

**Alternatives Considered**: Complete deletion vs archiving
**Decision**: Archive for historical reference, can delete later if needed

**Result**: Root directory cleaner, clearer separation of active vs deprecated code

### Delete Malformed Root .env File
**Decision**: Complete deletion of root `.env` file
**Context**: File contained mixed environment variables + JavaScript code, which is incorrect format. Proper env vars exist in `backend/.env` and `web_app/.env`

**Result**: Removed security risk, eliminated confusion