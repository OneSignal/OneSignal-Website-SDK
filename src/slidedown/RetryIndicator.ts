export function getRetryIndicator(color: string = '#FFFFFF'): string {
  return `<svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.711 2.652a5.489 5.489 0 00-4.044 4.05 5.513 5.513 0 00.104 2.968.167.167 0 00.25.089l.893-.588a.667.667 0 011.02.692l-.61 2.937a.667.667 0 01-.786.52L.6 12.713a.667.667 0 01-.232-1.21l.933-.615a.166.166 0 00.063-.2 7.167 7.167 0 018.828-9.516.833.833 0 01-.507 1.587 5.489 5.489 0 00-2.974-.108zM15.75 3.542c.09.096.15.216.172.346a.667.667 0 01-.301.681l-.898.564a.166.166 0 00-.066.2 7.167 7.167 0 01-8.77 9.514.835.835 0 01-.154-1.544.831.831 0 01.646-.048 5.5 5.5 0 006.856-6.949.167.167 0 00-.176-.114.164.164 0 00-.071.026l-.962.604a.667.667 0 01-1.005-.713l.667-2.924a.667.667 0 01.8-.502l2.925.667c.129.03.246.096.336.192z" fill="${color}"/></svg>`;
}