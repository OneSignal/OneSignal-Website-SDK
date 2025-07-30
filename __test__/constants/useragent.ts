export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.0.0 Safari/537.36';

// reference: https://explore.whatismybrowser.com/useragents/explore/
export const USER_AGENTS = {
  CHROME_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  CHROME_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.1.0.0 Safari/537.36',
  CHROME_LINUX:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.2.0.0 Safari/537.36',
  CHROME_IOS_IPHONE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.60 Mobile/15E148 Safari/604.1',
  CHROME_IOS_IPAD:
    'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.60 Mobile/15E148 Safari/604.1',
  CHROME_IOS_IPOD:
    'Mozilla/5.0 (iPod; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/139.0.7258.60 Mobile/15E148 Safari/604.1',
  CHROME_ANDROID:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.7204.180 Mobile Safari/537.36',
  FIREFOX_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.1',
  FIREFOX_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:141.0) Gecko/20100101 Firefox/141.0',
  FIREFOX_LINUX:
    'Mozilla/5.0 (X11; Linux i686; rv:141.0) Gecko/20100101 Firefox/141.0',
  FIREFOX_IOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.0 Mobile/15E148 Safari/605.1.15',
  FIREFOX_ANDROID:
    'Mozilla/5.0 (Android 16; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  SAFARI_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
  SAFARI_IPHONE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
  SAFARI_IPAD:
    'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
  SAFARI_IPOD:
    'Mozilla/5.0 (iPod touch; CPU iPhone 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1',
  EDGE_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/137.0.3351.109',
  EDGE_MAC:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/136.3351.109',
  EDGE_ANDROID:
    'Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.180 Mobile Safari/537.36 EdgA/138.0.3351.98',
  EDGE_IOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/138.3351.109 Mobile/15E148 Safari/605.1.15',
  OPERA_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 OPR/120.0.0.0',
  VIVALDI_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Vivaldi/7.5.3735.47',
  YANDEX_WINDOWS:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 YaBrowser/25.6.3.357 Yowser/2.5 Safari/537.36',
  FACEBOOK_APP_IOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/238.0.0.50.115;FBBV/171859800;FBDV/iPhone9,3;FBMD/iPhone;FBSN/iOS;FBSV/12.4.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBRV/172564136;FBCR/AT&T]',
  FACEBOOK_APP_ANDROID:
    'Mozilla/5.0 (Linux; Android 8.1.0; SM-J410G Build/M1AJB; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.81 Mobile Safari/537.36[FBAN/EMA;FBLC/es_LA;FBAV/457.0.0.12.82;FBCX/modulariab;]',
  SAMSUNG_TABLET:
    'Dalvik/2.1.0 (Linux; U; Android 14; SM-X306B Build/UP1A.231005.007)',
  GOOGLE_TABLET:
    'Mozilla/5.0 (Linux; Android 7.0; Pixel C Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36',
  //   AMAZON_FIRE_TV:
  //     'Mozilla/5.0 (Linux; Android 11; AFTKRT Build/RS8101.1849N; wv)PlexTV/10.0.0.4149',
  //   APPLE_TV: 'AppleTV14,1/16.1',
  //   PS5: 'Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
  //   FACEBOOK_BOT:
  //     'Mozilla/5.0 (compatible; FacebookBot/1.0; +https://developers.facebook.com/docs/sharing/webmasters/facebookbot/)',
};
