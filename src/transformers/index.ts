/**
 * transformers/index.ts — re-exports all entity transformers.
 *
 * The transformer layer sits between the raw backend response
 * and the canonical FE types defined in src/types/.
 *
 * Pattern:
 *   BE response → transformer → FE canonical type → UI component
 *
 * Why this exists:
 *   - Different backends may use different field names (e.g. leadId vs id)
 *   - Nested objects need flattening for table columns
 *   - Dates need normalising (timestamps vs ISO strings vs custom formats)
 *   - When you swap backends, you only update the transformer, not every page
 *
 * Rule: transformers are one-way. Raw → Canonical only.
 * For write operations (create/update), do the reverse mapping in the api/ file.
 */
export { transformLead,   type RawLead   } from "./lead.transformer"
export { transformClient, type RawClient } from "./client.transformer"
export { transformMatter, type RawMatter } from "./matter.transformer"
export { transformUser,   type RawUser   } from "./user.transformer"
