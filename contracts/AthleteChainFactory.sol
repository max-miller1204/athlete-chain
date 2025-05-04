// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AthleteContract.sol";
import "./SponsorshipNFT.sol";

/**
 * @title AthleteChainFactory
 * @dev Factory contract for creating and managing athlete sponsorship contracts
 */
contract AthleteChainFactory {
    // Contract instances
    AthleteContract public athleteContract;
    SponsorshipNFT public sponsorshipNFT;
    
    // User roles
    bytes32 public constant ATHLETE_ROLE = keccak256("ATHLETE_ROLE");
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // User struct
    struct User {
        address userAddress;
        string name;
        string profileIPFSHash;
        mapping(bytes32 => bool) roles;
        bool verified;
    }

    mapping(address => User) private _users;
    mapping(address => bool) public isRegistered;
    address public admin;

    // Events
    event ContractCreated(uint256 indexed contractId, address athlete, address sponsor);
    event NFTMinted(uint256 indexed tokenId, uint256 indexed contractId);
    event UserRegistered(address indexed user, string name, string profileIPFSHash, bytes32 role);
    event RoleAdded(address indexed user, bytes32 role);
    event UserVerified(address indexed user);
    
    constructor() {
        // Deploy child contracts
        athleteContract = new AthleteContract();
        sponsorshipNFT = new SponsorshipNFT();
        admin = msg.sender;
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
            msg.sender == athlete || msg.sender == sponsor,
            "Only athlete or sponsor can mint"
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

    // Register user (self or admin)
    function registerUser(address user, bytes32 role, string memory name, string memory profileIPFSHash) public {
        require(!isRegistered[user], "Already registered");
        require(
            msg.sender == user || msg.sender == admin,
            "Only self or admin can register"
        );
        User storage u = _users[user];
        u.userAddress = user;
        u.name = name;
        u.profileIPFSHash = profileIPFSHash;
        u.roles[role] = true;
        u.verified = false;
        isRegistered[user] = true;
        emit UserRegistered(user, name, profileIPFSHash, role);
    }

    // Add role to user (admin only)
    function addRole(address user, bytes32 role) public onlyAdmin {
        require(isRegistered[user], "User not registered");
        _users[user].roles[role] = true;
        emit RoleAdded(user, role);
    }

    // Verify user (admin only)
    function verifyUser(address user) public onlyAdmin {
        require(isRegistered[user], "User not registered");
        _users[user].verified = true;
        emit UserVerified(user);
    }

    // Check if user has a role
    function isUserInRole(address user, bytes32 role) public view returns (bool) {
        return _users[user].roles[role];
    }

    // Get user info
    function getUser(address user) public view returns (string memory name, string memory profileIPFSHash, bool verified) {
        User storage u = _users[user];
        return (u.name, u.profileIPFSHash, u.verified);
    }

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
} 