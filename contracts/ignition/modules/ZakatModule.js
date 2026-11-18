
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules-base";

export const ZakatModule = buildModule("ZakatModule", (m) => {
  const zakatRegistry = m.contract("ZakatAuditRegistry");

  return { zakatRegistry };
});
