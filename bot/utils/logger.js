const fs = require('fs');
const path = require('path');

const c = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m', reset: '\x1b[0m', bold: '\x1b[1m', gray: '\x1b[90m' };

class Logger {
  static log(level, msg, data) {
    const t = new Date().toLocaleString('en-US', { hour12: false });
    const map = { INFO: c.cyan, WARN: c.yellow, ERROR: c.red, SUCCESS: c.green, BOT: c.magenta };
    const lc = map[level] || c.white;
    console.log(`${c.gray}[${t}]${c.reset} ${lc}${c.bold}[${level}]${c.reset} ${c.white}${msg}${c.reset}`);
    if (data) console.log(`${c.gray}  └─${c.reset}`, data);
  }
  static info(m, d) { this.log('INFO', m, d); }
  static warn(m, d) { this.log('WARN', m, d); }
  static error(m, d) { this.log('ERROR', m, d); }
  static success(m, d) { this.log('SUCCESS', m, d); }
  static bot(m, d) { this.log('BOT', m, d); }
}

module.exports = Logger;
