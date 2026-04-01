// Cloud-only: no sync needed, just pass through children
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
