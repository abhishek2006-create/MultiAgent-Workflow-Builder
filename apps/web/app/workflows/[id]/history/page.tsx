import ExecutionHistory from "../../../../components/workflow/ExecutionHistory";

export default async function WorkflowHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExecutionHistory workflowId={id} />;
}
