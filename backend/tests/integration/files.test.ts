import { afterAll,beforeEach,describe,expect,it } from "vitest";
import { prisma } from "../../src/core/database/prisma.js";
import { uploadService } from "../../src/modules/files/storage/upload.service.js";
import { cleanupOrphans } from "../../src/modules/files/storage/deduplicate.service.js";
import { fileRepository } from "../../src/modules/files/file.repository.js";

let ownerId:string;
beforeEach(async()=>{
  await prisma.file.deleteMany();
  await prisma.storedObject.deleteMany();
  await prisma.user.deleteMany({where:{email:"file-test@example.com"}});
  ownerId=(await prisma.user.create({data:{email:"file-test@example.com"}})).id;
});
afterAll(()=>prisma.$disconnect());

describe("file deduplication and orphan retention",()=>{
  it("reuses a stored object for equal SHA-256 content",async()=>{
    const input={ownerId,name:"one.md",mimeType:"text/markdown",buffer:Buffer.from("same")};
    const first=await uploadService.upload(input);
    const second=await uploadService.upload({...input,name:"two.md"});
    expect(second.objectId).toBe(first.objectId);
    expect((await prisma.storedObject.findUniqueOrThrow({where:{id:first.objectId}})).referenceCount).toBe(2);
  });
  it("does not delete a referenced object",async()=>{
    const file=await uploadService.upload({ownerId,name:"kept.md",mimeType:"text/markdown",buffer:Buffer.from("kept")});
    await prisma.storedObject.update({where:{id:file.objectId},data:{createdAt:new Date(0)}});
    await cleanupOrphans();
    expect(await prisma.storedObject.findUnique({where:{id:file.objectId}})).not.toBeNull();
  });
  it("retains a new orphan and cleans an old orphan",async()=>{
    const recent=await uploadService.upload({ownerId,name:"recent.md",mimeType:"text/markdown",buffer:Buffer.from("recent")});
    await fileRepository.softDelete(recent.id);
    await cleanupOrphans();
    expect(await prisma.storedObject.findUnique({where:{id:recent.objectId}})).not.toBeNull();
    await prisma.storedObject.update({where:{id:recent.objectId},data:{createdAt:new Date(0)}});
    await cleanupOrphans();
    expect(await prisma.storedObject.findUnique({where:{id:recent.objectId}})).toBeNull();
  });
});
