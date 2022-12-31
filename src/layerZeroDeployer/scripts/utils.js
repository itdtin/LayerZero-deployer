import fs from 'fs'



export const loadWallets = function(path) {
    if (fs.existsSync(path)) {
      const contents = fs.readFileSync(path, 'utf-8');
      return contents.split(/\r?\n/);
    }
  }

export const loadNetworks = function(path) {
    if (fs.existsSync(path)) {
      const contents = fs.readFileSync(path, 'utf-8');
      return JSON.parse(contents);
    }
  }
export const sleep = async function (seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
  }

export const getRandomFloat = function(min, max, decimals) {
    const str = (Math.random() * (max - min) + parseFloat(min)).toFixed(decimals);
    return parseFloat(str);
}

export const getRandomChoise = function(collection) {
    const str = (Math.random() * (collection.length - 1) + 1);
    return parseInt(str) - 1;
  }

export const sample = function(array, size = 1) {
    const { floor, random } = Math;
    let sampleSet = new Set();
    for (let i = 0; i < size; i++) {
      let index;
      do { index = floor(random() * array.length); }
      while (sampleSet.has(index));
      sampleSet.add(index);
    }
    return [...sampleSet].map(i => array[i]);
  }

export const getFileNameFromPath = function (str) {
    return str.split('\\').pop().split('/').pop();
  }
