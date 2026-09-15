import { UserDetail } from "@/features/users/components/user-detail";export default async function Page({params}:{params:Promise<{id:string}>}){return <UserDetail id={(await params).id}/>}
