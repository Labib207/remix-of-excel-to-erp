// Re-export local-first hooks with the same API as the old DB hooks
export { useLocalMarkerPlans as useDbMarkerPlans } from './useLocalMarkerPlans';
export { useCreateLocalMarkerPlan as useCreateDbMarkerPlan } from './useLocalMarkerPlans';
export { useDeleteLocalMarkerPlan as useDeleteDbMarkerPlan } from './useLocalMarkerPlans';
