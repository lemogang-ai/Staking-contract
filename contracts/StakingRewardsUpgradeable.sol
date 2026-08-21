// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract StakingRewardsUpgradeable is 
    Initializable, 
    OwnableUpgradeable, 
    UUPSUpgradeable 
{

    uint256 public stakingToken;
    uint256 public rewardsToken;
    address public devWallet;
    uint256 public lockDuration;

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
        // Write initialization logic here
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
