import type { ReactNode } from 'react';
import ShellFrame from './ShellFrame';
import type { SessionUser } from '../navConfig';

interface MuzakkiShellProps {
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}

const MuzakkiShell = ({ user, onLogout, children }: MuzakkiShellProps) => (
  <ShellFrame theme="muzakki" user={user} onLogout={onLogout}>
    {children}
  </ShellFrame>
);

export default MuzakkiShell;
