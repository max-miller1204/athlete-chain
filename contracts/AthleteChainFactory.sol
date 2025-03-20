// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AthleteContract.sol";
import "./SponsorshipNFT.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AthleteChainFactory
 * @dev Factory contract for creating and managing athlete sponsorship contracts
 */
contract AthleteChainFactory is AccessControl {
    // Role definitions
    bytes32 public constant ATHLETE_ROLE = keccak256("ATHLETE_ROLE");
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant TEAM_ROLE = keccak256("TEAM_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    
    // Contract instances
    AthleteContract public athleteContract;
    SponsorshipNFT public sponsorshipNFT;
    
    // User info
    struct UserInfo {
        string name;
        string profileIPFSHash;
        bool isVerified;
        uint256[] contracts; // Contract IDs associated with the user
    }
    
    // Mapping from address to user info
    mapping(address => UserInfo) public userInfo;
    
    // Mapping from address to roles
    mapping(address => bytes32[]) public userRoles;
    
    // Events
    event UserRegistered(address indexed user, bytes32 role);
    event ContractCreated(uint256 indexed contractId, address athlete, address sponsor);
    event NFTMinted(uint256 indexed tokenId, uint256 indexed contractId);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Deploy child contracts
        athleteContract = new AthleteContract();
        sponsorshipNFT = new SponsorshipNFT();
        
        // Grant minter role to this contract
        sponsorshipNFT.grantRole(keccak256("MINTER_ROLE"), address(this));
    }
    
    /**
     * @dev Register a new user
     */
    function registerUser(
        address user,
        bytes32 role,
        string memory name,
        string memory profileIPFSHash
    ) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Admin role required");
        require(!hasRole(role, user), "User already has this role");
        
        // Grant role on athlete contract
        athleteContract.grantRole(role, user);
        
        // Grant role on this contract
        _grantRole(role, user);
        
        // Store user info
        UserInfo storage info = userInfo[user];
        info.name = name;
        info.profileIPFSHash = profileIPFSHash;
        
        // Add role to user roles
        userRoles[user].push(role);
        
        emit UserRegistered(user, role);
    }
    
    /**
     * @dev Verify a user
     */
    function verifyUser(address user) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Admin role required");
        userInfo[user].isVerified = true;
    }
    
    /**
     * @dev Create a new sponsorship contract
     */
    function createSponsorshipContract(
        address athlete,
        address sponsor,
        string memory contractIPFSHash,
        uint256 totalValue,
        uint256 startDate,
        uint256 endDate,
        address paymentToken,
        address[] memory arbitrators
    ) external returns (uint256) {
        require(
            hasRole(ATHLETE_ROLE, athlete) || hasRole(AGENT_ROLE, msg.sender),
            "Only athlete or agent can create"
        );
        require(hasRole(SPONSOR_ROLE, sponsor), "Sponsor must have SPONSOR_ROLE");
        
        uint256 contractId = athleteContract.createContract(
            athlete,
            sponsor,
            contractIPFSHash,
            totalValue,
            startDate,
            endDate,
            paymentToken,
            arbitrators
        );
        
        // Add contract to user's contracts
        userInfo[athlete].contracts.push(contractId);
        userInfo[sponsor].contracts.push(contractId);
        
        // Add contract to agent's contracts if applicable
        if (hasRole(AGENT_ROLE, msg.sender) && msg.sender != athlete && msg.sender != sponsor) {
            userInfo[msg.sender].contracts.push(contractId);
        }
        
        emit ContractCreated(contractId, athlete, sponsor);
        
        return contractId;
    }
    
    /**
     * @dev Mint NFT for a sponsorship contract
     */
    function mintContractNFT(
        uint256 contractId,
        string memory tokenURI
    ) external returns (uint256) {
        // Get contract details
        (
            address athlete,
            address sponsor,
            ,
            ,
            ,
            ,
            ,
        ) = athleteContract.getContractDetails(contractId);
        
        require(
            msg.sender == athlete || msg.sender == sponsor || hasRole(AGENT_ROLE, msg.sender),
            "Only athlete, sponsor or agent can mint"
        );
        
        uint256 tokenId = sponsorshipNFT.mintSponsorshipNFT(
            sponsor, // Initial owner is the sponsor
            contractId,
            tokenURI,
            athlete,
            sponsor
        );
        
        emit NFTMinted(tokenId, contractId);
        
        return tokenId;
    }
    
    /**
     * @dev Get all contracts for a user
     */
    function getUserContracts(address user) external view returns (uint256[] memory) {
        return userInfo[user].contracts;
    }
    
    /**
     * @dev Check if user has a specific role
     */
    function hasUserRole(address user, bytes32 role) external view returns (bool) {
        return hasRole(role, user);
    }
    
    /**
     * @dev Get all roles for a user
     */
    function getUserRoles(address user) external view returns (bytes32[] memory) {
        return userRoles[user];
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
        AthleteContract.ContractState state,
        address paymentToken
    ) {
        return athleteContract.getContractDetails(contractId);
    }
    
    /**
     * @dev Update user profile
     */
    function updateUserProfile(string memory name, string memory profileIPFSHash) external {
        UserInfo storage info = userInfo[msg.sender];
        info.name = name;
        info.profileIPFSHash = profileIPFSHash;
    }
} 