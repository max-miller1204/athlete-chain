// Deploy script for AthleteChain contracts
const hre = require("hardhat");

async function main() {
  console.log("Deploying AthleteChain contracts...");

  // Get the contract factories
  const AthleteContract = await hre.ethers.getContractFactory("AthleteContract");
  const SponsorshipNFT = await hre.ethers.getContractFactory("SponsorshipNFT");
  const AthleteChainFactory = await hre.ethers.getContractFactory("AthleteChainFactory");
  
  // Deploy the factory contract (which will deploy the other contracts)
  const factory = await AthleteChainFactory.deploy();
  await factory.deployed();
  
  // Get addresses of child contracts
  const athleteContractAddress = await factory.athleteContract();
  const sponsorshipNFTAddress = await factory.sponsorshipNFT();
  
  console.log("AthleteChainFactory deployed to:", factory.address);
  console.log("AthleteContract deployed to:", athleteContractAddress);
  console.log("SponsorshipNFT deployed to:", sponsorshipNFTAddress);
  
  // Save the addresses to be used by the frontend
  const fs = require("fs");
  const contractAddresses = {
    factoryAddress: factory.address,
    athleteContractAddress: athleteContractAddress,
    sponsorshipNFTAddress: sponsorshipNFTAddress
  };
  
  fs.writeFileSync(
    "src/contract-addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  
  console.log("Contract addresses saved to src/contract-addresses.json");
  console.log("Deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 