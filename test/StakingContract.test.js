const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("StakingRewardsUpgradeable - Module 1: Initialization", function () {
  let stakingToken, rewardsToken, stakingRewards;
  let owner, devWallet, user1;
  const LOCK_DURATION = 7 * 24 * 60 * 60; // 7 days lock time

  beforeEach(async function () {
    [owner, devWallet, user1] = await ethers.getSigners();

    // Deploy mock ERC-20 tokens
    const MockToken = await ethers.getContractFactory("MyContract"); 

    token = await MockToken.deploy();

    // Deploy Upgradeable Staking Contract via Proxy
    const StakingRewards = await ethers.getContractFactory("StakingRewardsUpgradeable");


    // Pass the SAME token address for both stakingToken and rewardsToken
    stakingRewards = await upgrades.deployProxy(
      StakingRewards,
      [
        await token.getAddress(),
        await token.getAddress(),
        devWallet.address,
        LOCK_DURATION
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await stakingRewards.waitForDeployment();
  });

  it("Should set the same token address for both staking and rewards", async function () {
    const tokenAddress = await token.getAddress();
    expect(await stakingRewards.stakingToken()).to.equal(tokenAddress);
    expect(await stakingRewards.rewardsToken()).to.equal(tokenAddress);
  });

  it("Should set devWallet, lockDuration, and owner correctly", async function () {
    expect(await stakingRewards.devWallet()).to.equal(devWallet.address);
    expect(await stakingRewards.lockDuration()).to.equal(LOCK_DURATION);
    expect(await stakingRewards.owner()).to.equal(owner.address);
  });

  it("Should prevent double initialization", async function () {
    const tokenAddress = await token.getAddress();
    await expect(
      stakingRewards.initialize(
        tokenAddress,
        tokenAddress,
        devWallet.address,
        LOCK_DURATION
      )
    ).to.be.reverted;
  });
});