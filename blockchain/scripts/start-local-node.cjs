const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const RPC_HOST = '127.0.0.1';
const RPC_PORT = 8545;
const cwd = path.resolve(__dirname, '..');

function checkRpcReady() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: RPC_HOST,
        port: RPC_PORT,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }));
  });
}

async function waitForRpc(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkRpcReady()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log('Starting Hardhat local node...');
  const nodeProc = spawn('npx', ['hardhat', 'node'], {
    cwd,
    stdio: 'inherit',
  });

  const shutdown = () => {
    nodeProc.kill('SIGINT');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const ready = await waitForRpc();
  if (!ready) {
    console.error('Hardhat node failed to listen on 127.0.0.1:8545 within 30s.');
    nodeProc.kill('SIGTERM');
    process.exit(1);
  }

  console.log('Node ready. Auto-deploying ZakatVerify contract to localhost...');
  const deployProc = spawn('npx', ['hardhat', 'run', 'scripts/deploy.cjs', '--network', 'localhost'], {
    cwd,
    stdio: 'inherit',
  });

  deployProc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Auto-deploy exited with code ${code}`);
    } else {
      console.log('ZakatVerify ready on localhost. Press Ctrl+C to stop the node.');
    }
  });

  nodeProc.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
