const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SeedVesting", function () {
  let seedVesting, zuraToken, zuraTokenAddress, seedVestingAddress, tge, cliff;

  let owner, user1, user2, user3, user4; 

  const WAD = BigInt('1000000000000000000');

  const MINUTES = 60;
  const HOURS = 60 * MINUTES;
  const DAYS = 24 * HOURS;
  const MONTHS = 30 * DAYS;
  const YEARS = 365 * DAYS;
  const TOTAL_SUPPLY = BigInt('690000000') * WAD;
  const SEED_ALLOCATION = (TOTAL_SUPPLY * BigInt('8')) / BigInt('100');
  const TGE_RELEASE = (SEED_ALLOCATION * BigInt('16')) / BigInt('100');

  beforeEach(async function () {

    const currentTime = await time.latest();
    const tgeTime = currentTime + 2 * DAYS;

    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    tge = tgeTime; // Future timestamp
    cliff = 0; // Cliff duration in days

    const Zura = await ethers.getContractFactory("Zura");
    zuraToken = await Zura.deploy(await owner.getAddress());

    zuraTokenAddress = await zuraToken.getAddress();

    const SeedVesting = await ethers.getContractFactory("SeedVesting");
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
    expect(await seedVesting.SEED_ALLOCATION()).to.equal((TOTAL_SUPPLY * BigInt('8')) / BigInt('100'));
  });

  it("Should deploy with correct TGE_RELEASE", async function () {
    expect(await seedVesting.TGE_RELEASE()).to.equal((WAD * BigInt('8832000')));
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
      
        await seedVesting.createVestingSchedule(beneficiary, allocation);
      
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
        const allocation1 = BigInt(55000000) * WAD;
        const allocation2 = BigInt(200000) * WAD;
        const allocation3 = BigInt(1) * WAD;
      
        await seedVesting.createVestingSchedule(user1, allocation1);
        await seedVesting.createVestingSchedule(user2, allocation2);
        await expect(seedVesting.createVestingSchedule(user3, allocation3))
          .to.be.revertedWith("SEED allocation overflow");
      });
      
  });

  describe("test claim function", function() {

    let beneficiary1, beneficiary2, allocation1, allocation2;

    beforeEach(async function() {
        beneficiary1 = user1;
        beneficiary2 = user2;
        allocation1 = BigInt(1000) * WAD;
        allocation2 = BigInt(2000) * WAD;
      
        await seedVesting.createVestingSchedule(beneficiary1, allocation1);
        await seedVesting.createVestingSchedule(beneficiary2, allocation2);
    });

    it("Should allow claim only by beneficiary", async function () {
        const notBeneficiary = user4;
      
        await expect(seedVesting.connect(notBeneficiary).claim())
          .to.be.revertedWith("Unauthorized");
    });

    // it("Should not allow claim before cliff", async function () {
    //     await expect(seedVesting.connect(beneficiary1).claim()).to.be.revertedWith("No tokens claimable");
    // });

    it("Should let claim 16% of allocated tokens at TGE", async function () {
        
        let schedule1 = await seedVesting.vestingSchedules(beneficiary1);
      
        expect(schedule1.beneficiary).to.equal(beneficiary1);
        expect(schedule1.totalAmount).to.equal(allocation1);
        expect(schedule1.releasedAmount).to.equal(0);
        expect(schedule1.startTime).to.be.gt(0);
        expect(schedule1.lastReleasedTime).to.equal(0);

        await seedVesting.connect(beneficiary1).claim();

        let schedule2 = await seedVesting.vestingSchedules(beneficiary1);

        const tokens_at_tge = (schedule1.totalAmount * BigInt('16')) / BigInt('100');
        expect(tokens_at_tge).to.equal(BigInt(160) * WAD);

        expect(schedule2.beneficiary).to.equal(beneficiary1);
        expect(schedule2.totalAmount).to.equal(allocation1);
        expect(schedule2.releasedAmount).to.equal(tokens_at_tge);
        expect(schedule2.startTime).to.be.gt(0);
        expect(schedule2.lastReleasedTime).to.greaterThan(schedule1.lastReleasedTime);

    });

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
        const afterOneMonth = currentTime + 31 * DAYS; // More than TGE (2 DAYS)

        // Time travel to 1 month
        await time.increaseTo(afterOneMonth);

        const tge_withdrawal = (BigInt(16) * BigInt(allocation2)) / BigInt(100);
        
        const monthly_installment = (BigInt(7) * BigInt(allocation2)) / BigInt(100);

        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(tge_withdrawal + monthly_installment);

        // Claim after 1 month along with tge amount
        await seedVesting.connect(beneficiary).claim();

        const schedule2 = await seedVesting.vestingSchedules(beneficiary);

        expect(schedule2.beneficiary).to.equal(beneficiary);
        expect(schedule2.totalAmount).to.equal(allocation2);
        expect(schedule2.releasedAmount).to.equal(tge_withdrawal + monthly_installment);
        expect(schedule2.startTime).to.be.gt(0);
        expect(schedule2.lastReleasedTime).to.greaterThan(schedule1.lastReleasedTime);
        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule2.releasedAmount));

        const afterOneYear = afterOneMonth + 11 * MONTHS + 1 * DAYS; 

        // Time travel to 1 year
        await time.increaseTo(afterOneYear);

        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(schedule2.totalAmount - (tge_withdrawal + monthly_installment));

        // Claim rest all tokens after 1 year
        await seedVesting.connect(beneficiary).claim();

        const schedule3 = await seedVesting.vestingSchedules(beneficiary);

        expect(schedule3.beneficiary).to.equal(beneficiary);
        expect(schedule3.totalAmount).to.equal(allocation2);
        expect(schedule3.releasedAmount).to.equal(schedule1.totalAmount);
        expect(schedule3.startTime).to.be.gt(0);
        expect(schedule3.lastReleasedTime).to.greaterThan(schedule2.lastReleasedTime);
        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule3.releasedAmount));

        const afterOneYearTwoMonths = afterOneYear + 2 * MONTHS; 

        // Time travel to 1 year 2 months
        await time.increaseTo(afterOneYearTwoMonths);

        // No more tokens available to claim after all tokens claimed
        expect(await seedVesting.connect(beneficiary).calculateClaimableAmount()).to.equal(BigInt(0));

        await expect(seedVesting.connect(beneficiary).claim())
          .to.be.revertedWith("No tokens claimable");

        expect(await zuraToken.balanceOf(beneficiary)).to.equal(BigInt(schedule3.releasedAmount));
        
    });

  });


});
