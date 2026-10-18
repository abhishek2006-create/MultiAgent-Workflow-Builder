export interface SchedulableNode {
  id: string;
}

export interface SchedulableEdge {
  source: string;
  target: string;
}

/** Returns only nodes whose complete dependency set has reached a terminal step state. */
export function readyGraphNodes<TNode extends SchedulableNode>(
  nodes: TNode[],
  edges: SchedulableEdge[],
  processedNodeIds: ReadonlySet<string>,
  concurrencyLimit: number,
): TNode[] {
  if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1 || concurrencyLimit > 16) {
    throw new Error("Graph concurrency limit must be an integer from 1 to 16");
  }

  return nodes.filter((node) => {
    if (processedNodeIds.has(node.id)) return false;
    return edges.every((edge) => edge.target !== node.id || processedNodeIds.has(edge.source));
  }).slice(0, concurrencyLimit);
}
