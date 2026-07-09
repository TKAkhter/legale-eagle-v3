export { mattersApi } from "./api/matters.api"
export type { Matter, CreateMatterDto, MatterShortInfo } from "./api/matters.types"
export { useMattersList, useMatter, useCreateMatter, useUpdateMatter, useCloseMatter } from "./hooks/useMatters"
export { mattersMockHandlers } from "./mock/matters.mock"
