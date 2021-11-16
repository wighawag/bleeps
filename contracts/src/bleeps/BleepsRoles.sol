// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

contract BleepsRoles {
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

    /// @notice minterAdmin can update the minter. At the time being there is 576 Bleeps but there is space for extra instrument and the upper limit is 1024.
    /// could be given to the DAO later so instrument can be added, the sale of these new bleeps could benenfit the DAO too and add new members.
    address public minterAdmin;

    /// @notice address allowed to mint, allow the sale contract to be separated from the token contract that can focus on the core logic
    /// Once all 1024 potential bleeps (there could be less, at minimum there are 576 bleeps) are minted, no minter can mint anymore
    address public minter;

    /// @notice guardian has some special vetoing power to guide the direction of the DAO. It can only remove rights from the DAO. It could be used to immortalize rules. For example:
    /// The DAO governance framework is by default changeable. This means the DAO could change it so Bleeps do not provide votes anymore. To prevent that from happening, the guardian can remove the ability of the DAO to changes its governance contract.
    /// (the reason the governance is changeable by default is so that better ideas an be tried out later)
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
