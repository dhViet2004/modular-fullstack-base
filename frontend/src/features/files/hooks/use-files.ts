"use client";import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";import { fileKeys } from "@/lib/query/query-keys";import { filesApi } from "../api/files.api";export const useFiles=()=>useQuery({queryKey:fileKeys.all,queryFn:filesApi.list});export const useUpload=()=>{const q=useQueryClient();return useMutation({mutationFn:filesApi.upload,onSuccess:()=>q.invalidateQueries({queryKey:fileKeys.all})})};export const useDeleteFile=()=>{const q=useQueryClient();return useMutation({mutationFn:filesApi.remove,onSuccess:()=>q.invalidateQueries({queryKey:fileKeys.all})})};
export const useExportMarkdown=()=>{const q=useQueryClient();return useMutation({mutationFn:({name,content}:{name:string;content:string})=>filesApi.exportMarkdown(name,content),onSuccess:()=>q.invalidateQueries({queryKey:fileKeys.all})})};
export const useReuseFile = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) => filesApi.reuse(id, newName),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: fileKeys.all });
      q.invalidateQueries({ queryKey: ["files", "orphans"] });
    }
  });
};
export const useOrphanStats = () => useQuery({ queryKey: ["files", "orphans"], queryFn: filesApi.orphanStats });
export const useCleanupOrphans = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (force?: boolean) => filesApi.cleanupOrphans(force),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: fileKeys.all });
      q.invalidateQueries({ queryKey: ["files", "orphans"] });
    }
  });
};
