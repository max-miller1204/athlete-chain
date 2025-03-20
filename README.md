# AthleteChain - Decentralized Athlete Contract Platform

AthleteChain is a blockchain-based platform that enables athletes, sponsors, teams, and agents to create, manage, and execute contracts securely and transparently. The platform uses Ethereum smart contracts to ensure trust, transparency, and automatic execution.

## Key Features

- **Smart Contracts for Athlete Sponsorships**: Automatically execute contract terms based on predefined conditions with immutable contract storage.
- **Decentralized Payments & Royalties**: Enable automatic payments using stablecoins or cryptocurrencies with milestone-based releases.
- **Contract Verification & Audit Trail**: Every contract update is recorded on-chain for transparency with IPFS for document storage.
- **Dispute Resolution**: Built-in arbitration system for handling contract disputes with DAO-style voting mechanisms.
- **NFT-Based Sponsorship Deals**: Convert contracts into NFTs representing athlete endorsements, allowing sponsors to trade or transfer deals securely.
- **Multi-User Role Management**: Different permissions for athletes, agents, sponsors, and teams with secure role-based access control.

## Tech Stack

- **Blockchain**: Ethereum (Solidity Smart Contracts)
- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Smart Contract Development**: Hardhat, OpenZeppelin
- **File Storage**: IPFS (for contract documents)
- **Wallet Integration**: ethers.js

## Project Structure

```
athlete-chain/
├── contracts/             # Smart contract source files
│   ├── AthleteContract.sol        # Core contract management
│   ├── AthleteChainFactory.sol    # Factory for creating contracts
│   ├── DisputeResolution.sol      # Arbitration and dispute handling
│   └── SponsorshipNFT.sol         # NFT functionality for contracts
├── src/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   ├── context/           # Context providers
│   └── artifacts/         # Compiled contract ABIs (generated)
├── public/                # Static assets
└── hardhat.config.js      # Hardhat configuration
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- MetaMask or another Ethereum wallet

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/athlete-chain.git
   cd athlete-chain
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Compile the smart contracts:
   ```
   npx hardhat compile
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Smart Contract Deployment

To deploy the smart contracts to a local Hardhat node:

1. Start a local blockchain node:
   ```
   npx hardhat node
   ```

2. Deploy the contracts:
   ```
   npx hardhat run scripts/deploy.js --network localhost
   ```

## Usage

1. Connect your wallet using the "Connect Wallet" button.
2. Register as an athlete, sponsor, agent, or team.
3. Create a new contract with all relevant details.
4. Set up milestones and payment terms.
5. Activate the contract once both parties agree.
6. Track milestone completion and payment releases.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
