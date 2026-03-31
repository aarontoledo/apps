import { useState } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { TOOL_REGISTRY } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState(TOOL_REGISTRY[0].id);
  const activeTool = TOOL_REGISTRY.find(t => t.id === activeToolId) || TOOL_REGISTRY[0];
  const ActiveTool = activeTool.component;

  return (
    <DashboardLayout activeToolId={activeToolId} onToolSelect={setActiveToolId}>
      <ActiveTool />
    </DashboardLayout>
  );
}

export default App;