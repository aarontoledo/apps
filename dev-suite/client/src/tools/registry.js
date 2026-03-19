import RedirectChecker from './redirect-checker/RedirectChecker';
import { Link2 } from 'lucide-react';

export const TOOL_REGISTRY = [
  {
    id: 'redirect-checker',
    name: 'Redirect Trace',
    icon: Link2,
    component: RedirectChecker,
    path: '/'
  }
];