import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import "@/app/globals.css";
import { Button } from "../button";
import { Card } from "../card";
import { ConfirmDialog } from "../confirm-dialog";
import { Checkbox, Switch } from "../controls";
import { InlineAlert, Progress, Skeleton, Toast } from "../feedback";
import { Input } from "../input";
import { RoleBadge } from "../role-badge";

function Fixture() {
  const [actions, setActions] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [open, setOpen] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [toast, setToast] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (passwordRef.current && selectRef.current) {
      document.documentElement.dataset.ready = "true";
    }
  }, []);

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-5">
      <Card>
        <h1>Shared primitives test fixture</h1>
        <div className="flex flex-wrap gap-2">
          <RoleBadge role="MEMBER" />
          <RoleBadge role="ADMIN" />
          <RoleBadge role="SUPER_ADMIN" />
        </div>
        <output id="actions">{actions}</output>
        {(
          [
            "primary",
            "secondary",
            "tertiary",
            "danger",
            "ghost",
            "icon",
          ] as const
        ).map((variant) => (
          <div className="flex flex-wrap gap-2" key={variant}>
            <Button
              id={`button-${variant}`}
              variant={variant}
              aria-label={variant}
              onClick={() => setActions((count) => count + 1)}
            >
              {variant === "icon" ? "?" : variant}
            </Button>
            <Button
              variant={variant}
              aria-label={`${variant} disabled`}
              disabled
              onClick={() => setActions((count) => count + 1)}
            >
              {variant === "icon" ? "?" : "Disabled"}
            </Button>
            <Button
              variant={variant}
              aria-label={`${variant} loading`}
              loading
              disabled={false}
              onClick={() => setActions((count) => count + 1)}
            >
              {variant === "icon" ? "?" : "Loading"}
            </Button>
          </div>
        ))}
      </Card>
      <Card>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmits((count) => count + 1);
          }}
        >
          <Input label="Name" id="name" name="name" />
          <Input label="Email" type="email" id="email" error="Invalid email" />
          <Input
            label="Password"
            type="password"
            id="password"
            ref={passwordRef}
            defaultValue="example-password"
            hint="At least 12 characters"
          />
          <Input label="Disabled password" type="password" disabled />
          <Input label="Search" id="search" type="search" />
          <Input
            label="Role"
            id="select"
            type="select"
            defaultValue="member"
            ref={selectRef}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Input>
          <Checkbox label="Checked" id="checkbox" />
          <Checkbox label="Disabled checkbox" id="disabled-checkbox" disabled />
          <Switch
            label="Enabled"
            id="switch"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <Switch
            label="Disabled switch"
            id="disabled-switch"
            defaultChecked
            disabled
          />
          <Button id="submit" type="submit" loading={submits > 0}>
            Save
          </Button>
          <output id="submits">{submits}</output>
        </form>
      </Card>
      <Card>
        <InlineAlert variant="error">
          Failed to save. Please try again.
        </InlineAlert>
        <InlineAlert variant="success">Saved successfully.</InlineAlert>
        {toast ? (
          <Toast onDismiss={() => setToast(false)}>Saved successfully.</Toast>
        ) : null}
        <Skeleton id="skeleton" />
        <Progress label="Loading files" />
        <Button
          id="dialog-trigger"
          onClick={() => {
            setConfirmations(0);
            setOpen(true);
          }}
        >
          Open dialog
        </Button>
        <output id="confirmations">{confirmations}</output>
        <ConfirmDialog
          open={open}
          title="Confirm action?"
          description={"An example confirmation. " + "long-content".repeat(40)}
          confirmLabel="Confirm"
          confirmVariant="danger"
          loading={confirmations > 0}
          onClose={() => setOpen(false)}
          onConfirm={() => setConfirmations((count) => count + 1)}
        />
      </Card>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
