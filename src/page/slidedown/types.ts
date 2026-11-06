export interface SlidedownHtmlProps {
  icon?: string;
  iconAlt?: string;
  messageText?: string;
  positiveButtonText?: string;
  negativeButtonText?: string;
}

export interface IndexableByString<T> {
  [key: string]: T;
}
