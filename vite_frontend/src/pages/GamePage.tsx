import WorkspacePanel from "@/components/panels/WorkspacePanel";

function GamePage() {
  // Removed unused import 'useParams'

  // If viewing a specific game, we could customize the WorkspacePanel
  // For now, we'll show the standard workspace
  return <WorkspacePanel />;
}

export default GamePage;
