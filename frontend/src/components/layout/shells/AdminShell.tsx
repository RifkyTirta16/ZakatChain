import ShellFrame from './ShellFrame';
import type { ShellFrameProps } from './shellTypes';

/** ADMIN workspace: primary-dark sidebar, full system overview. */
const AdminShell = (props: ShellFrameProps) => <ShellFrame theme="admin" {...props} />;

export default AdminShell;
