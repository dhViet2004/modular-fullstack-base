"use client";

import Link from "next/link";
import axios from "axios";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert, Progress, Skeleton } from "@/components/ui/feedback";
import {
  deleteFile,
  downloadFile,
  listFiles,
  updateFile,
  uploadFile,
  type StoredFile,
} from "../api/files.api";
import { useAuth } from "@/features/auth/components/auth-provider";

type ListedFile = StoredFile & { pendingMetadata?: boolean };
type FileAction =
  | { kind: "upload"; file: File }
  | { kind: "replace"; file: File; current: StoredFile }
  | { kind: "delete"; current: StoredFile };
type Preview = { id: string; name: string; url: string; text?: string };

function size(bytes: number) {
  if (bytes < 1024) return bytes + " byte";
  const unit = bytes < 1024 * 1024 ? "KiB" : "MiB";
  return (
    (bytes / (unit === "KiB" ? 1024 : 1024 * 1024)).toLocaleString("vi-VN", {
      maximumFractionDigits: 2,
    }) +
    " " +
    unit
  );
}

function fileError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: { code?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 404) return "Không tìm thấy tệp.";
    if (error.response?.status === 403)
      return "Bạn không có quyền thực hiện thao tác này.";
    if (code === "FILE_LIMIT_REACHED")
      return "Đã đạt giới hạn 10 tệp. Xóa một tệp hoặc thay thế tệp hiện có.";
    if (code === "FILE_TOO_LARGE")
      return "Tệp vượt quá 5 MiB. Chọn tệp nhỏ hơn.";
    if (code === "EMPTY_FILE") return "Không thể tải lên tệp rỗng.";
  } else if (
    error instanceof Error &&
    (error.message === "Không thể tải lên tệp rỗng." ||
      error.message === "Tệp vượt quá 5 MiB. Chọn tệp nhỏ hơn.")
  )
    return error.message;
  return fallback;
}

function updatedAt(file: ListedFile) {
  return file.pendingMetadata
    ? "Đang cập nhật"
    : new Date(file.updatedAt).toLocaleString("vi-VN");
}

function FileSymbol() {
  // ponytail: Native SVG fallback; replace when original MEMBER icon assets are available.
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M7 3h7l5 5v13H7zM14 3v6h5M4 7H2v14h2" />
    </svg>
  );
}

export function MarkdownFileManager() {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div role="status">
        <p>Đang khôi phục phiên...</p>
        <Skeleton />
      </div>
    );
  if (!user)
    return (
      <p role="alert">
        Bạn chưa đăng nhập. <Link href="/login">Đăng nhập</Link>
      </p>
    );
  return <MyFiles key={user.id} userId={user.id} />;
}

function MyFiles({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["files", userId];
  const active = useRef(false);
  const busy = useRef(false);
  const downloadBusy = useRef(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<StoredFile | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const previewVersion = useRef(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dialog, setDialog] = useState<Exclude<
    FileAction,
    { kind: "upload" }
  > | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [readError, setReadError] = useState("");
  const query = useQuery<ListedFile[]>({
    queryKey,
    queryFn: ({ signal }) => listFiles(signal),
    retry: false,
  });
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    };
  }, []);

  function closePreview() {
    previewVersion.current++;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = null;
    setPreview(null);
    setPreviewLoading(false);
  }

  async function showPreview(
    file: Pick<StoredFile, "id" | "name" | "contentType">,
    source?: Blob,
  ) {
    const attempt = ++previewVersion.current;
    setPreviewLoading(true);
    setReadError("");
    try {
      const blob = source ?? (await downloadFile(file.id));
      const text =
        file.contentType.startsWith("text/") ||
        /\.(md|markdown)$/i.test(file.name)
          ? await blob.text()
          : undefined;
      if (!active.current || previewVersion.current !== attempt) return;
      const next = {
        id: file.id,
        name: file.name,
        url: URL.createObjectURL(blob),
        text,
      };
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
      previewRef.current = next;
      setPreview(next);
    } catch (error) {
      if (active.current && previewVersion.current === attempt)
        setReadError(
          fileError(error, "Không thể xem trước tệp. Vui lòng thử lại."),
        );
    } finally {
      if (active.current && previewVersion.current === attempt)
        setPreviewLoading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async (action: FileAction) => {
      if (action.kind === "delete") {
        await deleteFile(action.current.id);
        return null;
      }
      return action.kind === "replace"
        ? updateFile(action.current.id, action.file)
        : uploadFile(action.file);
    },
    onSuccess: async (result, action) => {
      if (!active.current) return;
      setDialog(null);
      setMessage(
        action.kind === "delete"
          ? "Đã xóa " + action.current.name
          : action.kind === "replace"
            ? "Đã thay thế " + action.current.name
            : "Đã lưu " + action.file.name,
      );
      const replacedId = action.kind === "upload" ? null : action.current.id;
      const next: ListedFile | null =
        result && action.kind !== "delete"
          ? {
              id: result.id,
              size: result.size,
              name: action.file.name.slice(0, 255),
              contentType: action.file.type || "application/octet-stream",
              updatedAt: "",
              pendingMetadata: true,
            }
          : null;
      // The response confirms the ID/size; the date stays unknown until list refresh succeeds.
      queryClient.setQueryData<ListedFile[]>(queryKey, (items) => [
        ...(next ? [next] : []),
        ...(items ?? []).filter(
          (item) => item.id !== replacedId && item.id !== next?.id,
        ),
      ]);
      if (previewRef.current?.id === replacedId) {
        if (next && action.kind === "replace")
          await showPreview(
            next,
            new Blob([action.file], { type: "application/octet-stream" }),
          );
        else closePreview();
      }
      if (active.current) void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      if (active.current && axios.isAxiosError(error))
        void queryClient.invalidateQueries({ queryKey });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const files = query.data ?? [];
  const pending = mutation.isPending;
  const full =
    files.length >= 10 ||
    (axios.isAxiosError<{ error?: { code?: string } }>(mutation.error) &&
      mutation.error.response?.data?.error?.code === "FILE_LIMIT_REACHED");
  const canUpload = Boolean(query.data) && !pending && !full;
  const selectedFile =
    mutation.variables?.kind !== "delete" ? mutation.variables?.file : null;

  function start(action: FileAction) {
    if (busy.current || !active.current) return;
    busy.current = true;
    setMessage("");
    setReadError("");
    mutation.mutate(action);
  }

  function chooseReplacement(file: StoredFile) {
    replaceTarget.current = file;
    replaceInput.current?.click();
  }

  async function download(file: StoredFile) {
    if (downloadBusy.current) return;
    downloadBusy.current = true;
    setDownloading(true);
    setReadError("");
    try {
      const blob = await downloadFile(file.id);
      if (!active.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (active.current)
        setReadError(
          fileError(error, "Không thể tải tệp xuống. Vui lòng thử lại."),
        );
    } finally {
      downloadBusy.current = false;
      if (active.current) setDownloading(false);
    }
  }

  const actions = (file: StoredFile) => (
    <FileActions
      file={file}
      disabled={pending || downloading || previewLoading}
      onDownload={() => void download(file)}
      onPreview={() => void showPreview(file)}
      onReplace={() => chooseReplacement(file)}
      onDelete={() => {
        mutation.reset();
        setDialog({ kind: "delete", current: file });
      }}
    >
      {downloading ? "Đang tải..." : "Tải xuống"}
    </FileActions>
  );

  return (
    <section className="member-view" aria-labelledby="files-title">
      <header className="member-heading">
        <h1 id="files-title">Tệp của tôi</h1>
        <p>Lưu trữ và quản lý tệp riêng của bạn.</p>
      </header>
      <input
        hidden
        ref={uploadInput}
        type="file"
        aria-label="Chọn tệp tải lên"
        disabled={!canUpload}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file && canUpload) start({ kind: "upload", file });
        }}
      />
      <input
        hidden
        ref={replaceInput}
        type="file"
        aria-label="Chọn tệp thay thế"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          const current = replaceTarget.current;
          replaceTarget.current = null;
          event.target.value = "";
          if (file && current) {
            mutation.reset();
            setDialog({ kind: "replace", current, file });
          }
        }}
      />
      {query.data && (
        <Card>
          <div className="member-file-heading">
            <div>
              <strong>{files.length}/10 tệp đã sử dụng</strong>
              <meter
                className="member-quota"
                min={0}
                max={10}
                value={Math.min(files.length, 10)}
                aria-label="Hạn mức tệp"
              />
              <p className="member-caption">
                Tệp riêng của bạn · Tối đa 10 tệp, 5 MiB/tệp
              </p>
            </div>
            <Button
              disabled={!canUpload}
              onClick={() => uploadInput.current?.click()}
            >
              Tải tệp lên
            </Button>
          </div>
          <div
            className="member-dropzone"
            data-dragging={dragging}
            aria-disabled={!canUpload}
            onDragOver={(event) => {
              event.preventDefault();
              if (canUpload) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!canUpload) return;
              if (event.dataTransfer.files.length !== 1) {
                setReadError("Chọn một tệp mỗi lần.");
                return;
              }
              start({ kind: "upload", file: event.dataTransfer.files[0] });
            }}
          >
            <FileSymbol />
            <strong>
              {full ? "Đã đạt giới hạn 10 tệp" : "Kéo thả tệp vào đây"}
            </strong>
            <p className="member-caption">
              Hoặc chọn tệp từ máy · Tối đa 5 MiB mỗi tệp
            </p>
            <Button
              variant="secondary"
              disabled={!canUpload}
              onClick={() => uploadInput.current?.click()}
            >
              Chọn tệp
            </Button>
          </div>
          <p className="member-caption">
            {full
              ? "Xóa một tệp trước khi tải tệp mới. Thay thế vẫn khả dụng."
              : "Tải lên tệp trùng tên tạo bản ghi mới, không ghi đè tệp hiện có."}
          </p>
        </Card>
      )}
      {pending && mutation.variables?.kind === "upload" && (
        <Card aria-busy="true">
          <h2>Đang tải tệp lên</h2>
          <p>
            {selectedFile?.name} · {size(selectedFile?.size ?? 0)}
          </p>
          <Progress label="Đang tải tệp lên" />
          <p role="status">
            Vui lòng chờ. Danh sách được cập nhật sau khi hoàn tất.
          </p>
        </Card>
      )}
      {mutation.isError && mutation.variables?.kind === "upload" && (
        <Card>
          <h2>Không thể tải tệp lên</h2>
          <p>{selectedFile?.name}</p>
          <InlineAlert>
            {fileError(
              mutation.error,
              "Không thể tải tệp lên. Kiểm tra kết nối và danh sách trước khi thử lại.",
            )}
          </InlineAlert>
          <Button
            variant="secondary"
            className="member-fit"
            disabled={!canUpload}
            onClick={() => uploadInput.current?.click()}
          >
            Chọn tệp khác
          </Button>
        </Card>
      )}
      {message && <InlineAlert variant="success">{message}</InlineAlert>}
      {readError && <InlineAlert>{readError}</InlineAlert>}
      {query.isPending && (
        <Card aria-busy="true">
          <p role="status">Đang tải danh sách tệp...</p>
          <Skeleton />
          <Skeleton />
        </Card>
      )}
      {query.isError && (
        <Card className={query.data ? "" : "member-empty"}>
          <InlineAlert>
            {fileError(
              query.error,
              "Không thể tải danh sách tệp. Dữ liệu chưa được cập nhật.",
            )}
          </InlineAlert>
          <Button
            className="member-fit"
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Thử lại danh sách
          </Button>
        </Card>
      )}
      {query.data && (
        <Card className={files.length ? "" : "member-empty"}>
          {files.length ? (
            <>
              <h2>Danh sách tệp</h2>
              <p className="member-muted">
                Nội dung riêng tư · Không có thư mục, nhãn hoặc lịch sử phiên
                bản
              </p>
              {query.isFetching && (
                <p role="status">Đang cập nhật danh sách...</p>
              )}
              <table className="member-table" aria-label="Danh sách tệp">
                <thead>
                  <tr>
                    <th scope="col">Tên tệp</th>
                    <th scope="col">Loại</th>
                    <th scope="col">Dung lượng</th>
                    <th scope="col">Cập nhật</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} data-file-id={file.id}>
                      <td>{file.name}</td>
                      <td>
                        {file.contentType === "application/pdf"
                          ? "PDF"
                          : file.contentType === "image/png"
                            ? "PNG"
                            : "Tệp"}
                      </td>
                      <td>{size(file.size)}</td>
                      <td>{updatedAt(file)}</td>
                      <td>{actions(file)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="member-mobile-list">
                {files.map((file) => (
                  <li key={file.id} data-file-id={file.id}>
                    <Card>
                      <strong>{file.name}</strong>
                      <p className="member-caption">
                        {size(file.size)} · {updatedAt(file)}
                      </p>
                      {actions(file)}
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <FileSymbol />
              <h2>Bạn chưa có tệp nào</h2>
              <p className="member-muted">
                Tải lên tệp đầu tiên để lưu trong không gian riêng của bạn.
              </p>
              <Button
                disabled={!canUpload}
                onClick={() => uploadInput.current?.click()}
              >
                Tải tệp lên
              </Button>
            </>
          )}
        </Card>
      )}
      {previewLoading && <p role="status">Đang tải bản xem trước...</p>}
      {preview && (
        <Card className="member-preview" data-preview-id={preview.id}>
          <div className="member-file-heading">
            <h2>Xem trước · {preview.name}</h2>
            <Button variant="secondary" onClick={closePreview}>
              Đóng
            </Button>
          </div>
          {preview.text !== undefined ? (
            <pre>{preview.text}</pre>
          ) : (
            <iframe
              title={"Xem trước " + preview.name}
              src={preview.url}
              sandbox="allow-downloads"
            />
          )}
        </Card>
      )}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.kind === "delete" ? "Xóa tệp này?" : "Thay thế tệp này?"}
        description={
          <div className="member-fields">
            <p>
              {dialog?.kind === "delete"
                ? "Tệp sẽ bị xóa. Thao tác này không thể hoàn tác."
                : "Nội dung hiện tại sẽ bị thay thế. Không có lịch sử phiên bản để khôi phục."}
            </p>
            <p>
              {dialog?.current.name} · {size(dialog?.current.size ?? 0)}
            </p>
            {dialog?.kind === "replace" && (
              <p>
                Tệp mới
                <br />
                {dialog.file.name} · {size(dialog.file.size)}
              </p>
            )}
            {mutation.isError && dialog && (
              <InlineAlert>
                {fileError(
                  mutation.error,
                  "Không thể hoàn tất thao tác. Kiểm tra danh sách và thử lại.",
                )}
              </InlineAlert>
            )}
          </div>
        }
        confirmLabel={dialog?.kind === "delete" ? "Xóa tệp" : "Thay thế tệp"}
        confirmVariant={dialog?.kind === "delete" ? "danger" : "primary"}
        cancelLabel={pending ? "Đang xử lý..." : "Hủy"}
        loading={pending}
        onClose={() => {
          if (!busy.current) setDialog(null);
        }}
        onConfirm={() => {
          if (dialog) start(dialog);
        }}
      />
    </section>
  );
}

function FileActions({
  file,
  children,
  disabled,
  onDownload,
  onPreview,
  onReplace,
  onDelete,
}: {
  file: StoredFile;
  children: React.ReactNode;
  disabled: boolean;
  onDownload: () => void;
  onPreview: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const anchor = "--file-actions-" + id.replace(/[^a-z\d_-]/gi, "");
  function close(
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    action();
  }
  return (
    <div className="member-actions member-file-actions">
      <Button variant="secondary" disabled={disabled} onClick={onDownload}>
        {children}
      </Button>
      <Button
        variant="icon"
        aria-label={"Thao tác với " + file.name}
        disabled={disabled}
        popoverTarget={id}
        style={{ anchorName: anchor }}
      >
        ...
      </Button>
      <div
        id={id}
        popover="auto"
        className="member-file-menu"
        style={{ positionAnchor: anchor }}
        role="group"
        aria-label={"Thao tác với " + file.name}
      >
        <p className="member-caption">{file.name}</p>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={(event) => close(event, onPreview)}
        >
          Xem trước
        </Button>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={(event) => close(event, onDownload)}
        >
          Tải xuống
        </Button>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={(event) => close(event, onReplace)}
        >
          Thay thế tệp
        </Button>
        <Button
          variant="danger"
          disabled={disabled}
          onClick={(event) => close(event, onDelete)}
        >
          Xóa
        </Button>
      </div>
    </div>
  );
}
