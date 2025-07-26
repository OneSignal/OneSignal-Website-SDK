export interface SlidedownHtmlProps {
  icon?: string;
  messageText?: string;
  positiveButtonText?: string;
  negativeButtonText?: string;
}

export interface IndexableByString<T> {
  [key: string]: T;
}
