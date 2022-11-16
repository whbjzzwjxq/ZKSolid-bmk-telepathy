pragma solidity 0.8.14;
pragma experimental ABIEncoderV2;

import "forge-std/Vm.sol";
import "forge-std/console.sol";
import "forge-std/Test.sol";
import "../../src/lightclient/LightClient.sol";
import "../../src/lightclient/libraries/SimpleSerialize.sol";

contract LightClientTest is Test {
    LightClient lc;

    function setUp() public {
        bytes32 genesisValidatorsRoot = bytes32(
            0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb
        );
        uint256 genesisTime = 1616508000;
        uint256 secondsPerSlot = 12;
        uint256 syncCommitteePeriod = 485;
        bytes32 syncCommitteePoseidon = bytes32(
            0x0ca09e80937f6d9289d2801b0563b41ee3adbae9f50907e135c32685e953f502
        );

        lc = new LightClient(
            genesisValidatorsRoot,
            genesisTime,
            secondsPerSlot,
            syncCommitteePeriod,
            syncCommitteePoseidon
        );
        vm.warp(9999999999999);
    }

    function testStep() public {
        BeaconBlockHeader memory finalizedHeader = BeaconBlockHeader(
            3976608,
            71811,
            0xb13d8834b1620b7215c078e97e664bcc1f0a55c58995b40a82973d39e9d338be,
            0x268caa7b1c763f8cdaf048b18a8ba63d4e0000a712b06c5e2c632c1c72f3696f,
            0x8a622c2df9ed86bfb64eb113394b24567fc760e81d64f0aa78153b8fa1eec428
        );
        bytes32 finalizedHeaderRoot = SSZ.sszBeaconBlockHeader(finalizedHeader);
        bytes32 executionStateRoot = bytes32(
            0x2380c9d8c707ae03906cd435f06ff7763feca2bff421f7c035c87e7b4c1d336a
        );
        Groth16Proof memory proof;

        LightClientStep memory update = LightClientStep(
            3976690,
            411,
            finalizedHeaderRoot,
            executionStateRoot,
            proof
        );

        lc.step(update);
    }

    function testRotate() public {
         BeaconBlockHeader memory finalizedHeader = BeaconBlockHeader(
            3976544,
            198137,
            0xa753318963779bfe8bf25228087ba8e2d4a200ce2c3741e4204d0104806e1a8e,
            0x7e1521100cfd3d3593c1665a82e2c3e9950e629e15d765c23346f85ec34bc381,
            0x2ccfdd16e69cf5ac9bb8cbd85bbe0c91fcf666c448bbde3aacf14f54e36d7933
        );
        bytes32 finalizedHeaderRoot = SSZ.sszBeaconBlockHeader(finalizedHeader);
        bytes32 executionStateRoot = bytes32(
            0x2380c9d8c707ae03906cd435f06ff7763feca2bff421f7c035c87e7b4c1d336a
        );
        Groth16Proof memory proof;

        LightClientStep memory step = LightClientStep(
            3976690,
            418,
            finalizedHeaderRoot,
            executionStateRoot,
            proof
        );

        bytes32 syncCommitteeSSZ = bytes32(
            0xc1bcfd9c44c8b9fec443530f7cf06f281c6b5d2d1ede77a486eea591fe79b0b5
        );
        bytes32 syncCommitteePoseidon = bytes32(
            0x16d9a14d4bdcf16169a8f44e3412e2d0c5e0db1baa5ce6539ba33f373e0b0fbd
        );

        LightClientRotate memory update = LightClientRotate(
            step,
            syncCommitteeSSZ,
            syncCommitteePoseidon,
            proof
        );

        lc.rotate(update);
    }
}
