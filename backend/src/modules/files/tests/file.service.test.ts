import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  $transaction: vi.fn(),
  findFirst: vi.fn(),
  saveFile: vi.fn(),
  removeFile: vi.fn(),
}));

vi.mock("../../../core/database/prisma.js", () => ({
  prisma: { file: mocks, $transaction: mocks.$transaction },
}));
vi.mock("../file.storage.js", () => ({
  MAX_FILES_PER_USER: 10,
  openFile: vi.fn(),
  removeFile: mocks.removeFile,
  saveFile: mocks.saveFile,
}));

import { fileService } from "../file.service.js";

describe("file update consistency", () => {
  beforeEach(() => vi.resetAllMocks());

  beforeEach(() => {
    mocks.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it("removes the replacement object when metadata creation fails", async () => {
    const oldId = "old-id";
    const newId = "new-id";
    mocks.findFirst.mockResolvedValue({
      id: oldId,
      userId: "user",
      name: "old",
      contentType: "text/markdown",
    });
    mocks.saveFile.mockResolvedValue({ id: newId, size: 3 });
    mocks.create.mockRejectedValue(new Error("database unavailable"));
    mocks.delete.mockResolvedValue({ id: oldId });
    mocks.removeFile.mockResolvedValue(undefined);

    await expect(
      fileService.update({
        userId: "user",
        id: oldId,
        source: (async function* () {})(),
        fileName: undefined,
        contentType: undefined,
      }),
    ).rejects.toThrow("database unavailable");
    expect(mocks.removeFile).toHaveBeenCalledWith("user", newId);
  });
});
