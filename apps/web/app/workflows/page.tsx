import WorkflowBuilder from "../../components/workflow/WorkflowBuilder";

interface WorkflowPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkflowPage({
  params,
}: WorkflowPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#05070b]">
      <WorkflowBuilder
        workflowId={id}
      />
    </main>
  );
}