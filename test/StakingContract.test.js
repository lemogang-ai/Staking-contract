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

  describe("Module 4: Core User Functions", function () {
    it("Should allow user to stake tokens and update state", async function () {
      const stakeAmount = ethers.parseEther("100");

      // 1. Mint tokens to user1 so they have balance to stake
      await token.mint(user1.address, stakeAmount);

      // 2. Approve stakingRewards contract to spend user1's tokens
      await token.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);

      // 3. Call stake
      await stakingRewards.connect(user1).stake(stakeAmount);

      // 4. Assert state changes
      expect(await stakingRewards.totalSupply()).to.equal(stakeAmount);
      expect(await stakingRewards.balanceOf(user1.address)).to.equal(stakeAmount);
    });

    it("Should allow user to withdraw staked tokens after lock duration", async function () {
      const stakeAmount = ethers.parseEther("100");
      const expectedDevFee = ethers.parseEther("10");  // 10% dev fee
      const expectedUserNet = ethers.parseEther("90");   // 90% net to user

      // 1. User1 gets 100 tokens and stakes them
      await token.mint(user1.address, stakeAmount);
      await token.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);

      // 2. Record initial balances right before withdrawing
      const initialDevBalance = await token.balanceOf(devWallet.address);
      const initialUserBalance = await token.balanceOf(user1.address);

      // 3. Fast-forward time past lock duration
      await ethers.provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      // 4. User1 withdraws principal stake
      await stakingRewards.connect(user1).withdraw(stakeAmount);

      // 5. Measure relative balance increases
      const finalDevBalance = await token.balanceOf(devWallet.address);
      const finalUserBalance = await token.balanceOf(user1.address);

      expect(finalUserBalance - initialUserBalance).to.equal(expectedUserNet);
      expect(finalDevBalance - initialDevBalance).to.equal(expectedDevFee);
    });

    it("Should allow user to claim accumulated rewards", async function () {
      const stakeAmount = ethers.parseEther("100");
      const rewardAmount = ethers.parseEther("1000");

      // 1. Fund contract with reward tokens & start reward rate
      await token.mint(await stakingRewards.getAddress(), rewardAmount);
      await stakingRewards.connect(owner).notifyRewardAmount(rewardAmount);

      // 2. User stakes tokens
      await token.mint(user1.address, stakeAmount);
      await token.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);

      // 3. Fast-forward time
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      // 4. Claim reward
      await expect(stakingRewards.connect(user1).getReward()).to.not.be.reverted;
    });
  });

  describe("Module 5: Admin Functions", function () {
    it("Should allow owner to notify reward amount and update rewardRate", async function () {
      const rewardAmount = ethers.parseEther("1000");

      // Mint reward tokens to contract first so solvency check passes
      await token.mint(await stakingRewards.getAddress(), rewardAmount);

      // Call notifyRewardAmount as owner
      await expect(stakingRewards.connect(owner).notifyRewardAmount(rewardAmount))
        .to.emit(stakingRewards, "RewardAdded")
        .withArgs(rewardAmount);

      expect(await stakingRewards.rewardRate()).to.be.gt(0);
    });
  });

  describe("Module 6: Upgradeability & Security Edge Cases", function () {
    it("Should preserve state balances after a contract upgrade", async function () {
      const stakeAmount = ethers.parseEther("100");

      // 1. User stakes 100 tokens on V1
      await token.mint(user1.address, stakeAmount);
      await token.connect(user1).approve(await stakingRewards.getAddress(), stakeAmount);
      await stakingRewards.connect(user1).stake(stakeAmount);

      // 2. Deploy upgrade (V2)
      const StakingRewardsV2 = await ethers.getContractFactory("StakingRewardsUpgradeable");
      const upgradedRewards = await upgrades.upgradeProxy(
        await stakingRewards.getAddress(),
        StakingRewardsV2
      );

      // 3. Verify state retention on upgraded proxy
      expect(await upgradedRewards.totalSupply()).to.equal(stakeAmount);
      expect(await upgradedRewards.balanceOf(user1.address)).to.equal(stakeAmount);
    });
  });
});