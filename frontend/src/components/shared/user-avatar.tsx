"use client";

import Image from "next/image";
import { useEffect,useState } from "react";

export function UserAvatar({name,url,size=38}:{name:string;url?:string|null;size?:number}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[url]);
  const initials=name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase();
  return <div className="avatar">{url&&!failed?<Image src={url} alt={name} width={size} height={size} sizes={`${size}px`} onError={()=>setFailed(true)}/>:initials}</div>;
}
