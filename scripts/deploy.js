const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying from:', deployer.address);

  // Pull values directly from process.env
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const lockDuration = process.env.LOCK_DURATION;       // e.g. 60 for quick testing, or 604800 for 7 days
  const rewardsDuration = process.env.REWARDS_DURATION || '86400'; // default: 1 day
  const devWallet = deployer.address;

  if (!tokenAddress) {
    throw new Error("TOKEN_ADDRESS is missing in .env file");
  }
  if (!lockDuration) {
    throw new Error("LOCK_DURATION is missing in .env file");
  }

  const StakingRewards = await ethers.getContractFactory("StakingRewardsUpgradeable");

  console.log("Deploying UUPS Proxy...");
  console.log("lockDuration (seconds):    ", lockDuration);
  console.log("rewardsDuration (seconds): ", rewardsDuration);

  const proxy = await upgrades.deployProxy(
    StakingRewards,
    [tokenAddress, tokenAddress, devWallet, lockDuration, rewardsDuration],
    { initializer: 'initialize', kind: 'uups' }
  );

  await proxy.waitForDeployment();

  console.log('StakingRewards Proxy deployed to:', await proxy.getAddress());
  console.log('Implementation address:', await upgrades.erc1967.getImplementationAddress(await proxy.getAddress()));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});