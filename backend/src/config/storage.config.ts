import { env } from "./env.js";
export const storageConfig={driver:env.STORAGE_DRIVER,localPath:env.LOCAL_STORAGE_PATH,maxBytes:env.FILE_MAX_SIZE_MB*1024*1024,retentionDays:env.FILE_ORPHAN_RETENTION_DAYS};
