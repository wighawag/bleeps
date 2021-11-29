// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IBleepsSale {
    function mint(uint16 id, address to) external payable;

    function creatorMultiMint(uint16[] calldata ids, address to) external;
}
