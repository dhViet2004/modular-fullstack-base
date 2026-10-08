import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "../button";
import { Card } from "../card";
import { ConfirmDialog } from "../confirm-dialog";
import { Checkbox, Switch } from "../controls";
import { InlineAlert, Progress, Skeleton, Toast } from "../feedback";
import { Input } from "../input";
import { RoleBadge } from "../role-badge";

describe("shared UI contracts", () => {
  it.each([
    "primary",
    "secondary",
    "tertiary",
    "danger",
    "ghost",
    "icon",
  ] as const)(
    "%s loading buttons disable native interaction and expose busy state",
    (variant) => {
      const html = renderToStaticMarkup(
        <Button
          variant={variant}
          aria-label="Save"
          loading
          disabled={false}
          type="submit"
        >
          Save
        </Button>,
      );
      expect(html).toContain('disabled=""');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('type="submit"');
      expect(html).toContain('aria-hidden="true"');
    },
  );

  it("buttons default to non-submit and preserve explicit disabled state", () => {
    const html = renderToStaticMarkup(<Button disabled>Save</Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("aria-busy");
  });

  it("connects native inputs to labels and external and error descriptions", () => {
    const html = renderToStaticMarkup(
      <Input
        label="Email"
        id="email"
        type="email"
        name="email"
        required
        aria-describedby="extra-help"
        hint="Help"
        error="Invalid email"
      />,
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('aria-describedby="extra-help email-description"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="email-description"');
    expect(html).toContain("Invalid email");
    expect(html).not.toContain(">Help<");
    expect(html).toContain('required=""');
  });

  it("generates distinct IDs and describes password hints without marking invalid", () => {
    const html = renderToStaticMarkup(
      <>
        <Input label="Password" type="password" hint="At least 12 characters" />
        <Input label="Email" type="email" />
      </>,
    );
    const ids = [...html.matchAll(/<input[^>]* id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain(`for="${ids[0]}"`);
    expect(html).toContain(`aria-describedby="${ids[0]}-description"`);
    expect(html).not.toContain("aria-invalid");
  });

  it("visibility toggles never submit and are disabled with their password input", () => {
    const html = renderToStaticMarkup(
      <Input label="Password" type="password" disabled />,
    );
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('type="button"');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    const hidden = renderToStaticMarkup(
      <Input label="Password" type="password" passwordVisibility={false} />,
    );
    expect(hidden).not.toContain("<button");
  });

  it("selects preserve native options, value and validation semantics", () => {
    const html = renderToStaticMarkup(
      <Input
        type="select"
        label="Role"
        id="role"
        defaultValue="member"
        error="Choose a role"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </Input>,
    );
    expect(html).toContain("<select");
    expect(html).not.toContain('type="select"');
    expect(html).toMatch(/<option(?=[^>]*value="member")(?=[^>]*selected="")/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('for="role"');
  });

  it("checkboxes and switches retain labels and native form state", () => {
    for (const Control of [Checkbox, Switch]) {
      const html = renderToStaticMarkup(
        <Control label="Enabled" name="enabled" defaultChecked disabled />,
      );
      expect(html).toContain("<label");
      expect(html).toContain("Enabled");
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('checked=""');
      expect(html).toContain('disabled=""');
    }
    expect(renderToStaticMarkup(<Switch label="Enabled" />)).toContain(
      'role="switch"',
    );
  });

  it("feedback is announced at the correct priority with a named dismiss action", () => {
    expect(
      renderToStaticMarkup(<InlineAlert variant="success">Saved</InlineAlert>),
    ).toContain('role="status"');
    expect(
      renderToStaticMarkup(<InlineAlert variant="error">Failed</InlineAlert>),
    ).toContain('role="alert"');
    const html = renderToStaticMarkup(
      <Toast onDismiss={() => {}}>Saved</Toast>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('aria-label="Dismiss notification"');
  });

  it("skeletons are decorative and indeterminate progress never claims a measured value", () => {
    expect(renderToStaticMarkup(<Skeleton />)).toContain('aria-hidden="true"');
    const html = renderToStaticMarkup(<Progress label="Uploading" />);
    expect(html).toContain('aria-label="Uploading"');
    expect(html).not.toMatch(/value=|aria-valuenow/);
  });

  it("dialogs render a named native modal with safe cancel and loading confirmation", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete file?"
        description="This cannot be undone."
        confirmLabel="Delete"
        loading
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(html).toContain("<dialog");
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("aria-labelledby=");
    expect(html).toContain("aria-describedby=");
    expect(html).toContain("Cancel");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('open=""');
  });

  it("cards and badges preserve content without adding interactive or authorization behavior", () => {
    expect(renderToStaticMarkup(<Card>Content</Card>)).toContain(
      ">Content</div>",
    );
    expect(renderToStaticMarkup(<RoleBadge role="SUPER_ADMIN" />)).toContain(
      "Si\u00eau qu\u1ea3n tr\u1ecb vi\u00ean",
    );
    expect(
      renderToStaticMarkup(<RoleBadge role="MEMBER">Member</RoleBadge>),
    ).toContain("Member");
  });
});
