var en = require('./src/shared/i18n/locales/en/common.json');
var ru = require('./src/shared/i18n/locales/ru/common.json');
['encounterBuilder','bestiarySearch','rollHistory'].forEach(function(k) {
  if (!en[k]) throw new Error('Missing EN: ' + k);
  if (!ru[k]) throw new Error('Missing RU: ' + k);
});
console.log('OK');
