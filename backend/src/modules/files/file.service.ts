import { prisma } from "../../core/database/prisma.js";
import { ApplicationError } from "../../core/http/application-error.js";
import { MAX_FILES_PER_USER, openFile, removeFile, saveFile } from "./file.storage.js";

async function ownedFile(userId: string, id: string) {
  const file = await prisma.file.findFirst({ where: { id, userId } });
  if (!file) throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
  return file;
}

async function upload(userId: string, source: AsyncIterable<Buffer>, fileName: string | string[] | undefined) {
  const count = await prisma.file.count({ where: { userId } });
  if (count >= MAX_FILES_PER_USER)
    throw new ApplicationError(413, "FILE_LIMIT_REACHED", "User đã đạt giới hạn 10 tệp");
  const file = await saveFile(userId, source);
  await prisma.file.create({ data: {
    id: file.id, userId, name: String(fileName ?? file.id).slice(0, 255),
    size: file.size, contentType: "text/markdown",
  } });
  return file;
}

async function download(userId: string, id: string) {
  const metadata = await ownedFile(userId, id);
  const file = await openFile(userId, id);
  return { name: metadata.name, ...file };
}

async function list(userId: string) {
  return prisma.file.findMany({
    where: { userId }, orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, size: true, contentType: true, createdAt: true, updatedAt: true },
  });
}

async function update(input: { userId: string; id: string; source: AsyncIterable<Buffer>; fileName: string | string[] | undefined }) {
  const { userId, id, source, fileName } = input;
  const metadata = await ownedFile(userId, id);
  const updated = await saveFile(userId, source);
  const name = String(fileName ?? metadata.name).slice(0, 255);
  try {
    await prisma.file.create({ data: {
      id: updated.id, userId, name, size: updated.size, contentType: metadata.contentType,
    } });
  } catch (error) {
    await removeFile(userId, updated.id).catch(() => undefined);
    throw error;
  }
  await removeFile(userId, id);
  await prisma.file.delete({ where: { id } });
  return { id: updated.id, name, size: updated.size };
}

async function remove(userId: string, id: string) {
  await ownedFile(userId, id);
  await removeFile(userId, id);
  await prisma.file.delete({ where: { id } });
}

export const fileService = { upload, download, list, update, remove };
