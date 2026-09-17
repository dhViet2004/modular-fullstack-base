import {describe,expect,it} from "vitest";
import {sendMailSchema} from "../../src/modules/mail/schemas/send-mail.schema.js";
import {sendTemplateSchema} from "../../src/modules/mail/schemas/send-template.schema.js";

describe("mail request schemas",()=>{
  it("accepts the request body shape used by the custom mail controller",()=>{
    expect(sendMailSchema.parse({to:"recipient@example.com",subject:"Hello",message:"Test message"})).toEqual({to:"recipient@example.com",subject:"Hello",message:"Test message"});
  });

  it("accepts the request body shape used by the template controller",()=>{
    expect(sendTemplateSchema.parse({kind:"otp",to:"Recipient@Example.com"})).toEqual({kind:"otp",to:"recipient@example.com"});
  });
});
