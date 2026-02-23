// Re-export local-first hooks with the same API as the old DB hooks
// This ensures all existing components automatically use IndexedDB

export { useLocalOrders as useDbOrders, useLocalOrder as useDbOrder } from './useLocalOrders';
export { useCreateLocalOrder as useCreateDbOrder } from './useLocalOrders';
export { useUpdateLocalOrder as useUpdateDbOrder } from './useLocalOrders';
export { useDeleteLocalOrder as useDeleteDbOrder } from './useLocalOrders';
