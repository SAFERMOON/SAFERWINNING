const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

describe("SaferWinning", () => {
  let Token, token, Contest, contest, account1, account2;

  const maxEntriesPerAccount = "10000000000000000000";
  const minDeposit = "10000000000";

  beforeEach(async () => {
    Token = await ethers.getContractFactory("SaferMoon");
    token = await Token.deploy();
    Contest = await ethers.getContractFactory("SaferWinning");
    contest = await Contest.deploy(
      token.address,
      maxEntriesPerAccount,
      minDeposit,
      "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C",
      "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
      "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186",
      "100000000000000000"
    );
    [account1, account2] = await ethers.getSigners();
    token.transfer(account2.address, "100000000000000000000");
    await token.includeInFee(account1.address);
  });

  describe("deposit", () => {
    it("prevents deposits < minDeposit", async () => {
      await token.approve(contest.address, BigNumber.from(minDeposit).sub(1));
      await expect(contest.deposit(BigNumber.from(minDeposit).sub(1))).to.be.revertedWith("Contest: amount < minDeposit");
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
  });

  describe("pickWinner", () => {
    it("can only be called by owner", async () => {
      await expect(contest.connect(account2).pickWinner(0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("requires LINK", async () => {
      await expect(contest.pickWinner(0)).to.be.revertedWith("Contest: not enough LINK");
    });
  });

  describe("setMinDeposit", () => {
    it("sets minDeposit", async () => {
      await contest.setMinDeposit(BigNumber.from(minDeposit).div(2));
      expect(await contest.minDeposit()).to.equal(BigNumber.from(minDeposit).div(2));
    });
  });

  describe("winningIndex", () => {
    beforeEach(async () => {
      await contest.setMinDeposit(1);
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
