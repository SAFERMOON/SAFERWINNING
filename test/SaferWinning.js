const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

describe("SaferWinning", () => {
  let Token, token, Contest, contest, account1, account2;

  const maxEntriesPerAccount = "10000000000000000000";

  beforeEach(async () => {
    Token = await ethers.getContractFactory("SaferMoon");
    token = await Token.deploy();
    Contest = await ethers.getContractFactory("SaferWinning");
    contest = await Contest.deploy(
      token.address,
      maxEntriesPerAccount,
      "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C",
      "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
      "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186",
      "100000000000000000"
    );
    [account1, account2, account3, account4, account5, account6, account7, account8, account9, account10, account11, account12] = await ethers.getSigners();
    token.transfer(account2.address, "100000000000000000000");
    await token.includeInFee(account1.address);
  });

  describe("deposit", () => {
    it("prevents 0 deposits", async () => {
      await expect(contest.deposit(0)).to.be.revertedWith("Contest: amount must be > 0");
    });

    it("caps deposits", async () => {
      await token.approve(contest.address, "20000000000000000000");
      await expect(contest.deposit("20000000000000000000")).to.be.revertedWith("Contest: max entries exceeded");
      await contest.deposit("10000000000000000000");
      await expect(contest.deposit("10000000000000000000")).to.be.revertedWith("Contest: max entries exceeded");
    });

    it("updates totalEntries", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
      expect(await contest.totalEntries()).to.equal("9000000000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
      expect(await contest.totalEntries()).to.equal("18000000000000000000");
    });

    it("updates entries", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
      expect(await contest.entries(account1.address)).to.equal("9000000000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
      expect(await contest.entries(account2.address)).to.equal("9000000000000000000");
    });

    it("updates balances", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
      expect(await token.tokenFromReflection(await contest.balances(account1.address))).to.be.closeTo("9000000000000000000", "5000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
      expect(await token.tokenFromReflection(await contest.balances(account2.address))).to.be.closeTo("9000000000000000000", "5000000000000");
    });

    it("transfers tokens", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
      expect(await token.balanceOf(contest.address)).to.be.closeTo("9000000000000000000", "5000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
      expect(await token.balanceOf(contest.address)).to.be.closeTo("18000000000000000000", "20000000000000");
    });

    it("emits", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await expect(contest.deposit("10000000000000000000")).to.emit(contest, "Deposit").withArgs(account1.address, "10000000000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await expect(contest.connect(account2).deposit("10000000000000000000")).to.emit(contest, "Deposit").withArgs(account2.address, "10000000000000000000");
    });

    it("updates participants", async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("5000000000000000000");
      expect(await contest.participantIndex(account1.address)).to.equal(1);
      expect(await contest.participants(1)).to.equal(account1.address);
      await contest.deposit("5000000000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
      expect(await contest.participantIndex(account2.address)).to.equal(2);
      expect(await contest.participants(2)).to.equal(account2.address);
    });

    it("updates leaderboard", async () => {
      await token.excludeFromFee(account1.address);
      await token.transfer(account3.address, "3000000000000000000");
      await token.transfer(account4.address, "4000000000000000000");
      await token.transfer(account5.address, "5000000000000000000");
      await token.transfer(account6.address, "6000000000000000000");
      await token.transfer(account7.address, "7000000000000000000");
      await token.transfer(account8.address, "8000000000000000000");
      await token.transfer(account9.address, "9000000000000000000");
      await token.transfer(account10.address, "10000000000000000000");
      await token.transfer(account11.address, "1000000000000000000");
      await token.transfer(account12.address, "500000000000000000");
      await token.includeInFee(account1.address);

      await token.approve(contest.address, "1000000000000000000");
      await contest.deposit("1000000000000000000");
      await token.connect(account2).approve(contest.address, "2000000000000000000");
      await contest.connect(account2).deposit("2000000000000000000");
      await token.connect(account3).approve(contest.address, "3000000000000000000");
      await contest.connect(account3).deposit("3000000000000000000");
      await token.connect(account4).approve(contest.address, "4000000000000000000");
      await contest.connect(account4).deposit("4000000000000000000");
      await token.connect(account5).approve(contest.address, "5000000000000000000");
      await contest.connect(account5).deposit("5000000000000000000");
      await token.connect(account6).approve(contest.address, "6000000000000000000");
      await contest.connect(account6).deposit("6000000000000000000");
      await token.connect(account7).approve(contest.address, "7000000000000000000");
      await contest.connect(account7).deposit("7000000000000000000");
      await token.connect(account8).approve(contest.address, "8000000000000000000");
      await contest.connect(account8).deposit("4000000000000000000");
      await token.connect(account9).approve(contest.address, "9000000000000000000");
      await contest.connect(account9).deposit("9000000000000000000");

      expect(await contest.leaderboard(0)).to.eql([account9.address, BigNumber.from("8100000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account8.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account2.address, BigNumber.from("1800000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([account1.address, BigNumber.from("900000000000000000")]);
      expect(await contest.leaderboard(9)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);

      await contest.connect(account8).deposit("4000000000000000000");
      await token.connect(account10).approve(contest.address, "10000000000000000000");
      await contest.connect(account10).deposit("10000000000000000000");
      await token.connect(account11).approve(contest.address, "1000000000000000000");
      await contest.connect(account11).deposit("1000000000000000000");
      await token.connect(account12).approve(contest.address, "500000000000000000");
      await contest.connect(account12).deposit("500000000000000000");

      expect(await contest.leaderboard(0)).to.eql([account10.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account9.address, BigNumber.from("8100000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account8.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([account2.address, BigNumber.from("1800000000000000000")]);
      expect(await contest.leaderboard(9)).to.eql([account11.address, BigNumber.from("900000000000000000")]);
    });
  });

  describe("balanceOf", () => {
    beforeEach(async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
    });

    it("returns the account's balance", async () => {
      expect(await contest.balanceOf(account1.address)).to.be.closeTo("9000000000000000000", "5000000000000");
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      await token.approve(contest.address, "10000000000000000000");
      await contest.deposit("10000000000000000000");
      await token.connect(account2).approve(contest.address, "10000000000000000000");
      await contest.connect(account2).deposit("10000000000000000000");
    });

    it("prevents 0 withdrawals", async () => {
      await expect(contest.withdraw(0)).to.be.revertedWith("Contest: amount must be > 0");
    });

    it("caps withdrawals", async () => {
      await expect(contest.withdraw("10000000000000000000")).to.be.revertedWith("Contest: amount exceeds balance");
      await contest.withdraw("9000000000000000000");
      await expect(contest.withdraw("1000000000000000000")).to.be.revertedWith("Contest: amount exceeds balance");
    });

    it("updates totalEntries", async () => {
      await contest.withdraw("9000000000000000000");
      expect(await contest.totalEntries()).to.equal("9000000000000000000");
      await contest.connect(account2).withdraw("9000000000000000000");
      expect(await contest.totalEntries()).to.equal(0);
    });

    it("updates entries", async () => {
      await contest.withdraw("9000000000000000000");
      expect(await contest.entries(account1.address)).to.equal(0);
      await contest.connect(account2).withdraw("9000000000000000000");
      expect(await contest.entries(account2.address)).to.equal(0);
    });

    it("updates balances", async () => {
      await contest.withdraw("9000000000000000000");
      expect(await token.tokenFromReflection(await contest.balances(account1.address))).to.be.closeTo("0", "10000000000000");
      await contest.connect(account2).withdraw("9000000000000000000");
      expect(await token.tokenFromReflection(await contest.balances(account2.address))).to.be.closeTo("0", "10000000000000");
    });

    it("transfers tokens", async () => {
      await contest.withdraw("9000000000000000000");
      expect(await token.balanceOf(contest.address)).to.be.closeTo("9000000000000000000", "20000000000000");
      await contest.connect(account2).withdraw("9000000000000000000");
      expect(await token.balanceOf(contest.address)).to.be.closeTo("0", "20000000000000");
    });

    it("emits", async () => {
      await expect(contest.withdraw("9000000000000000000")).to.emit(contest, "Withdrawal").withArgs(account1.address, "9000000000000000000");
      await expect(contest.connect(account2).withdraw("9000000000000000000")).to.emit(contest, "Withdrawal").withArgs(account2.address, "9000000000000000000");
    });

    it("updates participants", async () => {
      await contest.withdraw("4500000000000000000");
      expect(await contest.participantIndex(account1.address)).to.equal(1);
      expect(await contest.participants(1)).to.equal(account1.address);
      await contest.withdraw("4500000000000000000");
      expect(await contest.participantIndex(account1.address)).to.equal(0);
      expect(await contest.participants(1)).to.equal(account2.address);
      expect(await contest.participantIndex(account2.address)).to.equal(1);
      await contest.connect(account2).withdraw("9000000000000000000");
      expect(await contest.participantIndex(account2.address)).to.equal(0);
    });

    it("updates leaderboard", async () => {
      await token.excludeFromFee(account1.address);
      await token.transfer(account3.address,  "3000000000000000000");
      await token.transfer(account4.address,  "4000000000000000000");
      await token.transfer(account5.address,  "5000000000000000000");
      await token.transfer(account6.address,  "6000000000000000000");
      await token.transfer(account7.address,  "7000000000000000000");
      await token.transfer(account8.address,  "8000000000000000000");
      await token.transfer(account9.address,  "9000000000000000000");
      await token.transfer(account10.address, "10000000000000000000");
      await token.includeInFee(account1.address);

      await token.connect(account3).approve(contest.address, "3000000000000000000");
      await contest.connect(account3).deposit("3000000000000000000");
      await token.connect(account4).approve(contest.address, "4000000000000000000");
      await contest.connect(account4).deposit("4000000000000000000");
      await token.connect(account5).approve(contest.address, "5000000000000000000");
      await contest.connect(account5).deposit("5000000000000000000");
      await token.connect(account6).approve(contest.address, "6000000000000000000");
      await contest.connect(account6).deposit("6000000000000000000");
      await token.connect(account7).approve(contest.address, "7000000000000000000");
      await contest.connect(account7).deposit("7000000000000000000");
      await token.connect(account8).approve(contest.address, "8000000000000000000");
      await contest.connect(account8).deposit("8000000000000000000");
      await token.connect(account9).approve(contest.address, "9000000000000000000");
      await contest.connect(account9).deposit("9000000000000000000");
      await token.connect(account10).approve(contest.address, "10000000000000000000");
      await contest.connect(account10).deposit("10000000000000000000");

      await contest.connect(account10).withdraw("9000000000000000000");
      expect(await contest.leaderboard(0)).to.eql([account2.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account1.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account9.address, BigNumber.from("8100000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account8.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(9)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);

      await contest.withdraw("9000000000000000000");
      expect(await contest.leaderboard(0)).to.eql([account2.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account9.address, BigNumber.from("8100000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account8.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);
      expect(await contest.leaderboard(9)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);

      await contest.connect(account9).withdraw("900000000000000000");
      expect(await contest.leaderboard(0)).to.eql([account2.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account8.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account9.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);
      expect(await contest.leaderboard(9)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);

      await contest.connect(account9).withdraw("450000000000000000");
      expect(await contest.leaderboard(0)).to.eql([account2.address, BigNumber.from("9000000000000000000")]);
      expect(await contest.leaderboard(1)).to.eql([account8.address, BigNumber.from("7200000000000000000")]);
      expect(await contest.leaderboard(2)).to.eql([account9.address, BigNumber.from("6750000000000000000")]);
      expect(await contest.leaderboard(3)).to.eql([account7.address, BigNumber.from("6300000000000000000")]);
      expect(await contest.leaderboard(4)).to.eql([account6.address, BigNumber.from("5400000000000000000")]);
      expect(await contest.leaderboard(5)).to.eql([account5.address, BigNumber.from("4500000000000000000")]);
      expect(await contest.leaderboard(6)).to.eql([account4.address, BigNumber.from("3600000000000000000")]);
      expect(await contest.leaderboard(7)).to.eql([account3.address, BigNumber.from("2700000000000000000")]);
      expect(await contest.leaderboard(8)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);
      expect(await contest.leaderboard(9)).to.eql([ethers.constants.AddressZero, BigNumber.from("0")]);
    });
  });

  describe("pickWinner", () => {
    it("can only be called by owner", async () => {
      await expect(contest.connect(account2).pickWinner(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("requires LINK", async () => {
      await expect(contest.pickWinner(0)).to.be.revertedWith("Contest: not enough LINK");
    });
  });

  describe("winningIndex", () => {
    beforeEach(async () => {
      await token.approve(contest.address, 1);
      await contest.deposit(1);
      await token.connect(account2).approve(contest.address, 2);
      await contest.connect(account2).deposit(2);
    });

    it("returns the index", async () => {
      expect(await contest.winningIndex(0)).to.equal(1);
      expect(await contest.winningIndex(1)).to.equal(2);
      expect(await contest.winningIndex(2)).to.equal(2);
      expect(await contest.winningIndex(3)).to.equal(1);
    });
  });
});
