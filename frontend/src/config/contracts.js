// Fill these in after running:
//   npx hardhat run scripts/deploy.js --network localhost
export const STAKING_CONTRACT_ADDRESS = '0x73B389167A8886EAd749f9DE3AB47F3538DaE1Ac';
export const STAKING_TOKEN_ADDRESS = '0x0D15D5f0781367938B8C2437A1F86ac3B810Bb8c';

// Minimal ABI — only what the frontend calls
export const STAKING_ABI = [
  'function stake(uint256 amount) external',
  'function withdraw(uint256 amount) external',
  'function getReward() external',
  'function balanceOf(address) view returns (uint256)',
  'function earned(address) view returns (uint256)',
  'function stakeTime(address) view returns (uint256)',
  'function lockDuration() view returns (uint256)',
  'function stakingToken() view returns (address)',
  'function rewardsToken() view returns (address)',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];
