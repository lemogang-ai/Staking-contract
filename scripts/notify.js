const { ethers } = require('hardhat');

const STAKING_CONTRACT_ADDRESS = '0x5D03049E1DFa6Ffe799b599F13B576D5BEf99474';

// EDIT THIS: reward amount in whole tokens (human units, not raw wei)
// This will be scaled by the token's decimals automatically below.
const REWARD_AMOUNT_HUMAN = '86400';

const ABI = [
  'function notifyRewardAmount(uint256 reward) external',
  'function lockDuration() view returns (uint256)',
  'function owner() view returns (address)',
  'function rewardsToken() view returns (address)',
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Calling from account:', signer.address);

  const staking = new ethers.Contract(STAKING_CONTRACT_ADDRESS, ABI, signer);

  const owner = await staking.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error(`This account is NOT the owner. Owner is: ${owner}`);
    console.error('Switch PRIVATE_KEY in your .env to the owner account and retry.');
    process.exitCode = 1;
    return;
  }

  const lockDuration = await staking.lockDuration();
  const rewardsTokenAddress = await staking.rewardsToken();
  const rewardsToken = new ethers.Contract(rewardsTokenAddress, ERC20_ABI, signer);
  const decimals = await rewardsToken.decimals();

  const reward = ethers.parseUnits(REWARD_AMOUNT_HUMAN, decimals);
  const contractBalance = await rewardsToken.balanceOf(STAKING_CONTRACT_ADDRESS);

  console.log('lockDuration (seconds):', lockDuration.toString());
  console.log('Reward amount (human): ', REWARD_AMOUNT_HUMAN);
  console.log('Reward amount (raw):   ', reward.toString());
  console.log('Implied rewardRate:    ', (reward / lockDuration).toString(), 'per second (raw units)');
  console.log('Contract token balance:', contractBalance.toString());

  if (reward > contractBalance) {
    console.error('Reward exceeds contract balance — reduce REWARD_AMOUNT_HUMAN.');
    process.exitCode = 1;
    return;
  }

  const tx = await staking.notifyRewardAmount(reward);
  console.log('Tx sent:', tx.hash);
  await tx.wait();
  console.log('Confirmed. Rewards are now active.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});