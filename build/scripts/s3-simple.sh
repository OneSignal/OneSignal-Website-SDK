#!/bin/bash
# bin/compile <build-dir> <cache-dir> <env-dir>
# See https://github.com/paulhammond/s3-tarball-buildpack for license and docs

# s3simple is a small, simple bash s3 client with minimal dependencies.
# See http://github.com/paulhammond/s3simple for documentation and licence.
s3simple() {
  local command="$1"
  local url="$2"
  local file="${3:--}"

  if [ "${url:0:5}" != "s3://" ]; then
    echo "Need an s3 url"
    return 1
  fi
  local path="${url:4}"

  if [ -z "${AWS_ACCESS_KEY_ID-}"  ]; then
    echo "Need AWS_ACCESS_KEY_ID to be set"
    return 1
  fi

  if [ -z "${AWS_SECRET_ACCESS_KEY-}" ]; then
    echo "Need AWS_SECRET_ACCESS_KEY to be set"
    return 1
  fi

  local method md5 args
  case "$command" in
  get)
    method="GET"
    md5=""
    args="-o $file"
    ;;
  put)
    method="PUT"
    if [ ! -f "$file" ]; then
      echo "file not found"
      exit 1
    fi
    md5="$(openssl md5 -binary $file | openssl base64)"
    args="-T $file -H Content-MD5:$md5"
    ;;
  *)
    echo "Unsupported command"
    return 1
  esac

  local date="$(date -u '+%a, %e %b %Y %H:%M:%S +0000')"
  local string_to_sign
  printf -v string_to_sign "%s\n%s\n\n%s\n%s" "$method" "$md5" "$date" "$path"
  local signature=$(echo -n "$string_to_sign" | openssl sha1 -binary -hmac "${AWS_SECRET_ACCESS_KEY}" | openssl base64)
  local authorization="AWS ${AWS_ACCESS_KEY_ID}:${signature}"

  curl $args -s -f -H Date:"${date}" -H Authorization:"${authorization}" "https://s3.amazonaws.com${path}"
}

case "$1" in
get)
  s3simple $1 $2 > $3
  ;;
*)
  s3simple $1 $2 $3
  ;;
esac
