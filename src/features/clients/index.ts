export { clientsApi } from "./api/clients.api"
export type { Client, CreateClientDto, ClientShortInfo } from "./api/clients.types"
export { useClientsList, useClient, useCreateClient, useUpdateClient } from "./hooks/useClients"
export { clientsMockHandlers } from "./mock/clients.mock"
