# Archive Directory

This directory contains deprecated code and modules that are no longer used in the project.

## Structure

- `firebase_functions/` - Legacy Firebase Cloud Functions (replaced by backend/ Node.js server)
- `.firebaserc` - Firebase CLI project configuration (can be regenerated with `firebase init`)
- `prototypes/` - Early HTML/JS prototypes from development phase (Aug 12-20)

## Important Note

**These components are NO LONGER USED** in the current system. They are preserved for historical reference and potential future recovery, but should not be imported or executed.

If Firebase deployment is needed in the future, run `firebase init` to regenerate configuration.

---

Created: 2025-08-30  
Reason: Code reorganization following enterprise standards