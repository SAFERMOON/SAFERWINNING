function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(); }, duration);
  });
}

async function main() {
  const contestAddress = "0x0210fe34285b47ff1c1f8e0721f254b58d56d245";

  const Contest = await ethers.getContractFactory("SaferWinning");
  const contest = Contest.attach(contestAddress);

  console.log(`Reading contest entries from ${contestAddress}`);
  await sleep(1000);

  let i = 0;
  let participantEntries = {};
  let totalEntries = ethers.BigNumber.from(0);
  try {
    while (true) {
      const participantAddress = await contest.participants(i);
      const entries = await contest.entries(participantAddress);

      console.log(i + 1, participantAddress, entries.toString());

      participantEntries = {
        ...participantEntries,
        [participantAddress]: entries,
      };
      totalEntries = totalEntries.add(entries);

      i = i + 1;
    }
  } catch {
    console.log(`Read ${Object.entries(participantEntries).length} addresses with ${totalEntries} total entries`);
    await sleep(2000);
  }

  const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32));
  const random = randomness.mod(totalEntries);

  console.log(`Finding winning entry ${random}`);
  await sleep(500);

  let sum = ethers.BigNumber.from(0);
  let winningAddress;
  const participantAddresses = Object.keys(participantEntries);
  for (const [participantAddress, entries] of Object.entries(participantEntries)) {
    if (sum.add(entries).gt(random)) {
      winningAddress = participantAddress;
      break;
    }

    sum = sum.add(entries);

    console.log(sum.toString());
    await sleep(250);
  }

  console.log(`Found winner ${winningAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
