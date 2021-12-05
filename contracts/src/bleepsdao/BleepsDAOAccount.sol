// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract BleepsDAOAccount is TimelockController {
    /// @notice role that is able to immortalise the set of proposers and executors, cannot do anything else
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @notice role that belongs to no-one, used to prevent changes without the need to keep track of admins for other roles, just set all admin roles to VOID_ROLE
    bytes32 public constant VOID_ROLE = keccak256("VOID_ROLE");

    bool public immortalized;

    constructor(uint256 minDelay, address guardian) TimelockController(minDelay, new address[](0), new address[](0)) {
        _setupRole(EXECUTOR_ROLE, address(0)); // open executor
        _setRoleAdmin(VOID_ROLE, VOID_ROLE);
        _setRoleAdmin(GUARDIAN_ROLE, GUARDIAN_ROLE);
        _setupRole(GUARDIAN_ROLE, guardian);
    }

    function immortalizeGovernance() external onlyRole(GUARDIAN_ROLE) {
        _setRoleAdmin(TIMELOCK_ADMIN_ROLE, VOID_ROLE); // technically not necessary, but useful to detect more easily
        _setRoleAdmin(PROPOSER_ROLE, VOID_ROLE);
        _setRoleAdmin(EXECUTOR_ROLE, VOID_ROLE);
        immortalized = true;
    }

    function renounceRole(bytes32 role, address account) public virtual override {
        require(!immortalized, "Governance is immortalized");
        super.renounceRole(role, account);
    }

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;

    function onERC721Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function onERC1155Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC1155_BATCH_RECEIVED;
    }
}
