export type AppRole = "ADMIN" | "UPLOADER" | "VIEWER";

export function canUploadRecordings(role?: string | null) {
  return role === "ADMIN" || role === "UPLOADER";
}
