pragma solidity 0.8.14;
pragma experimental ABIEncoderV2;

import "../../src/lightclient/libraries/SimpleSerialize.sol";

contract LightClientMock {
    uint256 public head;
    mapping(uint256 => BeaconBlockHeader) public headers;
    mapping(uint64 => bytes32) public executionStateRoots;
    mapping(uint64 => bytes32) public stateRoots;

    function setHead(uint256 slot, BeaconBlockHeader memory header) external {
        head = slot;
        headers[slot] = header;
    }

    function setStateRoot(uint64 slot, bytes32 stateRoot) external {
        stateRoots[slot] = stateRoot;
    }

    function stateRoot(uint64 slot) external view returns (bytes32) {
        return stateRoots[slot];
    }

    function setExecutionRoot(uint64 slot, bytes32 executionRoot) external {
        executionStateRoots[slot] = executionRoot;
    }

    function executionStateRoot(uint64 slot) external view returns (bytes32) {
        return executionStateRoots[slot];
    }
}
