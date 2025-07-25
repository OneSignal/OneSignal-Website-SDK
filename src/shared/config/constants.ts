export const NotificationClickMatchBehavior = {
  Exact: 'exact',
  Origin: 'origin',
} as const;

export const NotificationClickActionBehavior = {
  Navigate: 'navigate',
  Focus: 'focus',
} as const;

export const ConfigIntegrationKind = {
  TypicalSite: 'typical',
  WordPress: 'wordpress',
  Shopify: 'shopify',
  Blogger: 'blogger',
  Magento: 'magento',
  Drupal: 'drupal',
  SquareSpace: 'squarespace',
  Joomla: 'joomla',
  Weebly: 'weebly',
  Wix: 'wix',
  Custom: 'custom',
} as const;
