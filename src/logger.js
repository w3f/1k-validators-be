class Logger {
  constructor(level) {
    switch (level.toLowerCase()) {
      case 'debug':
        this.level = 1;
        break;
      case 'info':
        this.level = 2;
        break;
      default:
        this.level = 2;
    } 
  }

  debug(msg) {
    if (this.level <= 1) {
      console.log(
        `${this._getDate()}  DEBUG  ${msg}`
      );
    }
  }

  info(msg) {
    if (this.level <= 2) {
      console.log(
        `${this._getDate()}  INFO   ${msg}`
      );
    }
  }

  _getDate() {
    return new Date().toLocaleTimeString();
  }
}

module.exports = Logger;