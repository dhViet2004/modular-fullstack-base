import axios from "axios"; export const api=axios.create({baseURL:process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api/v1",timeout:15000,withCredentials:true});
