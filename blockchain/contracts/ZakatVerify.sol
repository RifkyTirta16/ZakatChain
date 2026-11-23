// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ZakatVerify
/// @notice On-chain registry of zakat distribution report hashes.
/// @dev The ABI (function signatures, return tuple, and events) is intentionally
///      unchanged from the original contract so the existing backend and the
///      frontend keep working without a redeploy of any client code. The only
///      behavioural changes are the invariants documented below.
contract ZakatVerify {
    address public owner;

    struct Report {
        bool exists;
        bool revoked;
        uint256 timestamp;
    }

    mapping(bytes32 => Report) private reports;

    event ReportRegistered(bytes32 indexed reportHash, uint256 reportId, uint256 timestamp);
    event ReportRevoked(bytes32 indexed reportHash, string reason);

    constructor() {
        owner = msg.sender;
    }

    function registerReport(bytes32 reportHash, uint256 reportId) public {
        require(reportHash != bytes32(0), "Report hash must not be zero");
        require(!reports[reportHash].exists, "Report already registered");
        require(msg.sender == owner, "Only owner can call this function");
        reports[reportHash] = Report(true, false, block.timestamp);
        emit ReportRegistered(reportHash, reportId, block.timestamp);
    }

    function revokeReport(bytes32 reportHash, string memory reason) public {
        require(msg.sender == owner, "Only owner can call this function");
        require(reports[reportHash].exists, "Report does not exist");
        require(!reports[reportHash].revoked, "Report already revoked");
        // Keep `exists` true and preserve the original timestamp: revocation
        // marks the record, it must not erase it or reopen re-registration.
        reports[reportHash].revoked = true;
        emit ReportRevoked(reportHash, reason);
    }

    function verifyReport(bytes32 reportHash) public view returns (bool reportExists, uint256 timestamp, bool revoked) {
        Report storage r = reports[reportHash];
        reportExists = r.exists;
        timestamp = r.timestamp;
        revoked = r.revoked;
    }

    function exists(bytes32 reportHash) public view returns (bool) {
        return reports[reportHash].exists;
    }

    function getTimestamp(bytes32 reportHash) public view returns (uint256) {
        return reports[reportHash].timestamp;
    }

    function getRevoked(bytes32 reportHash) public view returns (bool) {
        return reports[reportHash].revoked;
    }
}
