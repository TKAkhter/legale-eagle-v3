/**
 * transformers/index.ts — barrel export for all data transformers.
 *
 * Every transformer:
 *   1. Takes raw backend data (Record<string,unknown>)
 *   2. Returns a typed, canonical FE shape
 *   3. Is called inside the api/ layer before data reaches the UI
 *
 * This means pages always receive the same shape regardless of which
 * endpoint served the data, and static mode / live mode behave identically.
 */
export * from './lead.transformer'
export * from './client.transformer'
export * from './matter.transformer'
export * from './user.transformer'
export * from './billing.transformer'
export * from './task.transformer'
export * from './timelog.transformer'
