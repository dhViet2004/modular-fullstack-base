import type { ComponentProps } from "react";

import { Button } from "./button";

type AlertProps = ComponentProps<"div"> & {
  variant?: "success" | "error";
};

export function InlineAlert({
  variant = "error",
  className = "",
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      className={`ui-alert ${className}`}
      data-variant={variant}
      role={variant === "error" ? "alert" : "status"}
      aria-atomic="true"
    />
  );
}

export function Toast({
  variant = "success",
  className = "",
  children,
  onDismiss,
  dismissLabel = "Dismiss notification",
  ...props
}: AlertProps & { onDismiss: () => void; dismissLabel?: string }) {
  return (
    <div
      {...props}
      className={`ui-toast ${className}`}
      data-variant={variant}
      role={variant === "error" ? "alert" : "status"}
      aria-atomic="true"
    >
      <div className="ui-toast-content">{children}</div>
      <Button variant="ghost" aria-label={dismissLabel} onClick={onDismiss}>
        Close
      </Button>
    </div>
  );
}

export function Skeleton({
  className = "",
  ...props
}: Omit<ComponentProps<"div">, "children">) {
  return (
    <div {...props} className={`ui-skeleton ${className}`} aria-hidden="true" />
  );
}

export function Progress({
  label,
  className = "",
  ...props
}: Omit<
  ComponentProps<"progress">,
  "value" | "max" | "children" | "aria-label"
> & {
  label: string;
}) {
  return (
    <progress
      {...props}
      className={`ui-progress ${className}`}
      aria-label={label}
    />
  );
}
