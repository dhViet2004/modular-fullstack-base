import { prisma } from "./prisma.js";
export const transaction=<T>(fn:(tx:Parameters<Parameters<typeof prisma.$transaction>[0]>[0])=>Promise<T>)=>prisma.$transaction(fn);
