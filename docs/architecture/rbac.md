# RBAC

Users may have multiple roles plus permission overrides. Authorization combines effective permission, maximum role rank and business policy. ADMIN cannot act on equal/higher ranks or assign SUPER_ADMIN. A user cannot self-block, and the final active SUPER_ADMIN cannot be blocked.
