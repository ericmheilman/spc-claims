/**
 * Shared TypeScript types for GDNA Lyzr Baseline
 * Used across frontend, backend, and common utilities
 */

// =============================================================================
// 🏗️ BASE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =============================================================================
// 📊 DATA MODELS (Generated from backend models)
// =============================================================================

export interface User extends BaseEntity {
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  roles: string[];
  last_login?: string;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  owner_id: string;
  status: string;
  tags: string[];
  settings: Record<string, any>;
}

export interface Document extends BaseEntity {
  title: string;
  content: string;
  content_type: string;
  project_id?: string;
  author_id: string;
  is_public: boolean;
  metadata: Record<string, any>;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee_id?: string;
  project_id?: string;
  due_date?: string;
  completed_at?: string;
}

// =============================================================================
// 🔐 AUTHENTICATION TYPES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  roles: string[];
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

// =============================================================================
// 🌐 API TYPES
// =============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'healthy' | 'unhealthy';
    response_time?: number;
    error?: string;
  }>;
  overall_health: number;
  service_ready: boolean;
  timestamp: string;
}

export interface ConfigInfo {
  environment: string;
  version: string;
  debug: boolean;
  api_version: string;
}

export interface MetricsData {
  uptime_seconds: number;
  request_count: number;
  memory_usage_percent: number;
  cpu_usage_percent: number;
  timestamp: string;
}

// =============================================================================
// 🎯 LYZR INTEGRATION TYPES
// =============================================================================

export interface LyzrAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LyzrTask {
  id: string;
  agent_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

// =============================================================================
// 🛠️ UTILITY TYPES
// =============================================================================

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  app_name: string;
  version: string;
  environment: Environment;
  api_base_url: string;
  api_version: string;
  ws_base_url: string;
  enable_dev_tools: boolean;
  enable_mock_data: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
}

export interface CreateRequest<T> {
  data: Omit<T, keyof BaseEntity>;
}

export interface UpdateRequest<T> {
  data: Partial<Omit<T, keyof BaseEntity>>;
}

export interface ListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// =============================================================================
// 🎨 UI TYPES
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: Record<string, any>;
}

// =============================================================================
// 🔄 STATE MANAGEMENT TYPES
// =============================================================================

export interface AppState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  config: AppConfig;
  health: HealthStatus | null;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toasts: ToastMessage[];
}

// =============================================================================
// 📡 WEBSOCKET TYPES
// =============================================================================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketEvent {
  event: 'connect' | 'disconnect' | 'message' | 'error';
  data?: any;
}

// =============================================================================
// 🏢 MULTI-TENANT TYPES
// =============================================================================

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface TenantContext {
  tenant: Tenant | null;
  isMultiTenant: boolean;
}

// =============================================================================
// 📊 ANALYTICS TYPES
// =============================================================================

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  user_id?: string;
  timestamp: string;
}

export interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}
