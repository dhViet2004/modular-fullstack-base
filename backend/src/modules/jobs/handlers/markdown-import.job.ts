import { normalizeMarkdown } from "../../files/markdown/markdown.parser.js"; export const markdownImportJob=async(jobs:{data:{markdown:string}}[])=>jobs.map(j=>normalizeMarkdown(j.data.markdown));
