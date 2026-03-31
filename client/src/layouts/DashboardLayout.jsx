import { TOOL_REGISTRY } from '../tools/registry';

export const DashboardLayout = ({ children, activeToolId, onToolSelect }) => {
  return (
    <div className="flex h-screen bg-gray-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800 text-indigo-400">
          Dev Suite Tools
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {TOOL_REGISTRY.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                activeToolId === tool.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <tool.icon size={20} />
              <span className="font-medium">{tool.name}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};