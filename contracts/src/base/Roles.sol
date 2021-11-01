// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

contract Roles {
    event TokenURIAdminSet(address newTokenURIAdmin);
    event RoyaltyAdminSet(address newRoyaltyAdmin);
    event MinterAdminSet(address newMinterAdmin);
    event MinterSet(address newMinter);

    /// @notice maintainer can update the tokenURI contract, this is intended to be relinquished once the tokenURI has been heavily tested in the wild and that no modification are needed.
    address public tokenURIAdmin;

    /// @notice address allowed to set royalty parameters
    address public royaltyAdmin;

    /// @notice minterAdmin can update the minter. At the time being there is 576 Bleeps but there is space for extra instrument and the upper limit is 1024.
    /// could be given to the DAO later so instrument can be added, the sale of these instrument sound could benenfit the DAO too and add new members.
    address public minterAdmin;

    /// @notice address allowed to mint, allow the sale contract to be separated from the token contract that can focus on the core logic
    /// Once all 1024 potential bleeps (there could be less, at minimum there are 576 bleeps) are minted, no minter can mint anymore
    address public minter;

    constructor(
        address initialTokenURIAdmin,
        address initialMinterAdmin,
        address initialRoyaltyAdmin
    ) {
        tokenURIAdmin = initialTokenURIAdmin;
        royaltyAdmin = initialRoyaltyAdmin;
        minterAdmin = initialMinterAdmin;
        emit TokenURIAdminSet(initialTokenURIAdmin);
        emit RoyaltyAdminSet(initialRoyaltyAdmin);
        emit MinterAdminSet(initialMinterAdmin);
    }

    function setTokenURIAdmin(address newTokenURIAdmin) external {
        require(msg.sender == tokenURIAdmin, "NOT_AUTHORIZED");
        tokenURIAdmin = newTokenURIAdmin;
        emit TokenURIAdminSet(newTokenURIAdmin);
    }

    function setRoyaltyAdmin(address newRoyaltyAdmin) external {
        require(msg.sender == royaltyAdmin, "NOT_AUTHORIZED");
        royaltyAdmin = newRoyaltyAdmin;
        emit RoyaltyAdminSet(newRoyaltyAdmin);
    }

    function setMinterAdmin(address newMinterAdmin) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minterAdmin = newMinterAdmin;
        emit MinterAdminSet(newMinterAdmin);
    }

    function setMinter(address newMinter) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minter = newMinter;
        emit MinterSet(newMinter);
    }
}
