"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";

type FieldProps = {
  label: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
};

export type InputProps = FieldProps &
  (
    | (Omit<ComponentProps<"input">, "type" | "children"> & {
        type?: "text" | "email" | "password" | "search";
        passwordVisibility?: boolean;
      })
    | (ComponentProps<"select"> & { type: "select" })
  );

export function Input({
  label,
  hint,
  error,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const description = error || hint;
  const descriptionId = `${id}-description`;
  const describedBy = [props["aria-describedby"], description && descriptionId]
    .filter(Boolean)
    .join(" ");
  const fieldAttributes = {
    id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : props["aria-invalid"],
    className: "ui-input",
  };

  let field;
  if (props.type === "select") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Omit the component discriminator from native select attributes.
    const { type: _type, ...selectProps } = props;
    field = <select {...selectProps} {...fieldAttributes} />;
  } else {
    const { type = "text", passwordVisibility = true, ...inputProps } = props;
    const canReveal = type === "password" && passwordVisibility;
    field = (
      <>
        <input
          {...inputProps}
          {...fieldAttributes}
          type={canReveal && passwordVisible ? "text" : type}
        />
        {canReveal ? (
          <button
            type="button"
            className="ui-password-toggle"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-controls={id}
            aria-pressed={passwordVisible}
            disabled={props.disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? "Hide" : "Show"}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <div className={`ui-field ${className}`}>
      <label className="ui-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="ui-input-container">{field}</div>
      {description ? (
        <p
          className="ui-field-description"
          id={descriptionId}
          data-error={!!error}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
