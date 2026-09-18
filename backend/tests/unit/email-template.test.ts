import { describe,expect,it } from "vitest";
import { emailTemplateDefinitions,mergeTemplateValue } from "../../src/modules/mail/email-template.service.js";

describe("editable email templates",()=>{
  it("provides the three supported templates and their variables",()=>{
    expect(emailTemplateDefinitions.map(item=>item.id)).toEqual(["otp","magic-link","security-alert"]);
    expect(emailTemplateDefinitions.find(item=>item.id==="otp")?.variables).toContain("otp");
    expect(emailTemplateDefinitions.find(item=>item.id==="magic-link")?.variables).toContain("actionUrl");
  });

  it("merges values and escapes injected HTML",()=>{
    expect(mergeTemplateValue("<p>{{ message }}</p><b>{{otp}}</b>",{message:"<script>alert(1)</script>",otp:"123456"}))
      .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p><b>123456</b>");
  });
});
