import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/axios/client", () => ({ apiClient: client }));
import {
  deleteFile,
  downloadFile,
  listFiles,
  updateFile,
  uploadFile,
} from "../api/files.api";

beforeEach(() => {
  vi.resetAllMocks();
  client.post.mockResolvedValue({ data: { data: { id: "new-id", size: 1 } } });
  client.patch.mockResolvedValue({ data: { data: { id: "new-id", size: 1 } } });
});

describe("private file API boundary", () => {
  it.each(["upload", "replace"])(
    "rejects empty %s before sending bytes",
    async (action) => {
      const file = new File([], "empty.txt");
      await expect(
        action === "upload" ? uploadFile(file) : updateFile("old-id", file),
      ).rejects.toThrow("tệp rỗng");
      expect(client.post).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
    },
  );

  it.each(["upload", "replace"])(
    "rejects %s above 5 MiB before sending bytes",
    async (action) => {
      const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.bin");
      await expect(
        action === "upload" ? uploadFile(file) : updateFile("old-id", file),
      ).rejects.toThrow("5 MiB");
      expect(client.post).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
    },
  );

  it("accepts exactly 5 MiB with the existing binary headers", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "limit.bin");
    await uploadFile(file);
    expect(client.post).toHaveBeenCalledWith("/files", file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": "limit.bin",
        "X-File-Content-Type": "application/octet-stream",
      },
    });
  });

  it("returns the new replacement ID rather than retaining the deleted ID", async () => {
    const file = new File(["x"], "replacement.txt", { type: "text/plain" });
    await expect(updateFile("old-id", file)).resolves.toEqual({
      id: "new-id",
      size: 1,
    });
    expect(client.patch).toHaveBeenCalledWith("/files/old-id", file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": file.name,
        "X-File-Content-Type": "text/plain",
      },
    });
  });

  it("does not convert a same-name upload into a replacement", async () => {
    await uploadFile(new File(["a"], "same.txt"));
    await uploadFile(new File(["b"], "same.txt"));
    expect(client.post).toHaveBeenCalledTimes(2);
    expect(client.patch).not.toHaveBeenCalled();
  });

  it("passes cancellation through the actual array list contract", async () => {
    const signal = new AbortController().signal;
    client.get.mockResolvedValue({ data: { success: true, data: [] } });
    await expect(listFiles(signal)).resolves.toEqual([]);
    expect(client.get).toHaveBeenCalledWith("/files", { signal });
  });

  it("preserves the API's identical 404 for download, delete and replace", async () => {
    const error = {
      isAxiosError: true,
      response: { status: 404, data: { error: { code: "FILE_NOT_FOUND" } } },
    };
    client.get.mockRejectedValue(error);
    client.delete.mockRejectedValue(error);
    client.patch.mockRejectedValue(error);
    await expect(downloadFile("id")).rejects.toBe(error);
    await expect(deleteFile("id")).rejects.toBe(error);
    await expect(updateFile("id", new File(["x"], "x.txt"))).rejects.toBe(
      error,
    );
  });
});
