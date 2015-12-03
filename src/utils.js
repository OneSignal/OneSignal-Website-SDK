export function getHumanizedTimeDuration(timeDurationInMilliseconds) {
  function addPluralSuffix(number) {
    return (number > 1) ? 's' : '';
  }
  var duration = Math.floor(timeDurationInMilliseconds / 1000);

  var years = Math.floor(duration / 31536000);
  if (years)
    return years + ' year' + addPluralSuffix(years);

  var days = Math.floor((duration %= 31536000) / 86400);
  if (days)
    return days + ' day' + addPluralSuffix(days);

  var hours = Math.floor((duration %= 86400) / 3600);
  if (hours)
    return hours + ' hour' + addPluralSuffix(hours);

  var minutes = Math.floor((duration %= 3600) / 60);
  if (minutes)
    return minutes + ' minute' + addPluralSuffix(minutes);

  var seconds = duration % 60;
  if (seconds)
    return seconds + ' second' + addPluralSuffix(seconds);

  return 'just now';
}

export function isServiceWorkerContext() {
  return typeof window === "undefined";
}

export function isDev() {
  return __DEV__;
}