// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AthleteContract
 * @dev Smart contract for managing athlete sponsorship deals
 */
contract AthleteContract is ReentrancyGuard {
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
        require(endDate > startDate, "End date must be after start date");
        require(athlete != address(0) && sponsor != address(0), "Invalid addresses");
        
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
            msg.sender == sponsorshipContract.sponsor,
            "Only athlete or sponsor can modify"
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
    function getMilestoneDetails(uint256 contractId, uint256 milestoneIndex) external view returns (
        string memory description,
        uint256 amount,
        uint256 deadline,
        MilestoneStatus status,
        string memory evidence,
        bool paid
    ) {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        return (
            milestone.description,
            milestone.amount,
            milestone.deadline,
            milestone.status,
            milestone.evidence,
            milestone.paid
        );
    }

    /**
     * @dev Get number of milestones for a contract
     */
    function getMilestonesCount(uint256 contractId) external view returns (uint256) {
        return contracts[contractId].milestones.length;
    }

    /**
     * @dev Activate contract
     */
    function activateContract(uint256 contractId) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        require(
            msg.sender == sponsorshipContract.athlete || 
            msg.sender == sponsorshipContract.sponsor,
            "Only athlete or sponsor can activate"
        );
        require(sponsorshipContract.state == ContractState.Draft, "Contract not in draft state");
        require(sponsorshipContract.milestones.length > 0, "No milestones defined");
        
        sponsorshipContract.state = ContractState.Active;
    }

    /**
     * @dev Complete milestone
     */
    function completeMilestone(uint256 contractId, uint256 milestoneIndex, string memory evidence) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        require(msg.sender == sponsorshipContract.athlete, "Only athlete can complete milestone");
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        require(milestone.status == MilestoneStatus.Pending, "Invalid milestone status");
        
        milestone.status = MilestoneStatus.Completed;
        milestone.evidence = evidence;
        
        emit MilestoneCompleted(contractId, milestoneIndex);
    }

    /**
     * @dev Release payment for milestone
     */
    function releaseMilestonePayment(uint256 contractId, uint256 milestoneIndex) external payable nonReentrant {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        require(msg.sender == sponsorshipContract.sponsor, "Only sponsor can release payment");
        require(sponsorshipContract.state == ContractState.Active, "Contract not active");
        
        Milestone storage milestone = sponsorshipContract.milestones[milestoneIndex];
        require(milestone.status == MilestoneStatus.Completed, "Milestone not completed");
        require(!milestone.paid, "Payment already released");
        
        uint256 amount = milestone.amount;
        
        if (sponsorshipContract.paymentToken == address(0)) {
            // ETH payment
            require(msg.value == amount, "Incorrect payment amount");
            (bool success, ) = sponsorshipContract.athlete.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 payment
            IERC20 token = IERC20(sponsorshipContract.paymentToken);
            require(
                token.transferFrom(msg.sender, sponsorshipContract.athlete, amount),
                "Token transfer failed"
            );
        }
        
        milestone.paid = true;
        emit PaymentReleased(contractId, milestoneIndex, amount);
    }

    /**
     * @dev Raise dispute
     */
    function raiseDispute(uint256 contractId, string memory reason) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        require(
            msg.sender == sponsorshipContract.athlete || 
            msg.sender == sponsorshipContract.sponsor,
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
        
        require(isArbitrator, "Only arbitrator can resolve dispute");
        require(sponsorshipContract.state == ContractState.Disputed, "Contract not disputed");
        
        sponsorshipContract.state = athleteFavor ? ContractState.Active : ContractState.Terminated;
        emit DisputeResolved(contractId, athleteFavor);
    }

    /**
     * @dev Update contract document
     */
    function updateContract(uint256 contractId, string memory newContractIPFSHash) external {
        SponsorshipContract storage sponsorshipContract = contracts[contractId];
        require(
            msg.sender == sponsorshipContract.athlete || 
            msg.sender == sponsorshipContract.sponsor,
            "Only athlete or sponsor can update"
        );
        
        sponsorshipContract.updateHistory.push(sponsorshipContract.contractIPFSHash);
        sponsorshipContract.contractIPFSHash = newContractIPFSHash;
        
        emit ContractUpdated(contractId, newContractIPFSHash);
    }
} 