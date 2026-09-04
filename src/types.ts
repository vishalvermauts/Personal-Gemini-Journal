export type ReflectionMode = 'reflection' | 'summary' | 'brainstorm';

export type AIStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export type AppTab = 'journal' | 'timeline' | 'insights' | 'memories' | 'privacy';

export interface Turn {
  user: string;
  model: string;
  timestamp: string;
}

export interface LocationData {
  name: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  capturedAt: string;
}

export interface StructuredInsights {
  title: string;
  summary: string;
  topics: string[];
  keyIdeas: string[];
  actionItems: string[];
  mood?: string;
}

export interface Interaction {
  id: string;
  userId: string;
  title: string;
  mode: ReflectionMode;
  prompt: string;
  response: string;
  turns: Turn[];
  insights?: StructuredInsights;
  location?: LocationData;
  aiStatus: AIStatus;
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface ExportDataPayload {
  exportDate: string;
  appName: string;
  entryCount: number;
  entries: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    mode: string;
    prompt: string;
    response: string;
    insights?: StructuredInsights;
    location?: LocationData;
    turnsCount: number;
  }>;
}
