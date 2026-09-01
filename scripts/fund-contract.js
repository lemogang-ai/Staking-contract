const { ethers } = require('hardhat');

const TOKEN_ADDRESS = '0x0D15D5f0781367938B8C2437A1F86ac3B810Bb8c';
const STAKING_CONTRACT_ADDRESS = '0x5D03049E1DFa6Ffe799b599F13B576D5BEf99474';

// How many whole tokens to send INTO the contract to cover reward payouts
const AMOUNT_TO_FUND = '100000';

const ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const token = new ethers.Contract(TOKEN_ADDRESS, ABI, signer);

  const decimals = await token.decimals();
  const amount = ethers.parseUnits(AMOUNT_TO_FUND, decimals);
  const senderBalance = await token.balanceOf(signer.address);

  console.log('Sending from:', signer.address);
  console.log('Sender balance (human):', ethers.formatUnits(senderBalance, decimals));
  console.log('Funding contract with:', AMOUNT_TO_FUND, 'tokens');

  if (amount > senderBalance) {
    console.error('Not enough balance to send this amount.');
    process.exitCode = 1;
    return;
  }

  const tx = await token.transfer(STAKING_CONTRACT_ADDRESS, amount);
  await tx.wait();

  const newContractBalance = await token.balanceOf(STAKING_CONTRACT_ADDRESS);
  console.log('New contract balance:', ethers.formatUnits(newContractBalance, decimals));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});