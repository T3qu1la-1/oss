export interface Scan {
  id: string;
  target: string;
  scanType: string;
  status: string;
  progress: number;
  currentTask: string;
  completedAt?: Date;
  authHeaders?: Record<string, string>;
}

export interface InsertVulnerability {
  scanId: string;
  severity: string;
  title: string;
  description: string;
  category: string;
  endpoint: string;
  payload: string;
  evidence: string;
  recommendation: string;
  cve?: string;
}
