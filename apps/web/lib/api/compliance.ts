import { apiClient } from "./client";

export type ComplianceIssue = {
  id: string;
  issueKey: string;
  status: "OPEN" | "ACKNOWLEDGED" | "AUTO_FIXED";
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  details: Record<string, unknown> | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  acknowledgmentReason: string | null;
  landing: {
    id: string;
    name: string;
    publicId: string;
    geo: {
      code: string;
      name: string;
    };
  };
};

export type ComplianceIssuesResponse = {
  items: ComplianceIssue[];
  meta: {
    take: number;
    cursor: number;
    nextCursor: number | null;
  };
};

export const complianceApi = {
  async listIssues(params: {
    take?: number;
    cursor?: number;
    status?: "OPEN" | "ACKNOWLEDGED" | "AUTO_FIXED";
  }) {
    const response = await apiClient.get<ComplianceIssuesResponse>("/compliance/issues", {
      params
    });
    return response.data;
  },

  async acknowledgeIssue(input: { id: string; reason: string }) {
    const response = await apiClient.post(`/compliance/issues/${input.id}/acknowledge`, {
      reason: input.reason
    });
    return response.data;
  },

  async autoFixIssue(id: string) {
    const response = await apiClient.post(`/compliance/issues/${id}/autofix`);
    return response.data;
  }
};
