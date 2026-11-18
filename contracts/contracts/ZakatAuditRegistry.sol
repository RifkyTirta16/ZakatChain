
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ZakatAuditRegistry {
    struct AuditRecord {
        string auditHash;
        uint256 timestamp;
        bool isValid;
    }

    mapping(string => AuditRecord) public registry;
    string[] public records;

    event RecordAdded(string indexed auditHash, uint256 timestamp);
    event RecordValidated(string indexed auditHash, bool status);

    function addAuditRecord(string memory _auditHash) public {
        require(bytes(registry[_auditHash].auditHash).length == 0, "Record already exists");
        
        registry[_auditHash] = AuditRecord({
            auditHash: _auditHash,
            timestamp: block.timestamp,
            isValid: false
        });
        
        records.push(_auditHash);
        emit RecordAdded(_auditHash, block.timestamp);
    }

    function validateRecord(string memory _auditHash, bool _status) public {
        require(bytes(registry[_auditHash].auditHash).length > 0, "Record does not exist");
        
        registry[_auditHash].isValid = _status;
        emit RecordValidated(_auditHash, _status);
    }

    function getRecord(string memory _auditHash) public view returns (string memory, uint256, bool) {
        AuditRecord memory record = registry[_auditHash];
        return (record.auditHash, record.timestamp, record.isValid);
    }

    function totalRecords() public view returns (uint256) {
        return records.length;
    }
}
