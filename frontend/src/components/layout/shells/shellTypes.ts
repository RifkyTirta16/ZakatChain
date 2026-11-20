import type { ReactNode } from 'react';
import type { SessionUser } from '../navConfig';

export interface ShellFrameProps {
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}
