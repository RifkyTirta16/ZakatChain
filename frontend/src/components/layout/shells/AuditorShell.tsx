import ShellFrame from './ShellFrame';
import type { ShellFrameProps } from './shellTypes';

/** AUDITOR workspace: dark slate sidebar, sky accent, compact density. */
const AuditorShell = (props: ShellFrameProps) => <ShellFrame theme="auditor" {...props} />;

export default AuditorShell;
