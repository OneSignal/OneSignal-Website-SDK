/**
 * Capitalizes the first letter of the string.
 * @returns {string} The string with the first letter capitalized.
 */
String.prototype.capitalize = function() {
  if (!(this instanceof String)) return this;
  return this.charAt(0).toUpperCase() + this.slice(1);
};
