// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/dev/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./ISaferMoon.sol";

contract SaferWinning is Ownable, VRFConsumerBase {
    using SafeMath for uint;

    ISaferMoon public immutable token;
    uint public immutable maxEntriesPerAccount;
    uint public minDeposit;

    uint public totalEntries;
    mapping(address => uint) public entries;
    mapping(address => uint) public balances;

    mapping(address => uint) public participantIndex;
    address[] public participants;
    address public winner;

    event Deposit(address account, uint amount);
    event Withdrawal(address account, uint amount);
    event Result(address winner);

    bytes32 private immutable keyHash;
    uint private immutable fee;
    bytes32 private requestId;

    constructor(
        address _token,
        uint _maxEntriesPerAccount,
        uint _minDeposit,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint _fee

    ) VRFConsumerBase(_vrfCoordinator, _link) {
        token = ISaferMoon(_token);
        maxEntriesPerAccount = _maxEntriesPerAccount;
        minDeposit = _minDeposit;
        keyHash = _keyHash;
        fee = _fee;
        participants.push(address(0));
    }

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "Only EOA");
        _;
    }

    function deposit(uint amount) external onlyEOA {
        require(amount >= minDeposit, "Contest: amount < minDeposit");

        uint reflection = token.reflectionFromToken(amount, !token.isExcludedFromFee(address(this)));
        uint _amount = token.tokenFromReflection(reflection);
        uint _entries = entries[msg.sender].add(_amount);
        require(_entries <= maxEntriesPerAccount, "Contest: max entries exceeded");

        token.transferFrom(msg.sender, address(this), amount);
        totalEntries = totalEntries.add(_amount);
        entries[msg.sender] = _entries;
        balances[msg.sender] = balances[msg.sender].add(reflection);

        updateParticipantsDeposit();

        emit Deposit(msg.sender, amount);
    }

    function balanceOf(address account) public view returns (uint) {
        return token.tokenFromReflection(balances[account]);
    }

    function withdraw(uint amount) external onlyEOA {
        require(amount != 0, "Contest: amount must be > 0");

        uint balance = balances[msg.sender];
        require(amount <= token.tokenFromReflection(balance), "Contest: amount exceeds balance");

        uint _entries = entries[msg.sender];
        uint _amount = Math.min(_entries, amount);

        totalEntries = totalEntries.sub(_amount);
        entries[msg.sender] = _entries.sub(_amount);
        balances[msg.sender] = balance.sub(token.reflectionFromToken(amount, false)); // subtract full amount
        token.transfer(msg.sender, amount);

        updateParticipantsWithdrawal();

        emit Withdrawal(msg.sender, amount);
    }

    function pickWinner(uint seed) external onlyOwner returns (bytes32) {
        require(LINK.balanceOf(address(this)) >= fee, "Contest: not enough LINK");
        requestId = requestRandomness(keyHash, fee, seed);
        return requestId;
    }

    function fulfillRandomness(bytes32 _requestId, uint randomness) internal override {
        require(_requestId == requestId, "Contest: wrong request ID");
        winner = participants[winningIndex(randomness)];
        emit Result(winner);
    }

    function setMinDeposit(uint _minDeposit) external onlyOwner {
        minDeposit = _minDeposit;
    }

    function winningIndex(uint randomness) public view returns (uint) {
        uint random = randomness % totalEntries;
        for (uint i = 1; i < participants.length; i++) {
            uint participantEntries = entries[participants[i]];
            if (random < participantEntries) {
                return i;
            }
            random = random - participantEntries;
        }
    }

    function updateParticipantsDeposit() private {
        if (participantIndex[msg.sender] == 0) {
          participantIndex[msg.sender] = participants.length;
          participants.push(msg.sender);
        }
    }

    function updateParticipantsWithdrawal() private {
        if (entries[msg.sender] == 0) {
          uint index = participantIndex[msg.sender];
          address last = participants[participants.length - 1];
          participants[index] = last;
          participants.pop();
          participantIndex[last] = index;
          delete participantIndex[msg.sender];
        }
    }

    function withdrawLink() external onlyOwner {
        LINK.transfer(msg.sender, LINK.balanceOf(address(this)));
    }
}
