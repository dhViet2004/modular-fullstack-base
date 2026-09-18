import { prisma } from "../../core/database/prisma.js";
import { ApiError } from "../../core/http/api-error.js";
import type { RenderedMail } from "./mail.types.js";

export const emailTemplateIds = ["otp", "magic-link", "security-alert"] as const;
export type EmailTemplateId = typeof emailTemplateIds[number];

type Definition = {
  id: EmailTemplateId;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: string[];
  preview: Record<string, string>;
};

export const emailTemplateDefinitions: Definition[] = [
  {id:"otp",name:"Mã OTP đăng nhập",description:"Gửi mã dùng một lần để đăng nhập.",subject:"Mã đăng nhập của bạn",variables:["title","message","otp","expiresIn"],preview:{title:"Xác thực đăng nhập",message:"Dùng mã sau để hoàn tất đăng nhập.",otp:"123456",expiresIn:"10 phút"},html:'<div style="font-family:Arial,sans-serif;color:#17213b"><h1>{{title}}</h1><p>{{message}}</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">{{otp}}</p><p>Mã hết hạn sau {{expiresIn}}.</p></div>'},
  {id:"magic-link",name:"Liên kết đăng nhập",description:"Gửi token dưới dạng liên kết xác thực qua email.",subject:"Liên kết đăng nhập của bạn",variables:["title","message","actionUrl","actionLabel","expiresIn"],preview:{title:"Đăng nhập an toàn",message:"Nhấn nút bên dưới để đăng nhập.",actionUrl:"https://example.com/verify",actionLabel:"Đăng nhập",expiresIn:"10 phút"},html:'<div style="font-family:Arial,sans-serif;color:#17213b"><h1>{{title}}</h1><p>{{message}}</p><p><a href="{{actionUrl}}" style="background:#6558f5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">{{actionLabel}}</a></p><p>Liên kết hết hạn sau {{expiresIn}}.</p></div>'},
  {id:"security-alert",name:"Cảnh báo bảo mật",description:"Thông báo thay đổi hoặc hoạt động bảo mật của tài khoản.",subject:"Cảnh báo bảo mật tài khoản",variables:["title","message","device","ipAddress","timestamp","supportText"],preview:{title:"Hoạt động bảo mật",message:"Tài khoản của bạn vừa có một hoạt động mới.",device:"Chrome trên Windows",ipAddress:"127.0.0.1",timestamp:new Date(0).toISOString(),supportText:"Nếu không phải bạn, hãy đổi mật khẩu ngay."},html:'<div style="font-family:Arial,sans-serif;color:#17213b"><h1>{{title}}</h1><p>{{message}}</p><p><strong>Thiết bị:</strong> {{device}}</p><p><strong>IP:</strong> {{ipAddress}}</p><p><strong>Thời gian:</strong> {{timestamp}}</p><p>{{supportText}}</p></div>'}
];

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]!);
const definition=(id:string)=>{const found=emailTemplateDefinitions.find(item=>item.id===id);if(!found)throw new ApiError(404,"EMAIL_TEMPLATE_NOT_FOUND","Không tìm thấy mẫu email");return found};
export const mergeTemplateValue=(value:string,input:Record<string,string|undefined>)=>value.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g,(_match,key:string)=>escapeHtml(input[key]??""));
const textFromHtml=(html:string)=>html.replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p>|<\/div>|<\/h\d>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n{3,}/g,"\n\n").trim();

export const emailTemplateService={
  async list(){const saved=await prisma.emailTemplate.findMany();const byId=new Map(saved.map(item=>[item.id,item]));return emailTemplateDefinitions.map(item=>{const custom=byId.get(item.id);const subject=custom?.subject??item.subject;const html=custom?.html??item.html;return{...item,subject,html,previewHtml:mergeTemplateValue(html,item.preview),customized:Boolean(custom),updatedAt:custom?.updatedAt??null}})},
  async save(id:string,subject:string,html:string){const item=definition(id);const used=[...html.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)].map(match=>match[1]);const invalid=used.filter(name=>!item.variables.includes(name));if(invalid.length)throw new ApiError(400,"INVALID_TEMPLATE_VARIABLE",`Biến không hợp lệ: ${[...new Set(invalid)].join(", ")}`);await prisma.emailTemplate.upsert({where:{id:item.id},create:{id:item.id,subject,html},update:{subject,html}});return this.get(item.id)},
  async get(id:EmailTemplateId){const item=definition(id);const custom=await prisma.emailTemplate.findUnique({where:{id}});return{...item,subject:custom?.subject??item.subject,html:custom?.html??item.html}},
  async render(id:EmailTemplateId,input:Record<string,string|undefined>):Promise<RenderedMail>{const item=await this.get(id);const subject=mergeTemplateValue(item.subject,input);const html=mergeTemplateValue(item.html,input);return{subject,html,text:textFromHtml(html)}}
};
