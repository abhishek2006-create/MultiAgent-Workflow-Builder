import { WorkflowBuilder } from "../../../components/workflow/WorkflowBuilder";
export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkflowBuilder workflowId={id} />;
}
