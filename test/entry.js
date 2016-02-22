function importTestsThatRequireValidSubscription() {
  require('./subscribed-tests.js');
}

function importTestsThatDontRequireValidSubscription() {
  require('./unsubscribed-tests.js');
}

window.importTestsThatRequireValidSubscription = importTestsThatRequireValidSubscription;
window.importTestsThatDontRequireValidSubscription = importTestsThatDontRequireValidSubscription;