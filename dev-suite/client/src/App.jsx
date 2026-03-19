import { DashboardLayout } from './layouts/DashboardLayout';
import { TOOL_REGISTRY } from './tools/registry';

function App() {
  // For now, we just render the first tool. 
  // Later, you can add React Router here to switch components.
  const ActiveTool = TOOL_REGISTRY[0].component;

  return (
    <DashboardLayout>
      <ActiveTool />
    </DashboardLayout>
  );
}

export default App;