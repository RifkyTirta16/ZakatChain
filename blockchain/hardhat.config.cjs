require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
const dotenv = require("dotenv");
const { TASK_TEST_GET_TEST_FILES } = require("hardhat/builtin-tasks/task-names");

dotenv.config();

// Default test discovery misses .ts specs in this workspace (package type and
// loader mismatch), so the TypeScript test list is provided explicitly.
task(TASK_TEST_GET_TEST_FILES, async (_, hre) => {
  return [path.join(hre.config.paths.tests, "ZakatVerify.test.ts")];
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
