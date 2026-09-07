import { readFileSync, statSync } from 'node:fs';
import { verifyExport } from './protocol.mjs';

try {
  const argv = process.argv.slice(2), options = {};
  if (argv.includes('--help')) {
    console.log('node src/cli.mjs --room ROOM --file FILE.jsonl [--fail-on-unsigned]\nOffline only. Exit 0: checks passed; 1: verification policy failed; 2: input error.');
  } else {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--fail-on-unsigned') options.strict = true;
      else if (['--room', '--file'].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith('--')) options[argv[i].slice(2)] = argv[++i];
      else throw new Error('Unknown or missing argument. Use --help.');
    }
    if (!options.room || !options.file) throw new Error('Both --room and --file are required.');
    const stat = statSync(options.file);
    if (!stat.isFile() || stat.size > 64 * 1024 * 1024) throw new Error('Input must be a regular file no larger than 64 MiB.');
    const result = verifyExport(options.room, readFileSync(options.file, 'utf8'));
    console.log(JSON.stringify(result, null, 2));
    if (!result.total || result.invalid || result.parseErrors || (options.strict && result.unsigned)) process.exitCode = 1;
  }
} catch (e) { console.error(e.message); process.exitCode = 2; }
