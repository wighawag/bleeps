// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.9;

import "./test.sol";
import "../src/Bleeps.sol";

contract BleepsTest is DSTest {
    Bleeps internal bleeps;

    function setUp() public {
        bleeps = new Bleeps(address(this));
    }

    function test_tokenURI() public {
        bytes32 data1 = 0x00080040018008002800c003801000480140058018006801c007802000000000;
        bytes32 data2 = 0x0088024009802800a802c00b803000c803400d803800e803c00f804000000000;
        string memory str = bleeps.wav(data1, data2);
        // assertEq0(abi.encodePacked("prefix_", message), bytes(savedMessage));
    }
}
