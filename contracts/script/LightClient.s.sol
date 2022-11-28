// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

import "forge-std/Script.sol";
import "../src/lightclient/LightClient.sol";

contract Deploy is Script {
	function run() external {
		vm.startBroadcast();
        bytes32 GENESIS_VALIDATORS_ROOT = vm.envBytes32("GENESIS_VALIDATORS_ROOT");
        uint256 GENESIS_TIME = vm.envUint("GENESIS_TIME");
        uint256 SECONDS_PER_SLOT = vm.envUint("SECONDS_PER_SLOT");
        uint256 SYNC_COMMITTEE_PERIOD = vm.envUint("SYNC_COMMITTEE_PERIOD");
        bytes32 SYNC_COMMITTEE_POSEIDON = vm.envBytes32("SYNC_COMMITTEE_POSEIDON");
        new LightClient(
            GENESIS_VALIDATORS_ROOT,
            GENESIS_TIME,
            SECONDS_PER_SLOT,
            SYNC_COMMITTEE_PERIOD,
            SYNC_COMMITTEE_POSEIDON
        );
		vm.stopBroadcast();
	}
}
