// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../../contracts/TeamVesting.sol';
import '../../../contracts/Zura.sol';
import './TeamVestingHandler.sol';
import 'forge-std/Test.sol';

contract InvariantTeamVesting is Test {
  TeamVesting public teamVesting;
  Zura public zuraToken;
  TeamVestingHandler public teamVestingHandler;
  address public owner;
  uint TGE;
  uint CLIFF;

  function setUp() public {
    TGE = block.timestamp + 2 days;
    CLIFF = 180 days;
    owner = vm.addr(0x100);
    zuraToken = new Zura(address(owner));
    teamVesting = new TeamVesting(address(owner), address(zuraToken), TGE, CLIFF);
    teamVestingHandler = new TeamVestingHandler(address(teamVesting), address(zuraToken), address(owner));
    targetContract(address(teamVestingHandler));
    bytes4[] memory selectors = new bytes4[](1);
    // selectors[0] = teamVestingHandler.createVestingScheduleForTeam.selector;
    // selectors[1] = teamVestingHandler.calculateClaimableWhenElapsedTimeIsLessThanCLIFF.selector;
    // selectors[2] = teamVestingHandler.calculateClaimableWhenElapsedTimeIsGreaterThanOrEqualToVestingDuration.selector;
    // selectors[0] = teamVestingHandler.calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeZero.selector;
    selectors[0] = teamVestingHandler.calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeNotEqualToZero.selector;
    targetSelector(FuzzSelector({addr: address(teamVestingHandler), selectors: selectors}));
  }

  function invariant_testCreatingVestingSchedule() public view {
    assertEq(teamVestingHandler.ghost_allocatedTokenInTotal(), teamVesting.total_token_allocated_to_team());
    assertLe(teamVestingHandler.ghost_allocatedTokenInTotal(), teamVesting.TEAM_ALLOCATION());
  }

  function invariant_testCalculateClaimableWhenElapsedTimeIsLessThanCLIFF() public {
    address caller = teamVestingHandler.currentCaller();
    vm.prank(caller);
    uint claimable = teamVesting.calculateClaimableAmount();
    assertEq(teamVestingHandler.ghost_addressToClaimable(caller), claimable);
    assertEq(teamVestingHandler.ghost_addressToClaimable(caller), 0);
  }

  function invariant_testClaimableWhenElapsedTimeIsGreaterThanOrEqualToVestingDuration() public {
    address caller = teamVestingHandler.currentCaller();
    (, uint totalAmount, uint releasedAmount, , ) = teamVesting.vestingSchedules(caller);
    uint claimable = totalAmount - releasedAmount; // the claimable amount which should be
    uint claimable2 = teamVestingHandler.ghost_addressToClaimable(caller); // fetching claimable from handler
    vm.prank(caller);
    uint claimable3 = teamVesting.calculateClaimableAmount(); // Fetching claimable from main contract
    assertEq(claimable, claimable2);
    assertEq(claimable, claimable3);
  }

  function invariant_testCalculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeZero() public {
    address caller = teamVestingHandler.currentCaller();
    (, uint totalAmount, , , ) = teamVesting.vestingSchedules(caller);
    uint claimable = (teamVesting.TGE_RELEASE_PCT() * totalAmount) / 100;
    uint claimable2 = teamVestingHandler.ghost_addressToClaimable(caller); // fetching claimable from handler
    vm.prank(caller);
    uint claimable3 = teamVesting.calculateClaimableAmount(); // Fetching claimable from main contract
    assertEq(claimable, claimable2);
    assertEq(claimable, claimable3);
  }

  function invariant_testCalculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeNotEqualToZero() public {
    address caller = teamVestingHandler.currentCaller();
    (, uint totalAmount, , , ) = teamVesting.vestingSchedules(caller);
    uint claimable = (teamVestingHandler.ghost_monthPassedForUser(caller) *
      teamVesting.MONTHLY_WITHDRAWAL_PCT() *
      totalAmount) / 100;
    uint claimable2 = teamVestingHandler.ghost_addressToClaimable(caller);
    vm.prank(caller);
    uint claimable3 = teamVesting.calculateClaimableAmount(); // Fetching claimable from main contract
    assertEq(claimable, claimable2);
    assertEq(claimable, claimable3);
  }
}
