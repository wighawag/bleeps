// SPDX-License-Identifier: AGPL-1.0
pragma solidity 0.8.9;

contract MinterMaintainerRoles {
    event MaintainerSet(address newMaintainer);
    event MinterAdminSet(address newMinterAdmin);
    event MinterSet(address newMinter);

    /// @notice maintainer can update the tokenURI contract, this is intended to be relinquished once the tokenURI has been heavily tested in the wild and that no modification are needed.
    address public maintainer;

    /// @notice minterAdmin can update the minter. At the time being there is 576 Bleeps but there is space for extra instrument and the upper limit is 1024.
    /// could be given to the DAO later so instrument can be added, the sale of these instrument sound could benenfit the DAO too and add new members.
    address public minterAdmin;

    /// @notice address allowed to mint, allow the sale contract to be separated from the token contract that can focus on the core logic
    /// Once all 1024 potential bleeps (there could be less, at minimum there are 576 bleeps) are minted, no minter can mint anymore
    address public minter;

    constructor(address initialMaintainer, address initialMinterAdmin) {
        maintainer = initialMaintainer;
        minterAdmin = initialMinterAdmin;
        emit MaintainerSet(initialMaintainer);
        emit MinterAdminSet(initialMinterAdmin);
    }

    function setMaintainer(address newMaintainer) external {
        require(msg.sender == maintainer, "NOT_AUTHORIZED");
        maintainer = newMaintainer;
        emit MaintainerSet(newMaintainer);
    }

    function setMinter(address newMinter) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minter = newMinter;
        emit MinterSet(newMinter);
    }

    function setMinterAdmin(address newMinterAdmin) external {
        require(msg.sender == minterAdmin, "NOT_AUTHORIZED");
        minterAdmin = newMinterAdmin;
        emit MinterAdminSet(newMinterAdmin);
    }
}
