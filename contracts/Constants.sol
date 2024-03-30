// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Constants {

  // Total supply of tokens
  uint256 public constant TOTAL_SUPPLY = 690000000 * 1 ether; // Assuming 18 decimals
    
  // Seed allocation (8%)
  uint256 public constant SEED_ALLOCATION = TOTAL_SUPPLY * 8 / 100;
  uint256 public constant PRIVATE_ALLOCATION = (TOTAL_SUPPLY * 15) / 100;
  uint256 public constant PUBLIC_ALLOCATION = (TOTAL_SUPPLY * 6) / 100;
  uint256 public constant EXCHANGE_MM_ALLOCATION = (TOTAL_SUPPLY * 12) / 100;
  uint256 public constant TEAM_ALLOCATION = (TOTAL_SUPPLY * 15) / 100;
  uint256 public constant ADVISORY_ALLOCATION = (TOTAL_SUPPLY * 3) / 100;
  uint256 public constant MARKETING_ALLOCATION = (TOTAL_SUPPLY * 5) / 100;
  uint256 public constant STAKING_AND_REWARDS_ALLOCATION = (TOTAL_SUPPLY * 36) / 100;

  enum ALLOCATIONS_TYPE {
    SEED,
    PRIVATE,
    PUBLIC,
    EXCHANGE,
    TEAM,
    ADVISORY,
    MARKETING,
    STAKING_AND_REWARDS
  }

}