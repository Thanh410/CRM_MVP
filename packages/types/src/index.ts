// ============================================================
// CRM MVP – Shared TypeScript Types
// Used by both apps/api and apps/web
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED';
export type SystemRole =
  | 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
  | 'SALES' | 'MARKETING' | 'SUPPORT' | 'STAFF';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';
export type DealStatus = 'OPEN' | 'WON' | 'LOST';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CampaignChannel = 'ZALO' | 'MESSENGER' | 'EMAIL' | 'SMS' | 'MANUAL';
export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
export type ChannelType = 'ZALO' | 'MESSENGER' | 'INSTAGRAM' | 'WHATSAPP' | 'TELEGRAM';
export type EntityType =
  | 'LEAD' | 'CONTACT' | 'COMPANY' | 'DEAL'
  | 'TASK' | 'PROJECT' | 'CAMPAIGN' | 'CONVERSATION';

// ── Pagination ────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Auth ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  orgId: string;
  org: { id: string; name: string; logo?: string; slug: string };
  dept?: { id: string; name: string };
  roles: SystemRole[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    orgId: string;
    roles: SystemRole[];
  };
}

// ── Organization ──────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  plan: string;
  createdAt: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: Department[];
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  deptId?: string;
  dept?: { id: string; name: string };
}

// ── Users ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  gender?: Gender;
  jobTitle?: string;
  status: UserStatus;
  orgId: string;
  deptId?: string;
  teamId?: string;
  dept?: { id: string; name: string };
  team?: { id: string; name: string };
  userRoles: Array<{ role: { id: string; name: SystemRole; displayName: string } }>;
  lastLoginAt?: string;
  createdAt: string;
}

// ── CRM ───────────────────────────────────────────────────────

export interface Lead {
  id: string;
  orgId: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  assignedTo?: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  orgId: string;
  fullName: string;
  email?: string;
  phone?: string;
  companyId?: string;
  company?: Pick<Company, 'id' | 'name'>;
  jobTitle?: string;
  assignedTo?: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  createdAt: string;
}

export interface Company {
  id: string;
  orgId: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  orgId: string;
  title: string;
  value: number;
  currency: string;
  status: DealStatus;
  stageId?: string;
  stage?: DealStage;
  pipelineId?: string;
  probability: number;
  closeDate?: string;
  contactId?: string;
  contact?: Pick<Contact, 'id' | 'fullName'>;
  companyId?: string;
  company?: Pick<Company, 'id' | 'name'>;
  ownerId?: string;
  owner?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  createdAt: string;
}

export interface DealStage {
  id: string;
  orgId: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string;
  probability: number;
}

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  stages: DealStage[];
}

// ── Tasks ────────────────────────────────────────────────────

export interface Task {
  id: string;
  orgId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  dueDate?: string;
  entityType?: EntityType;
  entityId?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  deptId?: string;
  ownerId?: string;
  startDate?: string;
  dueDate?: string;
  tasks?: Task[];
  createdAt: string;
}

// ── Chat ─────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  orgId: string;
  channel: ChannelType;
  externalId: string;
  status: ConversationStatus;
  assignedTo?: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  contactId?: string;
  contact?: Pick<Contact, 'id' | 'fullName'>;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content?: string;
  mediaUrl?: string;
  sentAt: string;
}

// ── Marketing ────────────────────────────────────────────────

export interface Campaign {
  id: string;
  orgId: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  sentCount: number;
  openCount: number;
  clickCount: number;
  startDate?: string;
  createdAt: string;
}

// ── RBAC ─────────────────────────────────────────────────────

export interface Role {
  id: string;
  orgId: string;
  name: SystemRole;
  displayName: string;
  rolePermissions: Array<{ permission: Permission }>;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

// ── API Error ────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
  timestamp: string;
  traceId?: string;
}
