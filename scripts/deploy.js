// Deploy script for AthleteChain contracts
const hre = require("hardhat");

async function main() {
  console.log("Deploying AthleteChain contracts...");

  // Get the contract factories
  const AthleteContract = await hre.ethers.getContractFactory("AthleteContract");
  const SponsorshipNFT = await hre.ethers.getContractFactory("SponsorshipNFT");
  const AthleteChainFactory = await hre.ethers.getContractFactory("AthleteChainFactory");
  
  // Deploy the factory contract (which will deploy the other contracts)
  console.log("Deploying AthleteChainFactory...");
  const factory = await AthleteChainFactory.deploy();
  await factory.deployed();
  
  // Log the addresses
  console.log("AthleteChainFactory deployed to:", factory.address);
  
  // Get addresses of child contracts
  const athleteContractAddress = await factory.athleteContract();
  const sponsorshipNFTAddress = await factory.sponsorshipNFT();
  
  console.log("AthleteContract deployed to:", athleteContractAddress);
  console.log("SponsorshipNFT deployed to:", sponsorshipNFTAddress);
  
  // Deploy DisputeResolution contract
  console.log("Deploying DisputeResolution...");
  const DisputeResolution = await hre.ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(athleteContractAddress);
  await disputeResolution.deployed();
  
  console.log("DisputeResolution deployed to:", disputeResolution.address);
  
  // Setup roles for testing
  console.log("Setting up roles for testing...");
  
  // Get signers
  const [deployer, athlete, sponsor, agent, arbitrator] = await hre.ethers.getSigners();
  
  // Constants for roles
  const ATHLETE_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ATHLETE_ROLE"));
  const SPONSOR_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SPONSOR_ROLE"));
  const AGENT_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("AGENT_ROLE"));
  const ARBITRATOR_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ARBITRATOR_ROLE"));
  
  // Register test users
  await factory.registerUser(
    athlete.address,
    ATHLETE_ROLE,
    "Test Athlete",
    "ipfs://QmTestAthleteProfile"
  );
  
  await factory.registerUser(
    sponsor.address,
    SPONSOR_ROLE,
    "Test Sponsor",
    "ipfs://QmTestSponsorProfile"
  );
  
  await factory.registerUser(
    agent.address,
    AGENT_ROLE,
    "Test Agent",
    "ipfs://QmTestAgentProfile"
  );
  
  await factory.registerUser(
    arbitrator.address,
    ARBITRATOR_ROLE,
    "Test Arbitrator",
    "ipfs://QmTestArbitratorProfile"
  );
  
  // Verify users
  await factory.verifyUser(athlete.address);
  await factory.verifyUser(sponsor.address);
  await factory.verifyUser(agent.address);
  await factory.verifyUser(arbitrator.address);
  
  // Grant arbitrator role on dispute resolution
  await disputeResolution.grantRole(ARBITRATOR_ROLE, arbitrator.address);
  
  console.log("Deployment and setup complete!");
  
  // Save the addresses to be used by the frontend
  const fs = require("fs");
  const contractAddresses = {
    factoryAddress: factory.address,
    athleteContractAddress: athleteContractAddress,
    sponsorshipNFTAddress: sponsorshipNFTAddress,
    disputeResolutionAddress: disputeResolution.address,
  };
  
  fs.writeFileSync(
    "src/contract-addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  
  console.log("Contract addresses saved to src/contract-addresses.json");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 