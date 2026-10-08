import type { ComponentProps, ReactNode } from "react";

type ControlProps = Omit<
  ComponentProps<"input">,
  "type" | "role" | "children"
> & {
  label: ReactNode;
};

export function Checkbox({ label, className = "", ...props }: ControlProps) {
  return (
    <label className={`ui-control ${className}`}>
      <input {...props} type="checkbox" className="ui-checkbox" />
      <span>{label}</span>
    </label>
  );
}

export function Switch({ label, className = "", ...props }: ControlProps) {
  return (
    <label className={`ui-control ${className}`}>
      <input {...props} type="checkbox" role="switch" className="ui-switch" />
      <span>{label}</span>
    </label>
  );
}
