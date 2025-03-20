// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AthleteContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DisputeResolution
 * @dev Contract for handling disputes in athlete sponsorship contracts
 */
contract DisputeResolution is AccessControl {
    // Role definitions
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    
    // The athlete contract
    AthleteContract public athleteContract;
    
    // Dispute struct
    struct Dispute {
        uint256 contractId;
        address initiator;
        string evidenceIPFSHash;
        string reason;
        uint256 timestamp;
        bool resolved;
        bool athleteFavor;
        address[] votedArbitrators;
        mapping(address => bool) arbitratorVotes; // true for athlete favor, false for sponsor favor
        uint256 athleteVotes;
        uint256 sponsorVotes;
    }
    
    // Mapping from dispute ID to dispute
    mapping(uint256 => Dispute) public disputes;
    uint256 public disputeCount;
    
    // Mapping from contract ID to dispute ID
    mapping(uint256 => uint256) public disputeIdOf;
    
    // Events
    event DisputeCreated(uint256 indexed disputeId, uint256 indexed contractId, address initiator, string reason);
    event EvidenceSubmitted(uint256 indexed disputeId, address submitter, string evidenceIPFSHash);
    event ArbitratorVoted(uint256 indexed disputeId, address arbitrator, bool athleteFavor);
    event DisputeResolved(uint256 indexed disputeId, uint256 indexed contractId, bool athleteFavor);
    
    constructor(address _athleteContract) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        athleteContract = AthleteContract(_athleteContract);
    }
    
    /**
     * @dev Create a new dispute
     */
    function createDispute(
        uint256 contractId,
        string memory evidenceIPFSHash,
        string memory reason
    ) external returns (uint256) {
        (
            address athlete,
            address sponsor,
            ,
            ,
            ,
            ,
            AthleteContract.ContractState state,
            
        ) = athleteContract.getContractDetails(contractId);
        
        require(
            msg.sender == athlete || msg.sender == sponsor,
            "Only athlete or sponsor can create dispute"
        );
        require(state != AthleteContract.ContractState.Disputed, "Dispute already exists");
        require(state != AthleteContract.ContractState.Terminated, "Contract already terminated");
        
        // Raise dispute in athlete contract
        athleteContract.raiseDispute(contractId, reason);
        
        uint256 disputeId = disputeCount++;
        Dispute storage dispute = disputes[disputeId];
        
        dispute.contractId = contractId;
        dispute.initiator = msg.sender;
        dispute.evidenceIPFSHash = evidenceIPFSHash;
        dispute.reason = reason;
        dispute.timestamp = block.timestamp;
        dispute.resolved = false;
        
        disputeIdOf[contractId] = disputeId;
        
        emit DisputeCreated(disputeId, contractId, msg.sender, reason);
        
        return disputeId;
    }
    
    /**
     * @dev Submit evidence for a dispute
     */
    function submitEvidence(uint256 disputeId, string memory evidenceIPFSHash) external {
        Dispute storage dispute = disputes[disputeId];
        
        (
            address athlete,
            address sponsor,
            ,
            ,
            ,
            ,
            ,
            
        ) = athleteContract.getContractDetails(dispute.contractId);
        
        require(
            msg.sender == athlete || msg.sender == sponsor,
            "Only athlete or sponsor can submit evidence"
        );
        require(!dispute.resolved, "Dispute already resolved");
        
        emit EvidenceSubmitted(disputeId, msg.sender, evidenceIPFSHash);
    }
    
    /**
     * @dev Vote on a dispute
     */
    function voteOnDispute(uint256 disputeId, bool athleteFavor) external {
        require(hasRole(ARBITRATOR_ROLE, msg.sender), "Only arbitrator can vote");
        
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        
        // Check if arbitrator already voted
        for (uint256 i = 0; i < dispute.votedArbitrators.length; i++) {
            require(dispute.votedArbitrators[i] != msg.sender, "Arbitrator already voted");
        }
        
        // Record vote
        dispute.arbitratorVotes[msg.sender] = athleteFavor;
        dispute.votedArbitrators.push(msg.sender);
        
        if (athleteFavor) {
            dispute.athleteVotes++;
        } else {
            dispute.sponsorVotes++;
        }
        
        emit ArbitratorVoted(disputeId, msg.sender, athleteFavor);
        
        // Check if we have a majority
        if (dispute.athleteVotes > dispute.votedArbitrators.length / 2 || 
            dispute.sponsorVotes > dispute.votedArbitrators.length / 2) {
            resolveDispute(disputeId);
        }
    }
    
    /**
     * @dev Resolve dispute based on votes
     */
    function resolveDispute(uint256 disputeId) internal {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        
        bool athleteFavor = dispute.athleteVotes > dispute.sponsorVotes;
        dispute.resolved = true;
        dispute.athleteFavor = athleteFavor;
        
        // Resolve dispute in athlete contract
        athleteContract.resolveDispute(dispute.contractId, athleteFavor);
        
        emit DisputeResolved(disputeId, dispute.contractId, athleteFavor);
    }
    
    /**
     * @dev Force resolve a dispute by admin
     */
    function forceResolveDispute(uint256 disputeId, bool athleteFavor) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only admin can force resolve");
        
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        
        dispute.resolved = true;
        dispute.athleteFavor = athleteFavor;
        
        // Resolve dispute in athlete contract
        athleteContract.resolveDispute(dispute.contractId, athleteFavor);
        
        emit DisputeResolved(disputeId, dispute.contractId, athleteFavor);
    }
    
    /**
     * @dev Get dispute details
     */
    function getDisputeDetails(uint256 disputeId) external view returns (
        uint256 contractId,
        address initiator,
        string memory evidenceIPFSHash,
        string memory reason,
        uint256 timestamp,
        bool resolved,
        bool athleteFavor,
        uint256 athleteVotes,
        uint256 sponsorVotes,
        uint256 totalVotes
    ) {
        Dispute storage dispute = disputes[disputeId];
        
        return (
            dispute.contractId,
            dispute.initiator,
            dispute.evidenceIPFSHash,
            dispute.reason,
            dispute.timestamp,
            dispute.resolved,
            dispute.athleteFavor,
            dispute.athleteVotes,
            dispute.sponsorVotes,
            dispute.votedArbitrators.length
        );
    }
    
    /**
     * @dev Get dispute ID for a contract
     */
    function getDisputeId(uint256 contractId) external view returns (uint256) {
        return disputeIdOf[contractId];
    }
    
    /**
     * @dev Check if arbitrator has voted
     */
    function hasArbitratorVoted(uint256 disputeId, address arbitrator) external view returns (bool) {
        Dispute storage dispute = disputes[disputeId];
        
        for (uint256 i = 0; i < dispute.votedArbitrators.length; i++) {
            if (dispute.votedArbitrators[i] == arbitrator) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Get arbitrator vote
     */
    function getArbitratorVote(uint256 disputeId, address arbitrator) external view returns (bool) {
        return disputes[disputeId].arbitratorVotes[arbitrator];
    }
} 