"use client";

import { useCallback } from "react";

import { api } from "../lib/api";

import {
  useWorkflowStore,
} from "../stores/workflowStore";

export function useWorkflowApi() {
  const hydrate =
    useWorkflowStore(
      (state) => state.hydrate,
    );

  const setLoading =
    useWorkflowStore(
      (state) => state.setLoading,
    );

  const setSaving =
    useWorkflowStore(
      (state) => state.setSaving,
    );

  const setError =
    useWorkflowStore(
      (state) => state.setError,
    );

  const markClean =
    useWorkflowStore(
      (state) => state.markClean,
    );

  const setValidationResult =
    useWorkflowStore(
      (state) =>
        state.setValidationResult,
    );

  const setExecution =
    useWorkflowStore(
      (state) => state.setExecution,
    );

  const setExecutionDetails = useWorkflowStore((state) => state.setExecutionDetails);

  const monitorExecution = useCallback(async (workflowId: string, executionId: string) => {
    for (let attempt = 0; attempt < 720; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        const details = await api.workflows.execution(workflowId, executionId);
        setExecution(details.id, details.status);
        setExecutionDetails(details);
        if (["COMPLETED", "FAILED", "CANCELLED", "WAITING_APPROVAL"].includes(details.status)) return;
      } catch {
        return;
      }
    }
  }, [setExecution, setExecutionDetails]);

  const loadWorkflow = useCallback(
    async (workflowId: string) => {
      setLoading(true);
      setError(null);

      try {
        const workflow =
          await api.workflows.get(
            workflowId,
          );

        hydrate(workflow);

        return workflow;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load workflow.";

        setError(message);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [
      hydrate,
      setError,
      setLoading,
    ],
  );

  const saveWorkflow = useCallback(
    async () => {
      const state =
        useWorkflowStore.getState();

      setSaving(true);
      setError(null);

      try {
        const payload = {
          name: state.name,
          description: state.description,
          nodes: state.nodes,
          edges: state.edges,
        };

        let workflow;

        if (state.workflowId) {
          workflow =
            await api.workflows.update(
              state.workflowId,
              payload,
            );
        } else {
          workflow =
            await api.workflows.create(
              payload,
            );
        }

        hydrate(workflow);
        markClean();

        return workflow;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to save workflow.";

        setError(message);

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [
      hydrate,
      markClean,
      setError,
      setSaving,
    ],
  );

  const validateWorkflow =
    useCallback(async () => {
      const {
        workflowId,
      } = useWorkflowStore.getState();

      if (!workflowId) {
        throw new Error(
          "Save the workflow before validating it.",
        );
      }

      setError(null);

      try {
        const result =
          await api.workflows.validate(
            workflowId,
          );

        setValidationResult(
          result.errors.map(
            (error) => error.message,
          ),
          result.warnings.map(
            (warning) =>
              warning.message,
          ),
        );

        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Validation failed.";

        setError(message);

        throw error;
      }
    }, [
      setError,
      setValidationResult,
    ]);

  const runWorkflow =
    useCallback(async () => {
      const state =
        useWorkflowStore.getState();

      if (!state.workflowId) {
        throw new Error(
          "Save the workflow before running it.",
        );
      }

      setError(null);

      setExecution(
        null,
        "QUEUED",
      );
      setExecutionDetails(null);

      try {
        const result =
          await api.workflows.run(
            state.workflowId,
            {},
          );

        setExecution(
          result.executionId,
          result.status,
        );
        void monitorExecution(state.workflowId, result.executionId);

        return result;
      } catch (error) {
        setExecution(
          null,
          "FAILED",
        );

        const message =
          error instanceof Error
            ? error.message
            : "Unable to run workflow.";

        setError(message);

        throw error;
      }
    }, [
      setError,
      setExecution,
      setExecutionDetails,
      monitorExecution,
    ]);

  const resolveApproval = useCallback(async (approvalId: string, approved: boolean, comment?: string) => {
    const state = useWorkflowStore.getState();
    if (!state.executionId) throw new Error("No active execution to approve.");
    const result = await api.workflows.resolveApproval(state.executionId, approvalId, approved, comment);
    setExecution(state.executionId, result.executionStatus);
    if (state.workflowId && approved) void monitorExecution(state.workflowId, state.executionId);
    return result;
  }, [monitorExecution, setExecution]);

  const retryExecution = useCallback(async () => {
    const state = useWorkflowStore.getState();
    if (!state.executionId || !state.workflowId) throw new Error("No failed execution to retry.");
    const failedExecutionId = state.executionId;
    const failedExecutionDetails = state.executionDetails;
    setError(null);
    setExecution(null, "QUEUED");
    setExecutionDetails(null);
    try {
      const result = await api.executions.retry(failedExecutionId);
      setExecution(result.executionId, result.status);
      void monitorExecution(state.workflowId, result.executionId);
      return result;
    } catch (error) {
      setExecution(failedExecutionId, "FAILED");
      setExecutionDetails(failedExecutionDetails);
      const message = error instanceof Error ? error.message : "Unable to retry execution.";
      setError(message);
      throw error;
    }
  }, [monitorExecution, setError, setExecution, setExecutionDetails]);

  return {
    loadWorkflow,
    saveWorkflow,
    validateWorkflow,
    runWorkflow,
    resolveApproval,
    retryExecution,
  };
}
