require("@nomicfoundation/hardhat-toolbox");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");
const {
  TASK_TEST_GET_TEST_FILES,
  TASK_NODE_SERVER_READY,
} = require("hardhat/builtin-tasks/task-names");

dotenv.config();

// Default test discovery misses .ts specs in this workspace (package type and
// loader mismatch), so the TypeScript test list is provided explicitly.
task(TASK_TEST_GET_TEST_FILES, async (_, hre) => {
  return [path.join(hre.config.paths.tests, "ZakatVerify.test.ts")];
});

// Automatically deploy ZakatVerify and replay previously confirmed hashes from
// backend SQLite whenever the local Hardhat JSON-RPC node starts/restarts.
subtask(TASK_NODE_SERVER_READY, async (args, hre, runSuper) => {
  await runSuper(args);

  const host = args.address === "0.0.0.0" || args.address === "::" ? "127.0.0.1" : args.address;
  const rpcUrl = `http://${host}:${args.port}`;
  const provider = new hre.ethers.JsonRpcProvider(rpcUrl);

  try {
    const signer = await provider.getSigner(0);
    const ZakatVerify = await hre.ethers.getContractFactory("ZakatVerify", signer);
    const contract = await ZakatVerify.deploy();
    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();
    console.log(`[AUTO-DEPLOY] ZakatVerify aktif di ${deployedAddress} (${rpcUrl})`);

    const backendDir = path.resolve(__dirname, "..", "backend");
    const backendPkg = path.join(backendDir, "package.json");
    if (fs.existsSync(backendPkg)) {
      const syncProc = spawn("npm", ["run", "sync:local-chain"], {
        cwd: backendDir,
        stdio: "inherit",
        env: {
          ...process.env,
          BLOCKCHAIN_RPC_URL: rpcUrl,
          ZAKAT_CONTRACT_ADDRESS: deployedAddress,
        },
      });
      await new Promise((resolve) => {
        syncProc.on("exit", () => resolve());
        syncProc.on("error", () => resolve());
      });
    }
  } catch (err) {
    console.error("[AUTO-DEPLOY WARNING]", err instanceof Error ? err.message : String(err));
  } finally {
    provider.destroy();
  }
});

module.exports = {
  solidity: "0.8.24",
  // TypeScript specs must be transpiled by ts-node (CJS) because Node's native
  // TS loading leaves the `import` statements untransformed.
  mocha: {
    require: ["ts-node/register/transpile-only"],
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
