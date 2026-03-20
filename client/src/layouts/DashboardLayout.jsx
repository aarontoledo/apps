import React from 'react';
import { TOOL_REGISTRY } from '../tools/registry';

export const DashboardLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-slate-800 text-indigo-400">
          Dev Suite Tools
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {TOOL_REGISTRY.map((tool) => (
            <div key={tool.id} className="flex items-center gap-3 p-3 bg-indigo-600 rounded-lg cursor-pointer">
              <tool.icon size={20} />
              <span className="font-medium">{tool.name}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
};