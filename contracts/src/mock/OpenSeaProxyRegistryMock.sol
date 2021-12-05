// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../base/WithSupportForOpenSeaProxies.sol";

contract OpenSeaProxyRegistryMock {
    mapping(address => OwnableDelegateProxy) public proxies;

    function setProxy(OwnableDelegateProxy proxy) external {
        proxies[msg.sender] = proxy;
    }
}
