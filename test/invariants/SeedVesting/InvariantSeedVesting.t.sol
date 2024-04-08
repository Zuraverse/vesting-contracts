// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../../contracts/SeedVesting.sol';
import '../../../contracts/Zura.sol';
import 'forge-std/console2.sol';
import './SeedVestingHandler.sol';
import 'forge-std/Test.sol';

contract InvariantSeedVesting is Test {
  address owner;
  SeedVesting seedVesting;
  Zura zuraToken;
  uint256 cliff;
  uint256 TGE = block.timestamp + 2 days;
  SeedVestingHandler handlerContract;

  function setUp() public {
    owner = vm.addr(0x123);
    zuraToken = new Zura(address(owner));
    seedVesting = new SeedVesting(address(owner), address(zuraToken), TGE, cliff);
    handlerContract = new SeedVestingHandler(address(seedVesting), address(zuraToken), address(owner));
    targetContract(address(handlerContract));
    bytes4[] memory selectors = new bytes4[](3);
    selectors[0] = handlerContract.createVestingSchedule.selector;
    selectors[1] = handlerContract.calculateClaimableAmountWhenElapsedTimeGreaterThanOrEqualToVestingDuration.selector;
    selectors[2] = handlerContract.calculateClaimableAmountWhenElapsedTimeIsLessThanCliff.selector;
    targetSelector(FuzzSelector({addr: address(handlerContract), selectors: selectors}));
  }

  function invariant_testCreateVestingSchedule() public view {
    assertEq(handlerContract.ghost_total_token_allocated(), seedVesting.total_token_allocated_to_seed());
    assertLe(handlerContract.ghost_total_token_allocated(), seedVesting.SEED_ALLOCATION());
  }

  function invariant_testCalculateClaimableWhenElapsedTimeIsGreaterOrLessThanVestingDuration() public view {
    address user = handlerContract.currentCaller();
    (, uint totalAmount, uint releasedAmount, , ) = seedVesting.vestingSchedules(user);
    uint claimable = totalAmount - releasedAmount;
    assertEq(handlerContract.ghostClaimableAmountForUser(user), claimable);
  }

  function invariant_testCalculateClaimableWhenElapsedTimeIsLessThanCliff() public view {
    address user = handlerContract.currentCaller();

    assertEq(handlerContract.ghostClaimableAmountForUser(user), 0);
  }
}
