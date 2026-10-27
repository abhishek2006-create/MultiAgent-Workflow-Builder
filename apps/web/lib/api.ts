
import type {
  CreateWorkflowRequest,
  DashboardOverview,
  ExecutionStatus,
  RunWorkflowRequest,
  RunWorkflowResponse,
  UpdateWorkflowRequest,
  ValidateWorkflowResponse,
  WorkflowDefinition,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionHistoryPage,
  PendingApproval,
} from "../types/workflow";
import { getApiBaseUrl } from "./api-url";

/**
 * API base URL
 *
 * Local development:
 *   NEXT_PUBLIC_API_URL=http://localhost:3001
 *
 * If the variable is not configured, requests are sent to /api.
 */
const BASE_URL = getApiBaseUrl();

export interface AiConfiguration {
  available: boolean;
  message?: string;
  defaultModel: string;
  providers: Array<{ name: string; configured: boolean; models: string[] }>;
  nodeTimeoutMs: number;
  maxOutputTokens: number;
}

/**
 * Standard API error.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Converts an unknown backend error into a readable message.
 */
function getErrorMessage(
  payload: unknown,
  status: number,
): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload
  ) {
    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (Array.isArray(message)) {
      return message
        .map((item) => String(item))
        .join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  switch (status) {
    case 400:
      return "Invalid request.";
    case 401:
      return "Authentication required.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "The request conflicts with existing data.";
    case 422:
      return "The submitted data is invalid.";
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "Internal server error.";
    case 502:
      return "Backend server is unavailable.";
    case 503:
      return "Backend service is temporarily unavailable.";
    default:
      return `Request failed with status ${status}.`;
  }
}

/**
 * Parse an API response safely.
 */
async function parseResponse(
  response: Response,
): Promise<unknown> {
  if (response.status === 204) {
    return {};
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();

    return text || null;
  } catch {
    return null;
  }
}

/**
 * Generic HTTP request helper.
 *
 * Important:
 * credentials: "include"
 *
 * This allows the browser to send the HttpOnly
 * access_token cookie created by the OAuth flow.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = `${BASE_URL}${normalizedPath}`;

  const headers = new Headers(options.headers);

  /**
   * JSON content type is only required when
   * sending a request body.
   */
  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  /**
   * Tell the backend that JSON responses are preferred.
   */
  if (!headers.has("Accept")) {
    headers.set(
      "Accept",
      "application/json",
    );
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,

      /**
       * Required for HttpOnly authentication cookies.
       */
      credentials: "include",

      /**
       * Prevent stale workflow data.
       */
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(
      [
        "Network Error: Unable to connect to the backend.",
        `URL: ${url}`,
        "Make sure the API server is running and CORS is configured correctly.",
      ].join(" "),
      0,
      error,
    );
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(
        payload,
        response.status,
      ),
      response.status,
      payload,
    );
  }

  return payload as T;
}

/**
 * Public API client.
 */
export const api = {
  ai: {
    configuration(): Promise<AiConfiguration> {
      return request("/ai/configuration");
    },
  },
  workflows: {
    /**
     * Get all workflows belonging to the
     * authenticated user's organization.
     */
    list(): Promise<Workflow[]> {
      return request<Workflow[]>(
        "/workflows",
      );
    },

    /**
     * Get one workflow.
     */
    get(id: string): Promise<Workflow> {
      return request<Workflow>(
        `/workflows/${encodeURIComponent(id)}`,
      );
    },

    /**
     * Create a new workflow.
     */
    create(
      payload: CreateWorkflowRequest,
    ): Promise<Workflow> {
      return request<Workflow>(
        "/workflows",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    import(payload: CreateWorkflowRequest): Promise<Workflow> {
      return request<Workflow>("/workflows/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    /**
     * Update an existing workflow.
     */
    update(
      id: string,
      payload: UpdateWorkflowRequest,
    ): Promise<Workflow> {
      return request<Workflow>(
        `/workflows/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },

    /**
     * Delete a workflow.
     */
    delete(
      id: string,
    ): Promise<void> {
      return request<void>(
        `/workflows/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
    },

    /**
     * Validate workflow structure.
     */
    validate(
      id: string,
    ): Promise<ValidateWorkflowResponse> {
      return request<ValidateWorkflowResponse>(
        `/workflows/${encodeURIComponent(id)}/validate`,
        {
          method: "POST",
        },
      );
    },
    validateDefinition(definition: WorkflowDefinition): Promise<ValidateWorkflowResponse> {
      return request("/workflows/validate-definition", {
        method: "POST",
        body: JSON.stringify(definition),
      });
    },

    /**
     * Start workflow execution.
     */
    run(
      id: string,
      payload: RunWorkflowRequest = {},
    ): Promise<RunWorkflowResponse> {
      return request<RunWorkflowResponse>(
        `/workflows/${encodeURIComponent(id)}/run`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    /**
     * Get execution status/result.
     */
    execution(
      workflowId: string,
      executionId: string,
    ): Promise<WorkflowExecution> {
      return request<WorkflowExecution>(
        `/workflows/${encodeURIComponent(
          workflowId,
        )}/executions/${encodeURIComponent(
          executionId,
        )}`,
      );
    },
    executions(workflowId: string, cursor?: string): Promise<WorkflowExecutionHistoryPage> {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const suffix = params.size ? `?${params.toString()}` : "";
      return request(`/workflows/${encodeURIComponent(workflowId)}/executions${suffix}`);
    },

    resolveApproval(
      executionId: string,
      approvalId: string,
      approved: boolean,
      comment?: string,
    ): Promise<{ approvalId: string; status: string; executionStatus: ExecutionStatus }> {
      return request(`/executions/${encodeURIComponent(executionId)}/approvals/${encodeURIComponent(approvalId)}/resolve`, {
        method: "POST",
        body: JSON.stringify({ approved, comment }),
      });
    },
  },
  executions: {
    cancel(executionId: string): Promise<{ id: string; status: "CANCELLED" }> {
      return request(`/executions/${encodeURIComponent(executionId)}/cancel`, {
        method: "POST",
      });
    },
    retry(executionId: string): Promise<RunWorkflowResponse & { retriedFromExecutionId: string }> {
      return request(`/executions/${encodeURIComponent(executionId)}/retry`, {
        method: "POST",
      });
    },
  },
  approvals: {
    pending(cursor?: string): Promise<{ items: PendingApproval[]; nextCursor: string | null }> {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const suffix = params.size ? `?${params.toString()}` : "";
      return request(`/approvals/pending${suffix}`);
    },
    resolve(executionId: string, approvalId: string, approved: boolean, comment?: string) {
      return request(`/executions/${encodeURIComponent(executionId)}/approvals/${encodeURIComponent(approvalId)}/resolve`, {
        method: "POST",
        body: JSON.stringify({ approved, comment }),
      });
    },
  },
  dashboard: {
    overview(): Promise<DashboardOverview> {
      return request("/dashboard/overview");
    },
  },
};

/**
 * Optional generic API helper.
 *
 * Useful for future modules such as:
 *
 * api.get(...)
 * api.post(...)
 *
 * without exposing the internal request function.
 */
export const http = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  },

  patch<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  },

  put<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  },

  delete<T>(
    path: string,
  ): Promise<T> {
    return request<T>(path, {
      method: "DELETE",
    });
  },
};

