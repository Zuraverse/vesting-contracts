const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");

describe("SeedVesting", function () {
  let seedVesting, tokenAddress, tge, cliff;

  let owner, user1, user2, user3, user4; 

  const WAD = BigInt('1000000000000000000');

  const MINUTES = 60
  const HOURS = 60 * MINUTES
  const DAYS = 24 * HOURS

  beforeEach(async function () {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    tokenAddress = "0xA1d7f71cbBb361A77820279958BAC38fC3667c1a"; // Replace with mock token address
    tge = Math.floor(Date.now() / 1000) + 1000; // Future timestamp
    cliff = 30; // Cliff duration in days
    
    const SeedVesting = await ethers.getContractFactory("SeedVesting");
    seedVesting = await SeedVesting.deploy(await owner.getAddress(), tokenAddress, tge, cliff);

  });

  it("Should deploy with correct token address", async function () {
    expect(await seedVesting.token()).to.equal(tokenAddress); // Replace with expected token address
  });

  it("Should deploy with correct TGE", async function () {
    expect(await seedVesting.TGE()).to.equal(BigInt(tge));
  });

  it("Should deploy with correct CLIFF", async function () {
    expect(await seedVesting.CLIFF()).to.equal(BigInt(cliff * 1 * DAYS));
  });

  describe("testing createVestingSchedule()", function() {
    it("Should create vesting schedule only by owner", async function () {
        const notOwner = user1;
        const beneficiary = user2;
        const allocation = BigInt(1000) * WAD;

        seedVesting.connect(notOwner).createVestingSchedule(beneficiary, allocation)
        await expect(seedVesting.connect(notOwner).createVestingSchedule(beneficiary, allocation))
          .to.be.revertedWithCustomError(seedVesting, "OwnableUnauthorizedAccount");

      });
      
    //   it("Should create vesting schedule with correct details", async function () {
    //     const beneficiary = accounts[2];
    //     const allocation = 1000 * 1e18;
      
    //     await seedVesting.createVestingSchedule(beneficiary, allocation);
      
    //     const schedule = await seedVesting.vestingSchedules(beneficiary);
      
    //     expect(schedule.beneficiary).to.equal(beneficiary);
    //     expect(schedule.totalAmount).to.equal(allocation);
    //     expect(schedule.releasedAmount).to.equal(0);
    //     expect(schedule.startTime).to.be.gt(0);
    //     expect(schedule.lastReleasedTime).to.equal(0);
    //   });
      
    //   it("Should prevent duplicate vesting schedule creation", async function () {
    //     const beneficiary = accounts[2];
    //     const allocation = 1000 * 1e18;
      
    //     await seedVesting.createVestingSchedule(beneficiary, allocation);
      
    //     await expect(seedVesting.createVestingSchedule(beneficiary, allocation))
    //       .to.be.revertedWith("Vesting already created");
    //   });
      
    //   it("Should prevent SEED allocation overflow", async function () {
    //     const allocation1 = 2000 * 1e18;
    //     const allocation2 = 3000 * 1e18;
      
    //     await seedVesting.createVestingSchedule(accounts[1], allocation1);
    //     await expect(seedVesting.createVestingSchedule(accounts[2], allocation2))
    //       .to.be.revertedWith("SEED allocation overflow");
    //   });
      
  })


});
