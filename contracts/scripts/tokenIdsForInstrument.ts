function generate(instrument: number, role: string) {
  const ids = Array.from(Array(64)).map((v, i) => i + (instrument << 6));
  console.log(`0x9d27527Ada2CF29fBDAB2973cfa243845a08Bd3F 1 -1 ${role} ` + ids.join(','));

  console.log();
  console.log();
}

generate(0, '@triangle bleeper'); // f6fe63
generate(1, '@tilted saw bleeper'); // 0084db
generate(2, '@saw bleeper'); // f37734
generate(3, '@square bleeper'); // d1111e
generate(4, '@pulse bleeper'); // ad176c
generate(5, '@organ bleeper'); // 8034be
generate(6, '@phaser bleeper'); // 30d1b9

generate(7, '@noise bleeper'); // ff69b4
generate(8, '@funky saw bleeper'); // 63db3b
