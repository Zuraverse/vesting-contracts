// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Constants.sol";

contract Zura is ERC20, Ownable, Constants {

  mapping (ALLOCATIONS_TYPE=>bool) public is_allocated;

    constructor(address initialOwner)
        ERC20("ZuraTest", "ZT")
        Ownable(initialOwner)
    {
        assert(SEED_ALLOCATION
            + PRIVATE_ALLOCATION
            + PUBLIC_ALLOCATION
            + EXCHANGE_MM_ALLOCATION
            + TEAM_ALLOCATION
            + ADVISORY_ALLOCATION
            + MARKETING_ALLOCATION
            + STAKING_AND_REWARDS_ALLOCATION
            == TOTAL_SUPPLY
        );
        _mint(address(this), TOTAL_SUPPLY);
    }

    function allocate_tokens(address to, ALLOCATIONS_TYPE funds) external onlyOwner() {
        require(is_allocated[funds]==false, "Funds already allocated");

        is_allocated[funds] = true;
        
        if(funds==ALLOCATIONS_TYPE.SEED) {
            transfer(to, SEED_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.PRIVATE) {
            transfer(to, PRIVATE_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.PUBLIC) {
            transfer(to, PUBLIC_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.EXCHANGE) {
            transfer(to, EXCHANGE_MM_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.TEAM) {
            transfer(to, TEAM_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.ADVISORY) {
            transfer(to, ADVISORY_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.MARKETING) {
            transfer(to, MARKETING_ALLOCATION);
        } else if(funds==ALLOCATIONS_TYPE.STAKING_AND_REWARDS) {
            transfer(to, STAKING_AND_REWARDS_ALLOCATION);
        }
        
    }

}