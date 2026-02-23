// Re-export local-first hooks with the same API as the old DB hooks
export { useLocalRequirements as useDbRequirements } from './useLocalRequirements';
export { useCreateLocalRequirement as useCreateDbRequirement } from './useLocalRequirements';
export { useCreateLocalRequirements as useCreateDbRequirements } from './useLocalRequirements';
export { useUpdateLocalRequirement as useUpdateDbRequirement } from './useLocalRequirements';
export { useDeleteLocalRequirement as useDeleteDbRequirement } from './useLocalRequirements';
export { useUpdateLocalRequestedQty as useUpdateDbRequestedQty } from './useLocalRequirements';
