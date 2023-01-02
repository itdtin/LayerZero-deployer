import fs from 'fs'
import {config} from "../config.js";



export const loadWallets = function(path) {
    console.log(fs.existsSync(path))
    if (fs.existsSync(path)) {
      const contents = fs.readFileSync(path, 'utf-8');
      console.log(contents)
      return contents.split(/\r?\n/);
    }
  }

export const loadNetworks = function(path) {
    const networks = {}
    if (fs.existsSync(path)) {
      const contents = fs.readFileSync(path, 'utf-8');
      const content = JSON.parse(contents);
      for(const networkName of Object.keys(content)) {
          if(content[networkName].url !== "" && content[networkName].chainId !== 0) {
              networks[networkName] = content[networkName]
          }
      }
        // let networksNames = Object.entries(content).
        // filter(networkObj => networkObj[1].url !== "")
        //     .map(networkObj => networkObj[0])
    }
    return networks
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
