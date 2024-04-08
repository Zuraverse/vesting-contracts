### `TeamVesting.sol`:

1. When `elapsedTime` is equal or greater than `VESTING_DURATION` the claimable amount is returning 0.
   ```solidity
   File: TeamVesting.sol
   125:     } else if (elapsedTime >= VESTING_DURATION) {
   126:       claimable = schedule.totalAmount - schedule.releasedAmount;

   ```

proof:

```solidity
[142098] TeamVestingHandler::calculateClaimableWhenElapsedTimeIsGreaterThanOrEqualToVestingDuration(3)
    ├─ [0] VM::assume(true) [staticcall]
    │   └─ ← [Return] 
    ├─ [0] console::log("Bound Result", 13) [staticcall]
    │   └─ ← [Stop] 
    ├─ [0] VM::prank(0xFc32402667182d11B29fab5c5e323e80483e7800)
    │   └─ ← [Return] 
    ├─ [97917] TeamVesting::createVestingSchedule(0x0000000000000000000000000000000000001930, 13)
    │   ├─ emit VestingScheduleCreated(beneficiary: 0x0000000000000000000000000000000000001930, totalAmount: 13, startTime: 1)
    │   └─ ← [Stop] 
    ├─ [0] VM::warp(43200001 [4.32e7])    // @audit We are skipping 500 days
    │   └─ ← [Return] 
    ├─ [1222] TeamVesting::vestingSchedules(0x0000000000000000000000000000000000001930) [staticcall]
    │   └─ ← [Return] 0x0000000000000000000000000000000000001930, 13, 0, 1, 0
    ├─ [274] TeamVesting::VESTING_DURATION() [staticcall]
    │   └─ ← [Return] 41472000 [4.147e7]
    ├─ [0] VM::assertTrue(true) [staticcall]  // @ Assertion is true, see the handler function to check the assertion
    │   └─ ← [Return] 
    ├─ [0] VM::prank(0x0000000000000000000000000000000000001930)
    │   └─ ← [Return] 
    ├─ [892] TeamVesting::calculateClaimableAmount() [staticcall]     // @audit See here claimable amount is 0
    │   └─ ← [Return] 0
    └─ ← [Stop] 
```

2. When we are in VESTING_DURATION means after 300 days of schedule start time then claimable amount is returing 0. May be it is expected, if not then please modify the code. The snippet related to it is:

   ```solidity
   File: TeamVesting.sol
   127:     } else {
   128:   
   129:         if(schedule.lastReleasedTime == 0) {
   130:             claimable = (TGE_RELEASE_PCT * schedule.totalAmount) / 100;
   131:         }

   ```

   To verify this please run the `InvariantTeamVesting.t.sol::invariant_testCalculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeZero()` test for `TeamVestingHandler.sol::calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeZero()` handler contract.
3. When we are in vesting duration then for `lastReleasedTime != 0` we are getting 0 claimable amount.

   ```solidity
   File: TeamVesting.sol
   133:         uint256 monthsPassed = (block.timestamp - lastClaimTime) / 30 days; 
   134:         claimable += (monthsPassed * MONTHLY_WITHDRAWAL_PCT * schedule.totalAmount) / 100;

   ```

    For above snippet we are getting:

```solidity
[171877] TeamVestingHandler::calculateClaimableWhenLastReleasedTimeIsZeroWithReleasedTimeNotEqualToZero(2705)
    ├─ [0] VM::assume(true) [staticcall]
    │   └─ ← [Return] 
    ├─ [0] console::log("Bound Result", 2705) [staticcall]
    │   └─ ← [Stop] 
    ├─ [0] VM::prank(0xFc32402667182d11B29fab5c5e323e80483e7800)
    │   └─ ← [Return] 
    ├─ [97917] TeamVesting::createVestingSchedule(0x0000000000000000000000004d789743955aE138, 2705000000000000000000 [2.705e21])
    │   ├─ emit VestingScheduleCreated(beneficiary: 0x0000000000000000000000004d789743955aE138, totalAmount: 2705000000000000000000 [2.705e21], startTime: 1)
    │   └─ ← [Stop] 
    ├─ [0] VM::warp(25920001 [2.592e7])
    │   └─ ← [Return] 
    ├─ [0] VM::prank(0x0000000000000000000000004d789743955aE138)
    │   └─ ← [Return] 
    ├─ [0] VM::expectRevert(custom error f4844814:)
    │   └─ ← [Return] 
    ├─ [1269] TeamVesting::claim()
    │   └─ ← [Revert] revert: No tokens claimable
    ├─ [0] VM::warp(26092801 [2.609e7])
    │   └─ ← [Return] 
    ├─ [4892] TeamVesting::calculateClaimableAmount() [staticcall]      // @audit see here, claimable amount is 0 here
    │   └─ ← [Return] 0
    ├─ [1222] TeamVesting::vestingSchedules(0x0000000000000000000000004d789743955aE138) [staticcall]
    │   └─ ← [Return] 0x0000000000000000000000004d789743955aE138, 2705000000000000000000 [2.705e21], 0, 1, 0
    └─ ← [Stop]
```

4. `claim()` will revert because of 0 claimable amount while being in vesting duration:
   ```solidity
   [150189] TeamVestingHandler::claim(7807)
       ├─ [0] VM::assume(true) [staticcall]
       │   └─ ← [Return] 
       ├─ [0] console::log("Bound Result", 3806) [staticcall]
       │   └─ ← [Stop] 
       ├─ [0] VM::prank(0xFc32402667182d11B29fab5c5e323e80483e7800)
       │   └─ ← [Return] 
       ├─ [97917] TeamVesting::createVestingSchedule(0x9823764aA42e83A1CE9BF4b5E58daad1f19D7db6, 3806000000000000000000 [3.806e21])
       │   ├─ emit VestingScheduleCreated(beneficiary: 0x9823764aA42e83A1CE9BF4b5E58daad1f19D7db6, totalAmount: 3806000000000000000000 [3.806e21], startTime: 1)
       │   └─ ← [Stop] 
       ├─ [0] VM::warp(34560001 [3.456e7])
       │   └─ ← [Return] 
       ├─ [0] VM::prank(0x9823764aA42e83A1CE9BF4b5E58daad1f19D7db6)
       │   └─ ← [Return] 
       ├─ [892] TeamVesting::calculateClaimableAmount() [staticcall]
       │   └─ ← [Return] 0
       ├─ [4892] TeamVesting::calculateClaimableAmount() [staticcall]      // @audit See the claimable amount
       │   └─ ← [Return] 0
       ├─ [0] VM::prank(0x9823764aA42e83A1CE9BF4b5E58daad1f19D7db6)
       │   └─ ← [Return] 
       ├─ [0] VM::expectRevert(custom error f4844814:)
       │   └─ ← [Return] 
       ├─ [1269] TeamVesting::claim()
       │   └─ ← [Revert] revert: No tokens claimable        // @audit See the revert
       └─ ← [Stop] 
   ```
