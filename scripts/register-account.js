// SPDX-License-Identifier: MIT
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    // Read the contract addresses
    const contractAddresses = require("../src/contract-addresses.json");
    
    // Get the factory ABI
    const factoryAbi = require("../src/artifacts/contracts/AthleteChainFactory.sol/AthleteChainFactory.json").abi;
    
    // Connect to the factory contract
    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);
    
    const factory = new hre.ethers.Contract(
      contractAddresses.factoryAddress,
      factoryAbi,
      deployer
    );
    
    // Define the address to register (replace with your MetaMask address)
    const addressToRegister = process.argv[2];
    if (!addressToRegister) {
      console.error("Please provide the wallet address to register as a command line argument");
      process.exit(1);
    }
    
    console.log(`Registering address ${addressToRegister}...`);
    
    // Define the role (ATHLETE_ROLE or SPONSOR_ROLE)
    const ATHLETE_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ATHLETE_ROLE"));
    const SPONSOR_ROLE = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("SPONSOR_ROLE"));
    
    // Register the user as both athlete and sponsor for testing
    console.log("Registering as ATHLETE_ROLE...");
    await factory.registerUser(
      addressToRegister,
      ATHLETE_ROLE,
      "Test User",
      "ipfs://QmTestProfile"
    );
    
    console.log("Registering as SPONSOR_ROLE...");
    await factory.registerUser(
      addressToRegister,
      SPONSOR_ROLE,
      "Test User",
      "ipfs://QmTestProfile"
    );
    
    console.log("Verifying user...");
    await factory.verifyUser(addressToRegister);
    
    console.log("User registration complete!");
  } catch (error) {
    console.error("Error registering user:", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 