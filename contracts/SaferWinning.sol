// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/dev/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./ISaferMoon.sol";

contract SaferWinning is Ownable, VRFConsumerBase {
    using SafeMath for uint;

    ISaferMoon public token;
    uint public maxEntriesPerAccount;

    uint public totalEntries;
    mapping(address => uint) public entries;
    mapping(address => uint) public balances;

    mapping(address => uint) public participantIndex;
    address[] public participants;
    address public winner;

    struct Leader {
        address account;
        uint entries;
    }
    Leader[10] public leaderboard;
    uint public floor;

    event Deposit(address account, uint amount);
    event Withdrawal(address account, uint amount);
    event Result(address winner);

    bytes32 private keyHash;
    uint private fee;

    constructor(
        address _token,
        uint _maxEntriesPerAccount,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint _fee

    ) VRFConsumerBase(_vrfCoordinator, _link) {
        token = ISaferMoon(_token);
        maxEntriesPerAccount = _maxEntriesPerAccount;
        keyHash = _keyHash;
        fee = _fee;
        participants.push(address(0));
    }

    function deposit(uint amount) external updateParticipantsDeposit updateLeaderboardDeposit {
        require(amount > 0, "Contest: amount must be > 0");

        uint reflection = token.reflectionFromToken(amount, !token.isExcludedFromFee(address(this)));
        uint _amount = token.tokenFromReflection(reflection);
        uint _entries = entries[msg.sender].add(_amount);
        require(_entries <= maxEntriesPerAccount, "Contest: max entries exceeded");

        totalEntries = totalEntries.add(_amount);
        entries[msg.sender] = _entries;
        balances[msg.sender] = balances[msg.sender].add(reflection);
        token.transferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount);
    }

    function balanceOf(address account) public view returns (uint) {
        return token.tokenFromReflection(balances[account]);
    }

    function withdraw(uint amount) external updateParticipantsWithdrawal updateLeaderboardWithdrawal {
        require(amount > 0, "Contest: amount must be > 0");

        uint balance = balances[msg.sender];
        require(amount <= token.tokenFromReflection(balance), "Contest: amount exceeds balance");

        uint _entries = entries[msg.sender];
        uint _amount = Math.min(_entries, amount);

        totalEntries = totalEntries.sub(_amount);
        entries[msg.sender] = _entries.sub(_amount);
        balances[msg.sender] = balance.sub(token.reflectionFromToken(amount, false)); // subtract full amount
        token.transfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount);
    }

    function pickWinner(uint seed) external onlyOwner returns (bytes32) {
        require(LINK.balanceOf(address(this)) >= fee, "Contest: not enough LINK");
        return requestRandomness(keyHash, fee, seed);
    }

    function fulfillRandomness(bytes32, uint randomness) internal override {
        winner = participants[winningIndex(randomness)];
        emit Result(winner);
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

    modifier updateParticipantsDeposit {
        _;
        if (participantIndex[msg.sender] == 0) {
          participantIndex[msg.sender] = participants.length;
          participants.push(msg.sender);
        }
    }

    modifier updateParticipantsWithdrawal {
        _;
        if (entries[msg.sender] == 0) {
          uint index = participantIndex[msg.sender];
          address last = participants[participants.length - 1];
          participants[index] = last;
          participants.pop();
          participantIndex[last] = index;
          delete participantIndex[msg.sender];
        }
    }

    modifier updateLeaderboardDeposit {
        _;
        uint _entries = entries[msg.sender];
        if (_entries < floor) return;
        uint i;
        for (i; i < leaderboard.length; i++) {
            if (leaderboard[i].entries <= _entries) break;
        }
        uint j;
        for (j; j < leaderboard.length; j++) {
            if (leaderboard[j].account == msg.sender) break;
        }
        for (uint k = Math.min(j, leaderboard.length - 1); k > i; k--) {
            leaderboard[k] = leaderboard[k - 1];
        }
        leaderboard[i] = Leader(msg.sender, _entries);
        floor = leaderboard[leaderboard.length - 1].entries;
    }

    modifier updateLeaderboardWithdrawal {
        uint previous = entries[msg.sender];
        _;
        if (previous < floor) return;
        uint _entries = entries[msg.sender];
        uint i = leaderboard.length - 1;
        for (i; i > 0; i--) {
            if (leaderboard[i].entries >= _entries) break;
        }
        uint j;
        for (j; j < leaderboard.length; j++) {
            if (leaderboard[j].account == msg.sender) break;
        }
        for (j; j < Math.min(i, leaderboard.length - 1); j++) {
            leaderboard[j] = leaderboard[j + 1];
        }
        if (i < leaderboard.length - 1) {
            leaderboard[i] = Leader(msg.sender, _entries);
        } else {
            delete leaderboard[leaderboard.length - 1];
        }
        floor = leaderboard[leaderboard.length - 1].entries;
    }


    function withdrawLink() external onlyOwner {
        LINK.transfer(msg.sender, LINK.balanceOf(address(this)));
    }
}
