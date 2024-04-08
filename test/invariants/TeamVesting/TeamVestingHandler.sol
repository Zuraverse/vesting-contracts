// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../../contracts/TeamVesting.sol';
import '../../../contracts/Zura.sol';
import 'forge-std/Test.sol';

contract TeamVestingHandler is Test {
  TeamVesting public teamVesting;
  Zura public zuraToken;
  address owner;
  uint public ghost_allocatedTokenInTotal;
  mapping(address => uint256) public ghost_addressToClaimable;
  address public currentCaller;
  // a mapping for keeping record how much time has passed after claiming the token, basically for
  // `calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeNotEqualToZero` handler contract.
  mapping(address => uint256) public ghost_monthPassedForUser;

  constructor(address _teamVesting, address _zuraToken, address _owner) {
    teamVesting = TeamVesting(_teamVesting);
    zuraToken = Zura(_zuraToken);
    owner = _owner;
  }

  function createVestingScheduleForTeam(address beneficiary, uint256 totalTokensAllocated) public {
    vm.startPrank(owner);
    vm.assume(beneficiary != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    totalTokensAllocated = totalTokensAllocated * 1e18;
    ghost_allocatedTokenInTotal += totalTokensAllocated;
    teamVesting.createVestingSchedule(beneficiary, totalTokensAllocated);
    vm.stopPrank();
  }

  function calculateClaimableWhenElapsedTimeIsLessThanCLIFF(uint totalTokensAllocated) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    totalTokensAllocated = totalTokensAllocated * 1e18;
    vm.prank(owner);
    teamVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    skip(100 days);
    vm.prank(msg.sender);
    uint claimable = teamVesting.calculateClaimableAmount();
    ghost_addressToClaimable[msg.sender] = claimable;
    currentCaller = msg.sender;
  }

  function calculateClaimableWhenElapsedTimeIsGreaterThanOrEqualToVestingDuration(uint totalTokensAllocated) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    totalTokensAllocated = totalTokensAllocated * 1e18;
    vm.prank(owner);
    teamVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    skip(500 days); // @audit for this timestamp claimable amount is returning 0
    (, , , uint startTime, ) = teamVesting.vestingSchedules(msg.sender);
    uint elapsedTime = block.timestamp - startTime;
    assertTrue(elapsedTime > teamVesting.VESTING_DURATION());

    vm.prank(msg.sender);
    uint claimable = teamVesting.calculateClaimableAmount();
    ghost_addressToClaimable[msg.sender] = claimable;
    currentCaller = msg.sender;
  }

  /**
 As this test considers 2 case - (i) when lastReleasedTime == 0 & (ii) when lastReleasedTime != 0 we will
 do it in 2 different test case, separately
 */
  // test case 1 when releasedTime == 0
  function calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeZero(uint totalTokensAllocated) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    totalTokensAllocated = totalTokensAllocated * 1e18;
    vm.prank(owner);
    teamVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    skip(300 days); // We are in vesting duration
    vm.prank(msg.sender);
    uint claimable = teamVesting.calculateClaimableAmount();
    ghost_addressToClaimable[msg.sender] = claimable;
    currentCaller = msg.sender;
  }

  // test case 2 when releasedTime != 0
  function calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeNotEqualToZero(
    uint totalTokensAllocated
  ) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    totalTokensAllocated = totalTokensAllocated * 1e18;
    vm.prank(owner);
    teamVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    skip(300 days); // We are in vesting duration
    vm.prank(msg.sender);
    teamVesting.claim();
    skip(2 days);
    uint claimable = teamVesting.calculateClaimableAmount();
    //vm.stopPrank();
    ghost_addressToClaimable[msg.sender] = claimable;
    currentCaller = msg.sender;
    (, , , , uint lastReleasedTime) = teamVesting.vestingSchedules(msg.sender);
    uint monthPassed = (block.timestamp - lastReleasedTime) / 30 days;
    ghost_monthPassedForUser[msg.sender] = monthPassed;
  }
}
