// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesComp.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockCompound.sol";

contract BleepsDAOGovernor is Governor, GovernorCompatibilityBravo, GovernorVotesComp, GovernorTimelockCompound {
    uint64 constant MIN_VOTING_DELAY = 1;
    uint64 constant MAX_VOTING_DELAY = 45818; // 1 week;

    uint64 constant MIN_VOTING_PERIOD = 19635; // 3 day;
    uint64 constant MAX_VOTING_PERIOD = 91636; // 2 weeks

    uint64 constant MIN_QUORUM = 16;
    uint64 constant MAX_QUORUM = 128;

    uint64 constant MIN_PROPOSAL_THRESHOLD = 1;
    uint64 constant MAX_PROPOSAL_THRESHOLD = 64;

    struct Config {
        uint64 votingDelay;
        uint64 votingPeriod;
        uint64 quorum;
        uint64 proposalThreshold;
    }
    Config internal _config;

    constructor(ERC20VotesComp _token, ICompoundTimelock _timelock)
        Governor("BleepsDAOGovernor")
        GovernorVotesComp(_token)
        GovernorTimelockCompound(_timelock)
    {
        _config.votingDelay = 1;
        _config.votingPeriod = 45818; // 1 week
        _config.quorum = 64; // 64 / 576 = 11.111.. % if new Bleeps are minted (max supply = 1024), this should be updated
        _config.proposalThreshold = 1;
    }

    function setConfig(
        uint64 newVotingDelay,
        uint64 newVotingPeriod,
        uint64 newQuorum,
        uint64 newProposalThreshold
    ) external onlyGovernance {
        require(newVotingDelay >= MIN_VOTING_DELAY && newVotingDelay <= MAX_VOTING_DELAY, "INVALID_VOTING_DELAY");
        _config.votingDelay = newVotingDelay;

        require(newVotingPeriod >= MIN_VOTING_PERIOD && newVotingPeriod <= MAX_VOTING_PERIOD, "INVALID_VOTING_PERIOD");
        _config.votingPeriod = newVotingPeriod;

        require(newQuorum >= MIN_QUORUM && newQuorum <= MAX_QUORUM, "INVALID_QUORUM");
        _config.quorum = newQuorum;

        require(
            newProposalThreshold >= MIN_PROPOSAL_THRESHOLD && newProposalThreshold <= MAX_PROPOSAL_THRESHOLD,
            "INVALID_PROPOSAL_THRESHOLD"
        );
        _config.proposalThreshold = newProposalThreshold;
    }

    function votingDelay() public view override returns (uint256) {
        return _config.votingDelay;
    }

    function votingPeriod() public view override returns (uint256) {
        return _config.votingPeriod;
    }

    function quorum(uint256) public view override returns (uint256) {
        return _config.quorum;
    }

    function proposalThreshold() public view override returns (uint256) {
        return _config.proposalThreshold;
    }

    // The following functions are overrides required by Solidity.

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesComp)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, IGovernor, GovernorTimelockCompound)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, GovernorCompatibilityBravo, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockCompound) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockCompound) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockCompound) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, IERC165, GovernorTimelockCompound)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
