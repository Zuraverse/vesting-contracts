const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TeamVesting", function () {
  let seedVesting, zuraToken, zuraTokenAddress, seedVestingAddress, tge, cliff;

  let owner, user1, user2, user3, user4; 

  const WAD = BigInt('1000000000000000000');

  const MINUTES = 60;
  const HOURS = 60 * MINUTES;
  const DAYS = 24 * HOURS;
  const MONTHS = 30 * DAYS;
  const YEARS = 365 * DAYS;
  const TOTAL_SUPPLY = BigInt('690000000') * WAD;
  const SEED_ALLOCATION = (TOTAL_SUPPLY * BigInt('15')) / BigInt('100');
  const TGE_RELEASE = (SEED_ALLOCATION * BigInt('0')) / BigInt('100');
  cliff = 180; // Cliff duration in days
  const CLIFF_IN_SECS = cliff * 1 * DAYS;

  function calculate_months(currentTime, startTime, lastReleasedTime) {
    //return Math.round((futureTime - (CLIFF_IN_SECS+currentTime)) / 2592000); // 2592000 seconds = 30 days
    let lastClaimTime = lastReleasedTime == 0 ? startTime + CLIFF_IN_SECS : lastReleasedTime;
    return Math.round(currentTime - lastClaimTime) / 2592000;
  }

  beforeEach(async function () {

    const currentTime = await time.latest();
    const tgeTime = currentTime + 2 * DAYS;

    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    tge = tgeTime; // Future timestamp

    const Zura = await ethers.getContractFactory("Zura");
    zuraToken = await Zura.deploy(await owner.getAddress());

    zuraTokenAddress = await zuraToken.getAddress();

    const SeedVesting = await ethers.getContractFactory("TeamVesting");
    seedVesting = await SeedVesting.deploy(await owner.getAddress(), zuraTokenAddress, tge, cliff);

    seedVestingAddress = await seedVesting.getAddress();

    await zuraToken.connect(owner).allocate_tokens(seedVestingAddress, 0); // 0 ==> SEED

  });

  it("Should deploy with correct token address", async function () {
    expect(await seedVesting.token()).to.equal(zuraTokenAddress); // Replace with expected token address
  });

  it("Should deploy with correct TOTAL_SUPPLY", async function () {
    expect(await seedVesting.TOTAL_SUPPLY()).to.equal(BigInt('690000000') * WAD);
  });

  it("Should deploy with correct Zura tokens balance", async function () {
    expect(await zuraToken.balanceOf(seedVestingAddress)).to.equal(BigInt('55200000') * WAD);
  });

  it("Should deploy with correct SEED_ALLOCATION", async function () {
    expect(await seedVesting.TEAM_ALLOCATION()).to.equal((TOTAL_SUPPLY * BigInt('15')) / BigInt('100'));
  });

  it("Should deploy with correct TGE_RELEASE", async function () {
    expect(await seedVesting.TGE_RELEASE()).to.equal((WAD * BigInt('0')));
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
      
      it("Should create vesting schedule with correct details", async function () {
        const beneficiary = user1;
        const allocation = BigInt(1000) * WAD;
      
        //await seedVesting.createVestingSchedule(beneficiary, allocation);

        await expect(seedVesting.createVestingSchedule(beneficiary, allocation))
          .to.emit(seedVesting, "VestingScheduleCreated")
          .withArgs(beneficiary, allocation, anyValue); 
      
        const schedule = await seedVesting.vestingSchedules(beneficiary);
      
        expect(schedule.beneficiary).to.equal(beneficiary);
        expect(schedule.totalAmount).to.equal(allocation);
        expect(schedule.releasedAmount).to.equal(0);
        expect(schedule.startTime).to.be.gt(0);
        expect(schedule.lastReleasedTime).to.equal(0);

      });
      
      it("Should prevent duplicate vesting schedule creation", async function () {
        const beneficiary = user1;
        const allocation = BigInt(1000) * WAD;
      
        await seedVesting.createVestingSchedule(beneficiary, allocation);
      
        await expect(seedVesting.createVestingSchedule(beneficiary, allocation))
          .to.be.revertedWith("Vesting already created");
      });
      
      it("Should prevent SEED allocation overflow", async function () {
        const allocation1 = BigInt(100000000) * WAD;
        const allocation2 = BigInt(3500000) * WAD;
        const allocation3 = BigInt(1) * WAD;
      
        await seedVesting.createVestingSchedule(user1, allocation1);
        await seedVesting.createVestingSchedule(user2, allocation2);
        await expect(seedVesting.createVestingSchedule(user3, allocation3))
          .to.be.revertedWith("TEAM allocation overflow");
      });
      
  });

  describe("test claim function", function() {

    let beneficiary1, beneficiary2, beneficiary3, allocation1, allocation2, allocation3;

    beforeEach(async function() {
        beneficiary1 = user1;
        beneficiary2 = user2;
        beneficiary3 = user3;
        
        allocation1 = BigInt(1000) * WAD;
        allocation2 = BigInt(2000) * WAD;
        allocation3 = BigInt(3000) * WAD;
      
        await seedVesting.createVestingSchedule(beneficiary1, allocation1);
        await seedVesting.createVestingSchedule(beneficiary2, allocation2);
        await seedVesting.createVestingSchedule(beneficiary3, allocation3);
    });

    it("Should allow claim only by beneficiary", async function () {
        const notBeneficiary = user4;
      
        await expect(seedVesting.connect(notBeneficiary).claim())
          .to.be.revertedWith("Unauthorized");
    });

    it("Should not allow claim before cliff", async function () {
        await expect(seedVesting.connect(beneficiary1).claim()).to.be.revertedWith("No tokens claimable");
    });

    // it('Should emit TokensReleased event', async function() {

    //     const beneficiary = user4;
    //     const claimAmount = BigInt(1000) * WAD;

    //     await seedVesting.createVestingSchedule(beneficiary, claimAmount);

    //     await expect(seedVesting.connect(beneficiary).claim())
    //       .to.emit(seedVesting, "TokensReleased")
    //       .withArgs(beneficiary, anyValue); 
    // });

    // it("Should let claim 16% of allocated tokens at TGE", async function () {
        
    //     let schedule1 = await seedVesting.vestingSchedules(beneficiary1);
      
    //     expect(schedule1.beneficiary).to.equal(beneficiary1);
    //     expect(schedule1.totalAmount).to.equal(allocation1);
    //     expect(schedule1.releasedAmount).to.equal(0);
    //     expect(schedule1.startTime).to.be.gt(0);
    //     expect(schedule1.lastReleasedTime).to.equal(0);

    //     await seedVesting.connect(beneficiary1).claim();

    //     let schedule2 = await seedVesting.vestingSchedules(beneficiary1);

    //     const tokens_at_tge = (schedule1.totalAmount * BigInt('16')) / BigInt('100');
    //     expect(tokens_at_tge).to.equal(BigInt(160) * WAD);

    //     expect(schedule2.beneficiary).to.equal(beneficiary1);
    //     expect(schedule2.totalAmount).to.equal(allocation1);
    //     expect(schedule2.releasedAmount).to.equal(tokens_at_tge);
    //     expect(schedule2.startTime).to.be.gt(0);
    //     expect(schedule2.lastReleasedTime).to.greaterThan(schedule1.lastReleasedTime);

    // });

    it("Should let claim in installments", async function() {
        const beneficiary = beneficiary2;

        const schedule1 = await seedVesting.vestingSchedules(beneficiary);
      
        // Initial state
        expect(schedule1.beneficiary).to.equal(beneficiary);
        expect(schedule1.totalAmount).to.equal(allocation2);
        expect(schedule1.releasedAmount).to.equal(0);
        expect(schedule1.startTime).to.be.gt(0);
        expect(schedule1.lastReleasedTime).to.equal(0);
        expect(await zuraToken.balanceOf(beneficiary)).to.equal(0);

        const currentTime = await time.latest();
        console.log("currentTime", currentTime);
        const afterSevenMonth = currentTime + 210 * DAYS; // CLIFF + 1 MONTH
        console.log("afterSevenMonth", afterSevenMonth);

        // Time travel to 7 months (6 month CLIFF + 1 Month Vesting)
        await time.increaseTo(afterSevenMonth);

        console.log("After 7 months", await time.latest());

        // tge = 0 for Team
        const tge_withdrawal = (BigInt(0) * BigInt(allocation2)) / BigInt(100);

        const num_of_months = calculate_months(afterSevenMonth, currentTime, 0); // 2592000 seconds = 30 days
        console.log("num_of_months", num_of_months);

        const monthly_installment = (BigInt(num_of_months) * BigInt(10) * BigInt(allocation2)) / BigInt(100);

        console.log("monthly_installment", monthly_installment);

        console.log("await seedVesting.connect(beneficiary).calculateClaimableAmount()", await seedVesting.connect(beneficiary).calculateClaimableAmount());

        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(tge_withdrawal + monthly_installment);

        // Claim after 6 months along with tge amount
        await seedVesting.connect(beneficiary).claim();

        const schedule2 = await seedVesting.vestingSchedules(beneficiary);

        expect(schedule2.beneficiary).to.equal(beneficiary);
        expect(schedule2.totalAmount).to.equal(allocation2);
        expect(schedule2.releasedAmount).to.equal(tge_withdrawal + monthly_installment);
        expect(schedule2.startTime).to.be.gt(0);
        expect(schedule2.lastReleasedTime).to.greaterThan(schedule1.lastReleasedTime);
        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule2.releasedAmount));

        const afterSixteenMonths = afterSevenMonth + 9 * MONTHS;  // 16 months which means end of vesting period

        // Time travel to 16 months (Reach to the end of the vesting period == 6 Months CLIFF + 10 monthly claims)
        await time.increaseTo(afterSixteenMonths);

        console.log("afterSixteenMonths", await time.currentTime());

        const num_of_months2 = calculate_months(afterSixteenMonths, currentTime, afterSevenMonth);

        console.log("num_of_months2", num_of_months2);

        const monthly_installment2 = (BigInt(num_of_months2) * BigInt(10) * BigInt(allocation2)) / BigInt(100);

        console.log("monthly_installment2", monthly_installment2);

        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(schedule2.totalAmount - (tge_withdrawal + monthly_installment));
        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(monthly_installment2);

        // Claim rest all tokens after 1 year
        await seedVesting.connect(beneficiary).claim();

        const schedule3 = await seedVesting.vestingSchedules(beneficiary);

        expect(schedule3.beneficiary).to.equal(beneficiary);
        expect(schedule3.totalAmount).to.equal(allocation2);
        expect(schedule3.releasedAmount).to.equal(schedule1.totalAmount);
        expect(schedule3.startTime).to.be.gt(0);
        expect(schedule3.lastReleasedTime).to.greaterThan(schedule2.lastReleasedTime);
        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule3.releasedAmount));

        const afterEighteenthMonths = afterSixteenMonths + 2 * MONTHS; 

        // Time travel to 1 year 2 months
        await time.increaseTo(afterEighteenthMonths);

        console.log("afterEighteenthMonths", await time.currentTime());

        // No more tokens available to claim after all tokens claimed
        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(BigInt(0));

        await expect(seedVesting.connect(beneficiary).claim())
          .to.be.revertedWith("No tokens claimable");

        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule3.releasedAmount));

        // User3 should be able to claim all the tokens after elapsedTime >= VESTING DURATION
        expect(await seedVesting.connect(beneficiary3).calculateClaimableAmount()).to.equal(allocation3);

        expect(await zuraToken.balanceOf(beneficiary3)).to.equal(BigInt(0));

        await seedVesting.connect(beneficiary3).claim();

        expect(await zuraToken.balanceOf(beneficiary3)).to.equal(BigInt(allocation3));

        expect(await seedVesting.connect(beneficiary3).calculateClaimableAmount()).to.equal(0);

    });

  });


});
