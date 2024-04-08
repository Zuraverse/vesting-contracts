// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../../contracts/SeedVesting.sol';
import '../../../contracts/Zura.sol';
import 'forge-std/Test.sol';

contract SeedVestingHandler is Test {
  SeedVesting public seedVesting;
  Zura public zuraToken;
  uint256 public ghost_total_token_allocated;
  address owner;
  mapping(address => uint256) public ghostClaimableAmountForUser;
  address public currentCaller;

  constructor(address _seedVesting, address _zuraToken, address _owner) {
    seedVesting = SeedVesting(_seedVesting);
    zuraToken = Zura(_zuraToken);
    owner = _owner;
  }

  function createVestingSchedule(address beneficiary, uint256 totalTokensAllocated) public {
    vm.startPrank(owner);
    vm.assume(beneficiary != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    ghost_total_token_allocated += totalTokensAllocated;
    seedVesting.createVestingSchedule(beneficiary, totalTokensAllocated);
    vm.stopPrank();
  }

  function calculateClaimableAmountWhenElapsedTimeGreaterThanOrEqualToVestingDuration(
    uint totalTokensAllocated
  ) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    vm.prank(owner);
    seedVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    skip(365 days);
    vm.prank(msg.sender);
    uint claimable = seedVesting.calculateClaimableAmount();
    ghostClaimableAmountForUser[msg.sender] = claimable;
    currentCaller = msg.sender;
  }

  function calculateClaimableAmountWhenElapsedTimeIsLessThanCliff(uint totalTokensAllocated) public {
    vm.assume(msg.sender != address(0));
    totalTokensAllocated = bound(totalTokensAllocated, 10, 5000);
    vm.prank(owner);
    seedVesting.createVestingSchedule(msg.sender, totalTokensAllocated);
    // (,,,uint startTime,) = seedVesting.vestingSchedules(msg.sender);
    // vm.assume((block.timestamp - startTime) < seedVesting.CLIFF());
    // As CLIFF = 0 so if elapsedTime < CLIFF then elapsedTime also 0 ??? I think something wrong here 
    vm.prank(msg.sender);
    uint claimable = seedVesting.calculateClaimableAmount();
    ghostClaimableAmountForUser[msg.sender] = claimable;
    currentCaller = msg.sender;
  }
}
