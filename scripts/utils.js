const config = require('../config')
const fs = require('fs')



module.exports = {
  chunkArray: function(myArray, chunk_size) {
    let index = 0
    const arrayLength = myArray.length
    const tempArray = []

    for (index = 0; index < arrayLength; index += chunk_size) {
      myChunk = myArray.slice(index, index + chunk_size)
      tempArray.push(myChunk)
    }
    return tempArray
  },

  doViaChunks: async function(_array, _doFn, _chunkSize = config.CHUNK_SIZE) {
    try {
      let results = []
      const chunks = this.chunkArray(_array, _chunkSize)
      for (const chunk of chunks) {
        const result = await doForChunk(chunk, _doFn)
        results = results.concat(...Array(result))
      }

      async function doForChunk(_chunk, _doFn) {
        const data = _chunk.map(async instance => await _doFn(instance))
        return Promise.all(data)
      }
      results = results.filter(function(el) {
        return el !== undefined
      })
      return results
    } catch (e) { console.log(e) }
  },
  loadWallets: function(walletsPath ='./wallets.txt') {
    if (fs.existsSync(walletsPath)) {
      const contents = fs.readFileSync(walletsPath, 'utf-8');
      return contents.split(/\r?\n/);
    }
  },
  sleep: async function (seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  },

  getRandomFloat: function(min, max, decimals) {
    const str = (Math.random() * (max - min) + parseFloat(min)).toFixed(decimals);
    return parseFloat(str);
},

  getRandomChoise: function(collection) {
    const str = (Math.random() * (collection.length - 1) + 1);
    return parseInt(str) - 1;
  },

  sample: function(array, size = 1) {
    const { floor, random } = Math;
    let sampleSet = new Set();
    for (let i = 0; i < size; i++) {
      let index;
      do { index = floor(random() * array.length); }
      while (sampleSet.has(index));
      sampleSet.add(index);
    }
    return [...sampleSet].map(i => array[i]);
  },

  getFileNameFromPath: function (str) {
    return str.split('\\').pop().split('/').pop();
  },
}
