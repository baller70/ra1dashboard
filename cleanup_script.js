// Script to clean up test payment plans via API calls

const realParentIds = [
  'j97en33trdcm4f7hzvzj5e6vsn7mwxxr', // Kevin Houston
  'j97f7v56vbr080c66j9zq36m0s7mwzts', // Casey Houston  
  'j97c2xwtde8px84t48m8qtw0fn7mzcfb', // Nate Houston
  'j97de6dyw5c8m50je4a31z248x7n2mwp'  // Matt Houston
];

console.log('Real parent IDs:', realParentIds);
console.log('These are the only parent IDs that should have payment plans.');
console.log('All other payment plans are test data and should be deleted.');