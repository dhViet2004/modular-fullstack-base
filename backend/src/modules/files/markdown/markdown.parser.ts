export const normalizeMarkdown=(input:string)=>input.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").trim()+"\n";
