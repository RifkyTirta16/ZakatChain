const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ZakatVerify contract...");
  const ZakatVerify = await ethers.getContractFactory("ZakatVerify");
  const zakatVerify = await ZakatVerify.deploy();
  await zakatVerify.waitForDeployment();
  console.log(`ZakatVerify deployed to: ${await zakatVerify.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
