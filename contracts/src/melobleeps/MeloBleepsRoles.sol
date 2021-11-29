// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract MeloBleepsRoles {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event TokenURIAdminSet(address newTokenURIAdmin);
    event RoyaltyAdminSet(address newRoyaltyAdmin);
    event MinterAdminSet(address newMinterAdmin);
    event GuardianSet(address newGuardian);
    event MinterSet(address newMinter);

    ///@notice the address of the current owner, that is able to execute on behalf of this contract.
    address public owner;

    /// @notice maintainer can update the tokenURI contract, this is intended to be relinquished once the tokenURI has been heavily tested in the wild and that no modification are needed.
    address public tokenURIAdmin;

    /// @notice address allowed to set royalty parameters
    address public royaltyAdmin;

    /// @notice minterAdmin can update the minter.
    /// could be given to the DAO later so new mechanism of sales for Melobleeps can be tested.
    address public minterAdmin;

    /// @notice address allowed to mint, allow the sale contract to be separated from the token contract that can focus on the core logic
    address public minter;

    /// @notice guardian has some special vetoing power to guide the direction of the DAO. It can only remove rights from the DAO. It could be used to immortalize rules.
    address public guardian;

    constructor(
        address initialOwner,
        address initialTokenURIAdmin,
        address initialMinterAdmin,
        address initialRoyaltyAdmin,
        address initialGuardian
    ) {
        owner = initialOwner;
        tokenURIAdmin = initialTokenURIAdmin;
        royaltyAdmin = initialRoyaltyAdmin;
        minterAdmin = initialMinterAdmin;
        emit TokenURIAdminSet(initialTokenURIAdmin);
        emit RoyaltyAdminSet(initialRoyaltyAdmin);
        emit MinterAdminSet(initialMinterAdmin);
    }

    /**
     * @notice Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) external {
        address oldOwner = owner;
        require(msg.sender == oldOwner);
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @notice set the new tokenURIAdmin that can change the tokenURI
     * Can only be called by the current tokenURI admin.
     */
    function setTokenURIAdmin(address newTokenURIAdmin) external {
        require(
            msg.sender == tokenURIAdmin || (msg.sender == guardian && newTokenURIAdmin == address(0)),
            "NOT_AUTHORIZED"
        );
        tokenURIAdmin = newTokenURIAdmin;
        emit TokenURIAdminSet(newTokenURIAdmin);
    }

    /**
     * @notice set the new royaltyAdmin that can change the royalties
     * Can only be called by the current royalty admin.
     */
    function setRoyaltyAdmin(address newRoyaltyAdmin) external {
        require(
            msg.sender == royaltyAdmin || (msg.sender == guardian && newRoyaltyAdmin == address(0)),
            "NOT_AUTHORIZED"
        );
        royaltyAdmin = newRoyaltyAdmin;
        emit RoyaltyAdminSet(newRoyaltyAdmin);
    }

    /**
     * @notice set the new minterAdmin that can set the minter for Bleeps
     * Can only be called by the current minter admin.
     */
    function setMinterAdmin(address newMinterAdmin) external {
        require(
            msg.sender == minterAdmin || (msg.sender == guardian && newMinterAdmin == address(0)),
            "NOT_AUTHORIZED"
        );
        minterAdmin = newMinterAdmin;
        emit MinterAdminSet(newMinterAdmin);
    }

    /**
     * @notice set the new guardian that can freeze the other admins (except owner).
     * Can only be called by the current guardian.
     */
    function setGuardian(address newGuardian) external {
        require(msg.sender == guardian, "NOT_AUTHORIZED");
        guardian = newGuardian;
        emit GuardianSet(newGuardian);
    }

    /**
     * @notice set the new minter that can mint Bleeps (up to 1024).
     * Can only be called by the minter admin.
     */
    function setMinter(address newMinter) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minter = newMinter;
        emit MinterSet(newMinter);
    }
}
