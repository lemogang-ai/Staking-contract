// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract StakingRewardsUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Tokens & Addresses
    IERC20 public stakingToken;
    IERC20 public rewardsToken;
    address public devWallet;

    // Parameters
    uint256 public lockDuration;     // how long a stake must sit before withdraw() is allowed
    uint256 public rewardsDuration;  // how long a notifyRewardAmount() payout period runs
    uint256 public rewardRate;
    uint256 public finishAt;
    uint256 public updatedAt;
    uint256 public rewardPerTokenStored;

    // Accounting
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakeTime;

    // Custom Upgrade-Safe Reentrancy Guard State
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    event RewardAdded(uint256 reward);
    event LockDurationUpdated(uint256 newLockDuration);
    event RewardsDurationUpdated(uint256 newRewardsDuration);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _stakingToken,
        address _rewardsToken,
        address _devWallet,
        uint256 _lockDuration,
        uint256 _rewardsDuration
    ) external initializer {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardsToken != address(0), "Invalid rewards token");
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_lockDuration > 0, "Lock duration must be > 0");
        require(_rewardsDuration > 0, "Rewards duration must be > 0");

        __Ownable_init(msg.sender);

        _status = _NOT_ENTERED;

        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        devWallet = _devWallet;
        lockDuration = _lockDuration;
        rewardsDuration = _rewardsDuration;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Modifiers
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // Admin setters/getters
    function setLockDuration(uint256 _lockDuration) external onlyOwner {
        require(_lockDuration > 0, "Lock duration must be > 0");
        lockDuration = _lockDuration;
        emit LockDurationUpdated(_lockDuration);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(_rewardsDuration > 0, "Rewards duration must be > 0");
        require(block.timestamp >= finishAt, "Previous rewards period still active");
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsDuration);
    }

    // View Math Helpers
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < finishAt ? block.timestamp : finishAt;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + (rewardRate * (lastTimeRewardApplicable() - updatedAt) * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return ((balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) + rewards[account];
    }

    function stake(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot stake 0");

        totalSupply += _amount;
        balanceOf[msg.sender] += _amount;
        stakeTime[msg.sender] = block.timestamp;

        bool success = stakingToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Token transfer failed");
    }

    function withdraw(uint256 _amount) external nonReentrant updateReward(msg.sender) {
        require(_amount > 0, "Cannot withdraw 0");
        require(_amount <= balanceOf[msg.sender], "Cannot withdraw more than your staked balance");
        require(block.timestamp >= stakeTime[msg.sender] + lockDuration, "Tokens still in lock");

        totalSupply -= _amount;
        balanceOf[msg.sender] -= _amount;

        uint256 devFee = (_amount * 10) / 100;
        uint256 userAmount = _amount - devFee;

        bool success = stakingToken.transfer(msg.sender, userAmount);
        require(success, "Token transfer failed");

        if (devFee > 0) {
            bool successDev = stakingToken.transfer(devWallet, devFee);
            require(successDev, "Dev fee transfer failed");
        }
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 userReward = rewards[msg.sender];

        if (userReward > 0) {
            rewards[msg.sender] = 0;
            bool success = rewardsToken.transfer(msg.sender, userReward);
            require(success, "Reward transfer failed");
        }
    }

    function notifyRewardAmount(uint256 reward) external onlyOwner {
        if (block.timestamp >= finishAt) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remainingTime = finishAt - block.timestamp;
            uint256 remainingReward = remainingTime * rewardRate;
            rewardRate = (reward + remainingReward) / rewardsDuration;
        }

        uint256 balance = rewardsToken.balanceOf(address(this));
        require(rewardRate * rewardsDuration <= balance, "Reward rate exceeds contract balance");

        updatedAt = block.timestamp;
        finishAt = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }
}