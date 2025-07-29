const BrowserUserAgent = {
  Default:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
  iPad: 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10',
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
  iPod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_3 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B511 Safari/9537.53',
  EdgeUnsupported:
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10136',
  EdgeUnsupported2:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/17.17062',
  EdgeSupported:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/17.17074',
  IE11: 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
  FirefoxMobileUnsupported:
    'Mozilla/5.0 (Android 4.4; Mobile; rv:47.0) Gecko/47.0 Firefox/47.0',
  FirefoxTabletUnsupported:
    'Mozilla/5.0 (Android 4.4; Mobile ; rv:47.0) Gecko/47.0 Firefox/47.0',
  FirefoxMobileSupported:
    'Mozilla/5.0 (Android 4.4; Mobile; rv:44.0) Gecko/48.0 Firefox/48.0',
  FirefoxTabletSupported:
    'Mozilla/5.0 (Android 4.4; Tablet; rv:44.0) Gecko/48.0 Firefox/48.0',
  FirefoxWindowsUnSupported:
    'Mozilla/5.0 (Windows NT x.y; WOW64; rv:44.0) Gecko/20100101 Firefox/44.0',
  FirefoxWindowsSupported:
    'Mozilla/5.0 (Windows NT x.y; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0',
  FirefoxMacSupported:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:47.0) Gecko/20100101 Firefox/47.0',
  FirefoxLinuxSupported:
    'Mozilla/5.0 (X11; Linux i686 on x86_64; rv:47.0) Gecko/20100101 Firefox/47.0',
  SafariUnsupportedMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.0 Safari/538.4',
  SafariSupportedMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/538.32 (KHTML, like Gecko) Version/7.1 Safari/538.4',
  SafariSupportedMac121:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15',
  FacebookBrowseriOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 8_2 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12D508 [FBAN/FBIOS;FBAV/27.0.0.10.12;FBBV/8291884;FBDV/iPhone7,1;FBMD/iPhone;FBSN/iPhone OS;FBSV/8.2;FBSS/3;]',
  FacebookBrowserAndroid:
    'Mozilla/5.0 (Linux; Android 5.1; Archos Diamond S Build/LMY47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/51.0.2704.81 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/87.0.0.17.79;]',
  ChromeAndroidSupported:
    'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/54 Mobile Safari/535.19',
  ChromeWindowsSupported:
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2228.0 Safari/537.36',
  ChromeMacSupported:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1636.0 Safari/537.36',
  ChromeMac10_15:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
  ChromeMacSupported69:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 Safari/537.36',
  ChromeLinuxSupported:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1636.0 Safari/537.36',
  ChromeTabletSupported:
    'Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.1547.72 Safari/537.36',
  ChromeAndroidUnsupported:
    'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/41 Mobile Safari/535.19',
  ChromeWindowsUnsupported:
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2228.0 Safari/537.36',
  ChromeMacUnsupported:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.1636.0 Safari/537.36',
  ChromeLinuxUnsupported:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.1636.0 Safari/537.36',
  ChromeTabletUnsupported:
    'Mozilla/5.0 (Linux; Android 4.3; Nexus 10 Build/JWR66Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.1547.72 Safari/537.36',
  YandexDesktopSupportedHigh:
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/17.1.0.2036 Safari/537.36',
  YandexDesktopSupportedLow:
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.12785 YaBrowser/15.12.1.6475 Safari/537.36',
  YandexMobileSupported:
    'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 YaBrowser/17.1.2.339.00 Mobile Safari/537.36',
  OperaDesktopSupported:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36 OPR/42.0.2442.806',
  OperaMac10_14:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36 OPR/42.0.2442.806',
  OperaAndroidSupported:
    'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6P Build/N4F26T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Mobile Safari/537.36 OPR/37.5.2246.114172',
  OperaTabletSupported:
    'Mozilla/5.0 (Linux; Android 4.1.2; GT-N8000 Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.166 Safari/537.36 OPR/37.0.1396.73172',
  OperaMiniUnsupported:
    'Mozilla/5.0 (Linux; U; Android 7.1.2; Nexus 6P Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 Mobile Safari/537.36 OPR/24.0.2254.115784',
  VivaldiWindowsSupported:
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.89 Vivaldi/1.0.94.2 Safari/537.36',
  VivaldiLinuxSupported:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.105 Safari/537.36 Vivaldi/1.0.162.2',
  VivaldiMacSupported:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.99 Safari/537.36 Vivaldi/1.0.303.52',
  SamsungBrowserSupported:
    'Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36',
  SamsungBrowserUnsupported:
    'Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG SM-N910F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.0 Chrome/44.0.2403.133 Mobile Safari/537.36',
  UcBrowserSupported:
    'Mozilla/5.0 (Linux; U; Android 9; en-US; LM-G710 Build/PKQ1.181105.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.9.10.1159 Mobile Safari/537.36',
  UcBrowserUnsupported:
    'Mozilla/5.0 (Linux; U; Android 6.0.1; zh-CN; F5121 Build/34.0.A.1.247) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/40.0.2214.89 UCBrowser/11.5.1.944 Mobile Safari/537.36',
};

export default BrowserUserAgent;
