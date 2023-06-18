// take a process.argv[2] and use it to find a file in the examples directory
// then run it

function runGame(gameName: string) {
  const path = `./${gameName}.ts`;
  const game = require(path);
}

runGame(process.argv[2]);
