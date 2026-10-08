import type { ComponentProps } from "react";

export type RoleBadgeProps = ComponentProps<"span"> & {
  role: "MEMBER" | "ADMIN" | "SUPER_ADMIN";
};

const labels = {
  MEMBER: "Th\u00e0nh vi\u00ean",
  ADMIN: "Qu\u1ea3n tr\u1ecb vi\u00ean",
  SUPER_ADMIN: "Si\u00eau qu\u1ea3n tr\u1ecb vi\u00ean",
};

export function RoleBadge({
  role,
  className = "",
  children,
  ...props
}: RoleBadgeProps) {
  return (
    <span {...props} className={`ui-role-badge ${className}`}>
      {children ?? labels[role]}
    </span>
  );
}
