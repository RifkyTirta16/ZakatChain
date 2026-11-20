import ShellFrame from './ShellFrame';
import type { ShellFrameProps } from './shellTypes';

/** AMIL workspace: teal sidebar, task-queue oriented. */
const AmilShell = (props: ShellFrameProps) => <ShellFrame theme="amil" {...props} />;

export default AmilShell;
