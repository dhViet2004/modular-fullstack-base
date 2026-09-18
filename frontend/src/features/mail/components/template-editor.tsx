"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { MailTemplate } from "../api/mail.api";
import { useUpdateTemplate } from "../hooks/use-mail";

type Draft = {subject:string;html:string};

const renderPreview=(html:string,variables:string[])=>html.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g,(_match,key:string)=>({otp:"123456",actionUrl:"https://example.com/verify",actionLabel:"Xác thực",expiresIn:"10 phút",title:"Tiêu đề mẫu",message:"Nội dung email được tự động hợp nhất.",device:"Chrome trên Windows",ipAddress:"127.0.0.1",timestamp:new Date(0).toLocaleString("vi-VN"),supportText:"Nếu không phải bạn, hãy đổi mật khẩu ngay."}[key]??(variables.includes(key)?`[${key}]`:"")));

export function TemplateEditor({templates,loading}:{templates:MailTemplate[];loading:boolean}){
  const [selectedId,setSelectedId]=useState<MailTemplate["id"]>("otp");
  const [drafts,setDrafts]=useState<Record<string,Draft>>({});
  const update=useUpdateTemplate();
  useEffect(()=>setDrafts(current=>Object.fromEntries(templates.map(template=>[template.id,current[template.id]??{subject:template.subject,html:template.html}]))),[templates]);
  const selected=templates.find(template=>template.id===selectedId)??templates[0];
  const draft=selected?drafts[selected.id]:undefined;
  const preview=useMemo(()=>draft&&selected?renderPreview(draft.html,selected.variables):"",[draft,selected]);
  if(loading)return <div className="panel loading">Đang tải mẫu email…</div>;
  if(!selected||!draft)return <div className="panel empty">Không có mẫu email.</div>;
  const change=(value:Partial<Draft>)=>setDrafts(current=>({...current,[selected.id]:{...draft,...value}}));
  const error=axios.isAxiosError(update.error)?update.error.response?.data?.error?.message:undefined;
  return <div className="template-editor-layout"><aside className="panel template-list">{templates.map(template=><button key={template.id} className={template.id===selected.id?"active":""} onClick={()=>{setSelectedId(template.id);update.reset()}}><strong>{template.name}</strong><span>{template.description}</span>{template.customized&&<small>Đã tùy chỉnh</small>}</button>)}</aside><section className="panel"><div className="panel-head"><div><h2>{selected.name}</h2><p>Soạn HTML và chèn các biến được hỗ trợ bên dưới.</p></div></div><div className="form-panel"><label className="field"><span>Tiêu đề email</span><input className="input" maxLength={180} value={draft.subject} onChange={event=>change({subject:event.target.value})}/></label><div className="field"><span>Biến có thể sử dụng</span><div className="template-variables">{selected.variables.map(variable=><button className="badge neutral" key={variable} type="button" onClick={()=>change({html:`${draft.html}{{${variable}}}`})}>{`{{${variable}}}`}</button>)}</div></div><label className="field"><span>HTML</span><textarea className="textarea template-html" spellCheck={false} value={draft.html} onChange={event=>change({html:event.target.value})}/></label>{update.isSuccess&&<p className="success">Đã lưu mẫu. Các email tiếp theo sẽ dùng nội dung này.</p>}{update.isError&&<p className="error">{error??"Không thể lưu mẫu email."}</p>}<button className="btn" disabled={!draft.subject.trim()||!draft.html.trim()||update.isPending} onClick={()=>update.mutate({id:selected.id,...draft})}>{update.isPending?"Đang lưu…":"Lưu mẫu"}</button></div></section><section className="panel"><div className="panel-head"><div><h2>Xem trước</h2><p>Dữ liệu minh họa đã được merge vào các biến.</p></div></div><iframe className="template-live-preview" title={`Xem trước ${selected.name}`} sandbox="" srcDoc={preview}/></section></div>;
}
