
import "@nomicfoundation/hardhat-toolbox";

/**
 * @title Hardhat config
 * @dev Configuration for ZakatChain Audit Registry
 */
export default {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.ethereum.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
