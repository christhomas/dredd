// The package entry point. Dredd is the default export, so consumers write:
//
//   import Dredd from '@antimatter-studios/dredd'
//
// CommonJS consumers on Node >= 20.19 can require() this ES module, in which case
// they get the module namespace and reach the class through '.default'.
export { default } from './Dredd.js';
