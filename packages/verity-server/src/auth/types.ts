export interface TenantContext {
  tenant_id: string;
  api_key_id: string;
  permissions: string[];
}

export interface RequestContext {
  requestId: string;
  tenant?: TenantContext;
  startTime: number;
}
