'use strict';

var fs = require('fs');

var FILENAME = 'state.json';

module.exports = {
  state: {},

  load: function () {
    if (!fs.existsSync(FILENAME)) {
      console.info('No old state file found to load the config from.');
      return;
    }
    var file = fs.readFileSync(FILENAME, {
      encoding: 'utf8'
    });
    try {
      var stateFromFile = JSON.parse(file);
      this.state = stateFromFile;
    } catch (e) {
      throw new Error('Can´t parse the state file. Did the json content get damaged?\n' + e);
    }
  },

  save: function () {
    fs.writeFileSync(FILENAME, JSON.stringify(this.state), {
      encoding: 'utf8'
    });
  }

};