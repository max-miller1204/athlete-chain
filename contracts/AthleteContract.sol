// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AthleteContract
 * @dev Smart contract for managing athlete sponsorship deals
 */
contract AthleteContract is AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant ATHLETE_ROLE = keccak256("ATHLETE_ROLE");
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant TEAM_ROLE = keccak256("TEAM_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    // Contract states
    enum ContractState { 
        Draft,
        Active,
        Completed,
        Disputed,
        Terminated
    }

    // Milestone status
    enum MilestoneStatus {
        Pending,
        Completed,
        Disputed,
        Rejected
    }

    // Milestone struct
    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        MilestoneStatus status;
        string evidence; // IPFS hash of evidence
        bool paid;
    }

    // Contract struct
    struct SponsorshipContract {
        address athlete;
        address sponsor;
        string contractIPFSHash; // IPFS hash of contract document
        uint256 totalValue;
        uint256 startDate;
        uint256 endDate;
        ContractState state;
        address paymentToken; // ERC20 token address for payment, address(0) for ETH
        Milestone[] milestones;
        address[] arbitrators;
        string[] updateHistory; // IPFS hashes of updates
    }

    // Storage for all contracts
    mapping(uint256 => SponsorshipContract) public contracts;
    uint256 public contractCount;

    // Events
    event ContractCreated(uint256 indexed contractId, address athlete, address sponsor);
    event MilestoneCompleted(uint256 indexed contractId, uint256 milestoneIndex);
    event MilestoneRejected(uint256 indexed contractId, uint256 milestoneIndex, string reason);
    event ContractUpdated(uint256 indexed contractId, string newContractIPFSHash);
    event PaymentReleased(uint256 indexed contractId, uint256 milestoneIndex, uint256 amount);
    event DisputeRaised(uint256 indexed contractId, string reason);
    event DisputeResolved(uint256 indexed contractId, bool athleteFavor);
    event ContractTerminated(uint256 indexed contractId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a new sponsorship contract
     */
    function createContract(
        address athlete,
        address sponsor,
        string memory contractIPFSHash,
        uint256 totalValue,
        uint256 startDate,
        uint256 endDate,
        address paymentToken,
        address[] memory arbitrators
    ) external returns (uint256) {
        require(hasRole(ATHLETE_ROLE, athlete) || hasRole(AGENT_ROLE, msg.sender), "Unauthorized: Only athlete or agent can create");
        require(hasRole(SPONSOR_ROLE, sponsor), "Sponsor must have SPONSOR_ROLE");
        require(endDate > startDate, "End date must be after start date");
        
        uint256 contractId = contractCount++;
        SponsorshipContract storage newContract = contracts[contractId];
        
        newContract.athlete = athlete;
        newContract.sponsor = sponsor;
        newContract.contractIPFSHash = contractIPFSHash;
        newContract.totalValue = totalValue;
        newContract.startDate = startDate;
        newContract.endDate = endDate;
        newContract.state = ContractState.Draft;
        newContract.paymentToken = paymentToken;
        newContract.arbitrators = arbitrators;
        
        emit ContractCreated(contractId, athlete, sponsor);
        
        return contractId;
    }

    /**
     * @dev Add milestones to a contract
     */
    function addMilestones(
        uint256 contractId,
        string[] memory descriptions,
        uint256[] memory amounts,
        uint256[] memory deadlines
    ) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(
            msg.sender == sponsorshipContract.athlete || 
            msg.sender == sponsorshipContract.sponsor || 
            hasRole(AGENT_ROLE, msg.sender),
            "Unauthorized"
        );
        require(sponsorshipContract.state == ContractState.Draft, "Contract not in draft state");
        require(descriptions.length == amounts.length && amounts.length == deadlines.length, "Arrays length mismatch");
        
        uint256 totalMilestoneAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalMilestoneAmount += amounts[i];
            
            sponsorshipContract.milestones.push(Milestone({
                description: descriptions[i],
                amount: amounts[i],
                deadline: deadlines[i],
                status: MilestoneStatus.Pending,
                evidence: "",
                paid: false
            }));
        }
        
        require(totalMilestoneAmount == sponsorshipContract.totalValue, "Total milestone amounts must match contract value");
    }

    /**
     * @dev Activate a contract
     */
    function activateContract(uint256 contractId) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(
            msg.sender == sponsorshipContract.sponsor,
            "Only sponsor can activate contract"
        );
        require(sponsorshipContract.state == ContractState.Draft, "Contract not in draft state");
        require(sponsorshipContract.milestones.length > 0, "Contract must have milestones");
        
        // If using ERC20 token, ensure sufficient allowance
        if (sponsorshipContract.paymentToken != address(0)) {
            IERC20 token = IERC20(sponsorshipContract.paymentToken);
            require(
                token.allowance(sponsorshipContract.sponsor, address(this)) >= sponsorshipContract.totalValue,
                "Insufficient token allowance"
            );
        }
        
        sponsorshipContract.state = ContractState.Active;
    }

    /**
     * @dev Submit milestone completion
     */
    function submitMilestone(uint256 contractId, uint256 milestoneIndex, string memory evidenceIPFSHash) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(msg.sender == sponsorshipContract.athlete, "Only athlete can submit milestone");
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        require(milestoneIndex < sponsorshipContract.milestones.length, "Invalid milestone index");
        require(sponsorshipContract.milestones[milestoneIndex].status == MilestoneStatus.Pending, "Milestone not pending");
        
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        milestone.evidence = evidenceIPFSHash;
        milestone.status = MilestoneStatus.Completed;
        
        emit MilestoneCompleted(contractId, milestoneIndex);
    }

    /**
     * @dev Approve milestone and release payment
     */
    function approveMilestone(uint256 contractId, uint256 milestoneIndex) external nonReentrant {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(msg.sender == sponsorshipContract.sponsor, "Only sponsor can approve milestone");
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        require(milestoneIndex < sponsorshipContract.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        require(milestone.status == MilestoneStatus.Completed, "Milestone not completed");
        require(!milestone.paid, "Payment already released");
        
        milestone.paid = true;
        
        // Transfer payment
        if (sponsorshipContract.paymentToken == address(0)) {
            // ETH payment
            payable(sponsorshipContract.athlete).transfer(milestone.amount);
        } else {
            // ERC20 payment
            IERC20 token = IERC20(sponsorshipContract.paymentToken);
            require(
                token.transferFrom(sponsorshipContract.sponsor, sponsorshipContract.athlete, milestone.amount),
                "Token transfer failed"
            );
        }
        
        emit PaymentReleased(contractId, milestoneIndex, milestone.amount);
        
        // Check if all milestones are completed and paid
        bool allCompleted = true;
        for (uint256 i = 0; i < sponsorshipContract.milestones.length; i++) {
            if (!sponsorshipContract.milestones[i].paid) {
                allCompleted = false;
                break;
            }
        }
        
        if (allCompleted) {
            sponsorshipContract.state = ContractState.Completed;
        }
    }

    /**
     * @dev Reject milestone completion
     */
    function rejectMilestone(uint256 contractId, uint256 milestoneIndex, string memory reason) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(msg.sender == sponsorshipContract.sponsor, "Only sponsor can reject milestone");
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        require(milestoneIndex < sponsorshipContract.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        require(milestone.status == MilestoneStatus.Completed, "Milestone not completed");
        require(!milestone.paid, "Payment already released");
        
        milestone.status = MilestoneStatus.Rejected;
        
        emit MilestoneRejected(contractId, milestoneIndex, reason);
    }

    /**
     * @dev Raise dispute
     */
    function raiseDispute(uint256 contractId, string memory reason) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(
            msg.sender == sponsorshipContract.athlete || msg.sender == sponsorshipContract.sponsor,
            "Only athlete or sponsor can raise dispute"
        );
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        
        sponsorshipContract.state = ContractState.Disputed;
        
        emit DisputeRaised(contractId, reason);
    }

    /**
     * @dev Resolve dispute
     */
    function resolveDispute(uint256 contractId, bool athleteFavor) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        bool isArbitrator = false;
        for (uint256 i = 0; i < sponsorshipContract.arbitrators.length; i++) {
            if (msg.sender == sponsorshipContract.arbitrators[i]) {
                isArbitrator = true;
                break;
            }
        }
        
        require(isArbitrator || hasRole(ARBITRATOR_ROLE, msg.sender), "Only arbitrator can resolve dispute");
        require(sponsorshipContract.state == ContractState.Disputed, "Contract not disputed");
        
        if (athleteFavor) {
            sponsorshipContract.state = ContractState.Active;
        } else {
            sponsorshipContract.state = ContractState.Terminated;
        }
        
        emit DisputeResolved(contractId, athleteFavor);
    }

    /**
     * @dev Update contract document
     */
    function updateContract(uint256 contractId, string memory newContractIPFSHash) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        require(
            msg.sender == sponsorshipContract.athlete || 
            msg.sender == sponsorshipContract.sponsor || 
            hasRole(AGENT_ROLE, msg.sender),
            "Unauthorized"
        );
        
        sponsorshipContract.updateHistory.push(sponsorshipContract.contractIPFSHash);
        sponsorshipContract.contractIPFSHash = newContractIPFSHash;
        
        emit ContractUpdated(contractId, newContractIPFSHash);
    }

    /**
     * @dev Get contract details
     */
    function getContractDetails(uint256 contractId) external view returns (
        address athlete,
        address sponsor,
        string memory contractIPFSHash,
        uint256 totalValue,
        uint256 startDate,
        uint256 endDate,
        ContractState state,
        address paymentToken
    ) {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        
        return (
            sponsorshipContract.athlete,
            sponsorshipContract.sponsor,
            sponsorshipContract.contractIPFSHash,
            sponsorshipContract.totalValue,
            sponsorshipContract.startDate,
            sponsorshipContract.endDate,
            sponsorshipContract.state,
            sponsorshipContract.paymentToken
        );
    }

    /**
     * @dev Get milestone details
     */
    function getMilestoneCount(uint256 contractId) external view returns (uint256) {
        return contracts[contractId].milestones.length;
    }

    /**
     * @dev Get milestone details
     */
    function getMilestoneDetails(uint256 contractId, uint256 milestoneIndex) external view returns (
        string memory description,
        uint256 amount,
        uint256 deadline,
        MilestoneStatus status,
        string memory evidence,
        bool paid
    ) {
        Milestone storage milestone = contracts[contractId].milestones[milestoneIndex];
        
        return (
            milestone.description,
            milestone.amount,
            milestone.deadline,
            milestone.status,
            milestone.evidence,
            milestone.paid
        );
    }
} 