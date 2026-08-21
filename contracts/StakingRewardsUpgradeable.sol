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
    //Tokens & Addresses
    IERC20 public stakingToken;
    IERC20 public rewardsToken;
    address public devWallet;

    //Parameters
    uint256 public lockDuration;
    uint256 public rewardRate;
    uint256 public finishAt;
    uint256 public updatesAt;
    uint256 public rewardPerTokenStored;

    //Accounting
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public stakeTime;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _stakingToken,
        address _rewardsToken,
        address _devWallet,
        uint256 _lockDuration
    ) external initializer {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardsToken != address(0), "Invalid rewards token");
        require(_devWallet != address(0), "Invalid dev wallet");

        //initialize parent controls 
        __Ownable_init(msg.sender);

        // Assign state variables 
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        devWallet = _devWallet;
        lockDuration = _lockDuration;

    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
