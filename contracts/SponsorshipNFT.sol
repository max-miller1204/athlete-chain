// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SponsorshipNFT
 * @dev NFT contract for representing athlete sponsorship deals as NFTs
 */
contract SponsorshipNFT is ERC721URIStorage, ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Mapping from token ID to contract ID
    mapping(uint256 => uint256) public contractIdOf;
    
    // Mapping from contract ID to token ID
    mapping(uint256 => uint256) public tokenIdOf;
    
    // Events
    event SponsorshipNFTMinted(uint256 indexed tokenId, uint256 indexed contractId, address athlete, address sponsor);
    event RoyaltyPaid(uint256 indexed tokenId, address recipient, uint256 amount);
    
    constructor() ERC721("Athlete Sponsorship", "ASPON") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    /**
     * @dev Mint a new NFT for a sponsorship contract
     */
    function mintSponsorshipNFT(
        address to,
        uint256 contractId,
        string memory tokenURI,
        address athlete,
        address sponsor
    ) external returns (uint256) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        require(tokenIdOf[contractId] == 0, "NFT already minted for this contract");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        contractIdOf[newTokenId] = contractId;
        tokenIdOf[contractId] = newTokenId;
        
        emit SponsorshipNFTMinted(newTokenId, contractId, athlete, sponsor);
        
        return newTokenId;
    }
    
    /**
     * @dev Pay royalties for a tokenized sponsorship
     * @notice This function is meant to emit an event for tracking off-chain payments
     */
    function recordRoyaltyPayment(uint256 tokenId, address recipient, uint256 amount) external {
        require(_exists(tokenId), "Token does not exist");
        require(msg.sender == ownerOf(tokenId), "Only token owner can record royalties");
        
        emit RoyaltyPaid(tokenId, recipient, amount);
    }
    
    /**
     * @dev Get the contract ID associated with an NFT
     */
    function getContractId(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return contractIdOf[tokenId];
    }
    
    /**
     * @dev Get all tokens owned by an address
     */
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }
    
    // Required overrides for ERC721URIStorage + ERC721Enumerable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
} 