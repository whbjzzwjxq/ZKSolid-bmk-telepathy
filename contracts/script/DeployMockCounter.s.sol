// We are using this script to deploy the AMB contracts with a mock 
// light client
// source ../../.env
// forge script DeployMockCounter.s.sol:DeployMockContract --private-key ${PRIVATE_KEY} -vvvv --broadcast
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/amb/SourceAMB.sol";
import "../src/amb/TargetAMB.sol";
import "../test/counter/Counter.sol";
import "../test/amb/LightClientMock.sol";

// The reason we can't simply deploy these contracts to Anvil, is to test the storage proofs
// against the light client, we need to deploy the contracts to a real chain where we can use
// the eth_getProof RPC (that is currently unsupported on Anvil).
contract DeployMockContract is Script {
    bytes32 mySalt = bytes32(uint256(1));

    bool USE_MOCK_LC = false; // TODO make this read from the env in the future

	function run() external {
        address[] memory LIGHT_CLIENT_ADDRESS = new address[](7);
        LIGHT_CLIENT_ADDRESS[0] = address(0x6069D09b61484Ed3339Be4755969A6fD6F43809e);
        LIGHT_CLIENT_ADDRESS[1] = address(0x536565bF53bBc9b91F3eE4fD80F542779BCaDd4C);
        LIGHT_CLIENT_ADDRESS[2] = address(0x95d4760e7E6e871b23AF7D9225F26B7E4F5E8568);
        LIGHT_CLIENT_ADDRESS[3] = address(0xb3D7F6da9753c9292D9BBAFf045b425e9Dc46A0b);
        LIGHT_CLIENT_ADDRESS[4] = address(0x6dB0a5c6f3f3ABB3b72420a536A0573eac00ECE4);
        LIGHT_CLIENT_ADDRESS[5] = address(0xb3D7F6da9753c9292D9BBAFf045b425e9Dc46A0b);
        LIGHT_CLIENT_ADDRESS[6] = address(0xaf8480F8b198B3c492F5C145f498B5Cae8C3dF69);

        string memory GOERLI_RPC_URL = "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
        uint256 goerliForkId = vm.createFork(GOERLI_RPC_URL);
        console.logUint(goerliForkId);
        vm.selectFork(goerliForkId); 

        vm.startBroadcast();
        SourceAMB sourceAMB = new SourceAMB();
        Counter sendingCounter = new Counter(sourceAMB, address(0), address(0));
        vm.stopBroadcast();

        string[] memory RPC_URLS = new string[](7);
        uint16[] memory CHAIN_IDS = new uint16[](7);
        RPC_URLS[0] = "https://polygon-mainnet.g.alchemy.com/v2/t7iQZs3ufBXziZASNU21lFJAeP4DxE-B";
        CHAIN_IDS[0] = 137; // polygon mainnet
        RPC_URLS[1] = "https://opt-mainnet.g.alchemy.com/v2/7BbvPgCkiTTiCct1aOP9hFfbY6wgCzwX";
        CHAIN_IDS[1] = 10; // optimism mainnet
        RPC_URLS[2] = "https://rpc.gnosischain.com";
        CHAIN_IDS[2] = 100; // gnosis chain
        RPC_URLS[3] = "https://alien-empty-night.arbitrum-mainnet.quiknode.pro/19aa24590b16d31995af6786dccec9f6b062ea00/";
        CHAIN_IDS[3] = 42161; // arbitrum one mainnet, sent with hop protocol
        RPC_URLS[4] = "https://tiniest-snowy-patina.bsc.quiknode.pro/4ce8ea8898f6e45a7db465ec28833df45bd7ca81/";
        CHAIN_IDS[4] = 56; // bsc mainnet
        RPC_URLS[5] = "https://rpc.ankr.com/avalanche";
        CHAIN_IDS[5] = 43114; // avalanche mainnet
        RPC_URLS[6] = "https://json-rpc.evmos.blockhunters.org";
        CHAIN_IDS[6] = 9001; // evmos mainnet

        // RPC_URLS[0] = "https://dark-clean-breeze.celo-mainnet.quiknode.pro/e0a2c757979e3f0fcac8c7f37f11fb2e6c803f67";
        // CHAIN_IDS[0] = 42220; // celo mainnet, funds obtained, has isues for some reason
        // RPC_URLS[8] = "https://www.ankr.com/rpc/fantom/";
        // CHAIN_IDS[8] = 250; // fantom mainnet


        address[] memory counterAddress = new address[](RPC_URLS.length);

        // address targetAMBAddress;
        // address targetCounterAddress;
        // constructor(SourceAMB _sourceAMB, address _counter, address _targetAMB) {
        for (uint i = 0; i < RPC_URLS.length; i++) {
            uint256 forkId = vm.createFork(RPC_URLS[i]);
            vm.selectFork(forkId);
            vm.startBroadcast();
            address lc;
            if (USE_MOCK_LC) {
                LightClientMock lightClient = new LightClientMock();
                lc = address(lightClient);
            } else {
                lc = LIGHT_CLIENT_ADDRESS[i];
            }
            // We deploy targetAMB to many chains use create2 to keep the address the same
            // TargetAMB targetAMB = new TargetAMB{salt: mySalt}(address(lightClient), address(sourceAMB));
            // Counter counter = new Counter{salt: mySalt}(sourceAMB, address(sendingCounter), address(targetAMB));
            TargetAMB targetAMB = new TargetAMB(lc, address(sourceAMB));
            Counter counter = new Counter(SourceAMB(address(0)), address(sendingCounter), address(targetAMB)); 
            vm.stopBroadcast();
            // targetAMBAddress = address(targetAMB);
            // targetCounterAddress = address(counter);
            counterAddress[i] = address(counter);
        } 

        vm.selectFork(goerliForkId);
        vm.startBroadcast();
        for (uint i = 0; i < CHAIN_IDS.length; i++) {
            sendingCounter.setOtherSideCounterMap(CHAIN_IDS[i], counterAddress[i]);
            sendingCounter.increment(CHAIN_IDS[i]);
        }
        vm.stopBroadcast();

	}
}