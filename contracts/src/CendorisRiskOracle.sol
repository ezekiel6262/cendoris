// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CendorisRiskOracle is Ownable2Step {
    mapping(address => bool) public reporters;
    mapping(bytes32 => uint64) public publishedAt;
    event ReporterConfigured(address indexed reporter, bool enabled);
    event ReportPublished(bytes32 indexed reportHash, address indexed reporter);

    constructor(address admin) Ownable(admin) { reporters[admin] = true; }

    function configureReporter(address reporter, bool enabled) external onlyOwner {
        require(reporter != address(0), "zero reporter");
        reporters[reporter] = enabled;
        emit ReporterConfigured(reporter, enabled);
    }

    function publish(bytes32 reportHash) external {
        require(reporters[msg.sender] && reportHash != bytes32(0), "reporter only");
        publishedAt[reportHash] = uint64(block.timestamp);
        emit ReportPublished(reportHash, msg.sender);
    }

    function isPublished(bytes32 reportHash) external view returns (bool) { return publishedAt[reportHash] != 0; }
}
