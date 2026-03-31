import RedirectChecker from './redirect-checker/RedirectChecker';
import FileDiff from './file-diff/FileDiff';
import { Link2, GitCompare } from 'lucide-react';

export const TOOL_REGISTRY = [
  {
    id: 'redirect-checker',
    name: 'Redirect Trace',
    icon: Link2,
    component: RedirectChecker,
    path: '/'
  },
  {
    id: 'file-diff',
    name: 'File Diff',
    icon: GitCompare,
    component: FileDiff,
    path: '/file-diff'
  }
];