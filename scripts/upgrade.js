const { ethers, upgrades } = require('hardhat');
require('dotenv').config();

// Address of the proxy contract from your initial deployment

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Upgrading from:', deployer.address);

  const proxyAddress = process.env.STAKING_PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error('STAKING_PROXY_ADDRESS is missing in your .env file');
  }
    
  console.log('Target Proxy Address:', proxyAddress);

  const StakingRewardsV2 = await ethers.getContractFactory('StakingRewardsUpgradeable');

  const upgraded = await upgrades.upgradeProxy(proxyAddress, StakingRewardsV2);
  await upgraded.waitForDeployment();

  const currentImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('Proxy upgraded at:', await upgraded.getAddress());
  console.log('New implementation contract address:', currentImplAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

