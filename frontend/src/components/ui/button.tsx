import type { ComponentProps } from "react";

export type ButtonProps = Omit<ComponentProps<"button">, "aria-busy"> & {
  loading?: boolean;
} & (
    | {
        variant?: "primary" | "secondary" | "tertiary" | "danger" | "ghost";
      }
    | { variant: "icon"; "aria-label": string }
  );

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`ui-button ${className}`}
      data-variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {variant === "icon" && loading ? null : children}
    </button>
  );
}
