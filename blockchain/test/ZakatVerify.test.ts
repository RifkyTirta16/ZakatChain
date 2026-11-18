import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

const ZERO_HASH = ethers.ZeroHash;

const hashOf = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

describe("ZakatVerify", function () {
  let zakatVerify: any;
  let owner: any;
  let other: any;
  let third: any;

  beforeEach(async function () {
    [owner, other, third] = await ethers.getSigners();
    const ZakatVerify = await ethers.getContractFactory("ZakatVerify");
    zakatVerify = await ZakatVerify.deploy();
    await zakatVerify.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      expect(await zakatVerify.owner()).to.equal(owner.address);
    });

    it("reports no report for an unknown hash", async function () {
      const [exists, timestamp, revoked] = await zakatVerify.verifyReport(hashOf("unknown"));
      expect(exists).to.equal(false);
      expect(timestamp).to.equal(0n);
      expect(revoked).to.equal(false);
    });
  });

  describe("registerReport", function () {
    it("registers a report hash successfully", async function () {
      const reportHash = hashOf("test-report-content");
      await zakatVerify.registerReport(reportHash, 1);
      const [exists, timestamp, revoked] = await zakatVerify.verifyReport(reportHash);
      expect(exists).to.equal(true);
      expect(timestamp).to.be.gt(0n);
      expect(revoked).to.equal(false);
    });

    it("emits ReportRegistered with the hash, id and timestamp", async function () {
      const reportHash = hashOf("event-check");
      const tx = await zakatVerify.registerReport(reportHash, 42);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      await expect(tx)
        .to.emit(zakatVerify, "ReportRegistered")
        .withArgs(reportHash, 42n, block.timestamp);
    });

    it("stores the block timestamp", async function () {
      const reportHash = hashOf("timestamp-check");
      const tx = await zakatVerify.registerReport(reportHash, 7);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const [, timestamp] = await zakatVerify.verifyReport(reportHash);
      expect(timestamp).to.equal(block.timestamp);
    });

    it("allows distinct hashes to be registered independently", async function () {
      await zakatVerify.registerReport(hashOf("a"), 1);
      await zakatVerify.registerReport(hashOf("b"), 2);
      expect((await zakatVerify.verifyReport(hashOf("a")))[0]).to.equal(true);
      expect((await zakatVerify.verifyReport(hashOf("b")))[0]).to.equal(true);
    });

    it("rejects the zero hash", async function () {
      await expect(zakatVerify.registerReport(ZERO_HASH, 1))
        .to.be.revertedWith("Report hash must not be zero");
    });

    it("reverts when registered twice by the same caller", async function () {
      const reportHash = hashOf("duplicate-content");
      await zakatVerify.registerReport(reportHash, 1);
      await expect(zakatVerify.registerReport(reportHash, 1))
        .to.be.revertedWith("Report already registered");
    });

    it("reverts when registered twice by a different caller (duplicate report handling)", async function () {
      const reportHash = hashOf("dup-different-caller");
      await zakatVerify.connect(owner).registerReport(reportHash, 1);
      await expect(zakatVerify.connect(other).registerReport(reportHash, 2))
        .to.be.revertedWith("Report already registered");
    });

    it("does not overwrite an existing report's timestamp", async function () {
      const reportHash = hashOf("no-overwrite");
      const firstTx = await zakatVerify.registerReport(reportHash, 1);
      const firstReceipt = await firstTx.wait();
      const firstBlock = await ethers.provider.getBlock(firstReceipt.blockNumber);
      // mine another block
      await third.sendTransaction({ to: other.address, value: 1n });
      await expect(zakatVerify.registerReport(reportHash, 1))
        .to.be.revertedWith("Report already registered");
      const [, timestamp] = await zakatVerify.verifyReport(reportHash);
      expect(timestamp).to.equal(firstBlock.timestamp);
    });
  });

  describe("revokeReport", function () {
    it("lets the owner revoke a registered report", async function () {
      const reportHash = hashOf("revoke-me");
      await zakatVerify.registerReport(reportHash, 1);
      await zakatVerify.connect(owner).revokeReport(reportHash, "fraud detected");
      const [exists, , revoked] = await zakatVerify.verifyReport(reportHash);
      expect(exists).to.equal(true);
      expect(revoked).to.equal(true);
    });

    it("emits ReportRevoked with reason", async function () {
      const reportHash = hashOf("revoke-event");
      await zakatVerify.registerReport(reportHash, 1);
      await expect(zakatVerify.revokeReport(reportHash, "duplicate distribution"))
        .to.emit(zakatVerify, "ReportRevoked")
        .withArgs(reportHash, "duplicate distribution");
    });

    it("rejects a non-owner caller", async function () {
      const reportHash = hashOf("revoke-auth");
      await zakatVerify.registerReport(reportHash, 1);
      await expect(zakatVerify.connect(other).revokeReport(reportHash, "nope"))
        .to.be.revertedWith("Only owner can call this function");
    });

    it("rejects revoking an unknown report", async function () {
      await expect(zakatVerify.revokeReport(hashOf("ghost"), "reason"))
        .to.be.revertedWith("Report does not exist");
    });

    it("rejects double revocation", async function () {
      const reportHash = hashOf("double-revoke");
      await zakatVerify.registerReport(reportHash, 1);
      await zakatVerify.revokeReport(reportHash, "first");
      await expect(zakatVerify.revokeReport(reportHash, "second"))
        .to.be.revertedWith("Report already revoked");
    });

    it("cannot be undone by re-registering (revocation is sticky)", async function () {
      const reportHash = hashOf("sticky-revoke");
      await zakatVerify.registerReport(reportHash, 1);
      await zakatVerify.revokeReport(reportHash, "revoked");
      await expect(zakatVerify.registerReport(reportHash, 1))
        .to.be.revertedWith("Report already registered");
      const [, , revoked] = await zakatVerify.verifyReport(reportHash);
      expect(revoked).to.equal(true);
    });
  });

  describe("verifyReport", function () {
    it("is a view function and does not change state", async function () {
      const reportHash = hashOf("view-check");
      await zakatVerify.registerReport(reportHash, 1);
      await zakatVerify.verifyReport(reportHash);
      await zakatVerify.verifyReport(reportHash);
      const [exists] = await zakatVerify.verifyReport(reportHash);
      expect(exists).to.equal(true);
    });

    it("returns the documented tuple order (exists, timestamp, revoked)", async function () {
      const reportHash = hashOf("tuple-order");
      await zakatVerify.registerReport(reportHash, 9);
      const result = await zakatVerify.verifyReport(reportHash);
      expect(result.exists).to.equal(true);
      expect(result.timestamp).to.be.gt(0n);
      expect(result.revoked).to.equal(false);
    });
  });
});
