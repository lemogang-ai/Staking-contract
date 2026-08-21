const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("StakingRewardsUpgradeable Suite", function () {
  let token, stakingRewards;
  let owner, devWallet, user1;
  const LOCK_DURATION = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [owner, devWallet, user1] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    token = await MockToken.deploy();
    await token.waitForDeployment();

    const StakingRewards = await ethers.getContractFactory("StakingRewardsUpgradeable");
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

  describe("Module 1: State Setup", function () {
    it("Should set state variables correctly on initialization", async function () {
      const tokenAddress = await token.getAddress();
      expect(await stakingRewards.stakingToken()).to.equal(tokenAddress);
      expect(await stakingRewards.rewardsToken()).to.equal(tokenAddress);
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

  describe("Module 2: Synthetix Math View Functions", function () {
    it("Should return zero rewardPerToken when totalSupply is zero", async function () {
      expect(await stakingRewards.rewardPerToken()).to.equal(0);
    });

    it("Should return zero earned rewards for user with no stake", async function () {
      expect(await stakingRewards.earned(user1.address)).to.equal(0);
    });
  });
});