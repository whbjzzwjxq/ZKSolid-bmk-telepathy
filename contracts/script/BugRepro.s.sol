// forge script Repo.s.sol --private-key ${PRIVATE_KEY} -vvvv --broadcast --tc Deploy2
// CREATE2 Deployer not present on this chain. [0x4e59b44847b379578588920ca78fbf26c0b4956c]
// TODO: delete this when this issue is closed: https://github.com/foundry-rs/foundry/issues/3708
// This is a small script for Foundry bug reproduction
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract SampleContract {
    uint256 public test;

    constructor() {
        test = 1;
    }
}

contract Deploy2 is Script {
    bytes32 mySalt = bytes32(uint256(1));

	function run() external {

        string memory RPC_URL = "https://mainnet.optimism.io";
        uint256 forkId = vm.createSelectFork(RPC_URL);

        vm.startBroadcast();
        SampleContract sample = new SampleContract{salt: mySalt}();
        vm.stopBroadcast();

	}
}