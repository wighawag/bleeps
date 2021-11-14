// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

interface IBleepsSale {
    function mint(uint16 id, address to) external payable;
}
