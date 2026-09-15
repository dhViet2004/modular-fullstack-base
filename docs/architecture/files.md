# Files

Logical `File` ownership controls authorization. Physical `StoredObject` rows are keyed by SHA-256 and reference-counted. Upload reuses equal content. Soft deletion decrements the reference count; a daily job removes only zero-reference objects older than the retention period.
