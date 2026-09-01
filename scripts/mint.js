const { ethers } = require('hardhat');

// The real, already-deployed test token on Sepolia
const TOKEN_ADDRESS = '0x0D15D5f0781367938B8C2437A1F86ac3B810Bb8c';

const ERC20_MINT_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Minting to:', signer.address);

  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_MINT_ABI, signer);

  const decimals = await token.decimals();
  const symbol = await token.symbol();
  const amount = ethers.parseUnits('50000', decimals);

  console.log(`Calling mint(${signer.address}, 50000 ${symbol})...`);
  const tx = await token.mint(signer.address, amount);
  await tx.wait();

  const balance = await token.balanceOf(signer.address);
  console.log(`Done. New balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});