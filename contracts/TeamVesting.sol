// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

//import "hardhat/console.sol";

contract TeamVesting is Ownable {

  // Specify the ERC20 token address
  address public immutable token;
 
  uint256 public immutable TGE;

  uint256 public immutable CLIFF;

  // Total supply of tokens
  uint256 public constant TOTAL_SUPPLY = 690000000 * 1 ether; // Assuming 18 decimals

  // TEAM allocation Percentage
  uint256 public constant TEAM_ALLOCATION_PCT = 15;

  // TEAM allocation (8%)   // @audit I think it should be (15%)
  uint256 public constant TEAM_ALLOCATION = (TOTAL_SUPPLY * TEAM_ALLOCATION_PCT) / 100;

  // Percentage of tokens to be release at TGE 
  uint256 public constant TGE_RELEASE_PCT = 0;  

  // TGE release (16% of team allocation)  
  uint256 public constant TGE_RELEASE = TEAM_ALLOCATION * TGE_RELEASE_PCT / 100; // @audit how it is 16% !

  // Monthly withdrwal rate (7% of total allocation)
  uint256 public constant MONTHLY_WITHDRAWAL_PCT = 10;

  // Vesting duration (12 months in days)
  uint256 public constant VESTING_DURATION = 480 days; // Appx 16 months == 6 months cliff + 10% p.m

  // Keep record of total token allocated to TEAM
  uint256 public total_token_allocated_to_team = 0;

  // Mapping to store individual vesting schedules
  mapping(address => VestingSchedule) public vestingSchedules;

  // Structure to hold vesting details
  struct VestingSchedule {
    address beneficiary;
    uint256 totalAmount;
    uint256 releasedAmount;
    uint256 startTime;
    uint256 lastReleasedTime;
  }

  event VestingScheduleCreated(address beneficiary, uint256 totalAmount, uint256 startTime);

  // Event emitted when tokens are released
  event TokensReleased(address beneficiary, uint256 amount);

  // Cliff = 180 (6 months)
  constructor(address initialOwner, address _token, uint256 tge, uint256 cliff)
  Ownable(initialOwner) {
    require(_token != address(0), "Invalid token address");
    require(block.timestamp < tge, "Invalid TGE");
    token = _token;
    TGE = tge;
    CLIFF = cliff * 1 days;  // @audit i think it should be block.timestamp + cliff*1 days
  }

  // Modifier to restrict function calls to beneficiary
  modifier onlyBeneficiary() {
    require(msg.sender == vestingSchedules[msg.sender].beneficiary, "Unauthorized");
    _;
  }

  // Create a vesting schedule for a beneficiary
  function createVestingSchedule(address beneficiary, uint256 total_tokens_allocated) public onlyOwner {
    require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting already created");

    require(total_token_allocated_to_team + total_tokens_allocated <= TEAM_ALLOCATION, "TEAM allocation overflow");

    total_token_allocated_to_team += total_tokens_allocated;

   VestingSchedule memory newSchedule = VestingSchedule({
        beneficiary: beneficiary,
        totalAmount: total_tokens_allocated,
        releasedAmount: 0,  // Initially no tokens are released
        startTime: block.timestamp,
        lastReleasedTime: 0
    });

    // Insert the new schedule into the mapping
    vestingSchedules[beneficiary] = newSchedule;

    emit VestingScheduleCreated(beneficiary, newSchedule.totalAmount, newSchedule.startTime);
  }

  // Claim unlocked tokens
  function claim() public onlyBeneficiary {
    VestingSchedule storage schedule = vestingSchedules[msg.sender];
    
    uint256 claimableAmount = calculateClaimableAmount();

    require(claimableAmount > 0, "No tokens claimable");

    schedule.releasedAmount += claimableAmount;
    schedule.lastReleasedTime = block.timestamp;

    assert(schedule.releasedAmount <= schedule.totalAmount);
    
    safeTransferToken(msg.sender, claimableAmount);

    emit TokensReleased(msg.sender, claimableAmount);
  }

  // Calculate vested amount based on elapsed time
  function calculateClaimableAmount() public view returns (uint256) {
    VestingSchedule storage schedule = vestingSchedules[msg.sender];
    uint256 claimable;
    uint256 lastClaimTime = schedule.lastReleasedTime == 0 ? schedule.startTime + CLIFF : schedule.lastReleasedTime;
    uint256 elapsedTime = block.timestamp - schedule.startTime;

    if(elapsedTime < CLIFF) {
        claimable = 0;
    } else if (elapsedTime >= VESTING_DURATION) {
      claimable = schedule.totalAmount - schedule.releasedAmount;
    } else {
        
        if(schedule.lastReleasedTime == 0) {
            claimable = (TGE_RELEASE_PCT * schedule.totalAmount) / 100;
        }

        uint256 monthsPassed = (block.timestamp - lastClaimTime) / 30 days; 
        claimable += (monthsPassed * MONTHLY_WITHDRAWAL_PCT * schedule.totalAmount) / 100;
    }

    return claimable;
  }

  // Replace with actual secure token transfer logic (consider ERC20.transfer)
  function safeTransferToken(address to, uint256 amount) internal {
    SafeERC20.safeTransfer(IERC20(token), to, amount);
  }
}
