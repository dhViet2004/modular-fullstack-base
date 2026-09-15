# Relationships

A User owns many AuthIdentities, Devices, Sessions, UserRoles, permission overrides and Files, with one PasswordCredential. Roles and Permissions are many-to-many. Many logical Files may reference one StoredObject. AuditLog optionally references its actor.
