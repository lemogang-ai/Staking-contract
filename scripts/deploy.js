const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying from:', deployer.address);

  const MyContract = await ethers.getContractFactory('MyContract');
  const contract = await MyContract.deploy();
  await contract.waitForDeployment();

  console.log('MyContract deployed to:', await contract.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
