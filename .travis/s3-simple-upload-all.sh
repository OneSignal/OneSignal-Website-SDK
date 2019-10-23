#!/bin/bash
#
# Similar to the 'sync' command, but with less features.
#
# Given a local folder structure like:
# DirA -> FileA
#      -> DirB  -> FileB
#
# Running: `s3-simple-upload-all.sh DirA s3://BucketA`
# Will result in uplading s3 folder structure:
# BucketA -> FileA
#         -> DirB  -> FileB
#
# Requires s3-simple.sh command in the same directory as s3-simple-upload-all.sh.

# Exit on error
set -e

s3simple_upload_all() {
  local local_path="$1"
  local s3_url="$2"

  local script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

  if [ "${s3_url:0:5}" != "s3://" ]; then
    echo "Need an s3 url, got: $s3_url!"
    return 1
  fi

  if [ ! -d $local_path ]; then
    echo "Local path is not a directory, got: $local_path"
    return 1
  fi

  local s3_path="${url:4}"

  for file_path in `find $local_path -type f`
  do
    relative_path=${file_path#"$local_path/"}

    # Add a trailing slash if missing
    [[ "${s3_url}" != */ ]] && s3_url="${s3_url}/"

    echo "Uploading $relative_path to $s3_url.."
    $script_dir/s3-simple.sh put $s3_url$relative_path $file_path
  done
}

s3simple_upload_all $1 $2
