pragma solidity 0.8.14;

import "../LightClient.sol";

interface ILightClient {
    function head() external view returns (uint64);

    function stateRoot(uint64 slot) external view returns (bytes32);

    function executionStateRoot(uint64 slot) external view returns (bytes32);
}