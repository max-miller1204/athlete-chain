const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  
  console.log("Available accounts:");
  console.log("==================");
  
  for (let i = 0; i < accounts.length; i++) {
    const balance = await hre.ethers.provider.getBalance(accounts[i].address);
    const balanceInEth = hre.ethers.utils.formatEther(balance);
    
    console.log(`${i}: ${accounts[i].address} (${balanceInEth} ETH)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 