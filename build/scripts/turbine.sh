#!/bin/bash
set -euo pipefail

git clone "https://${GH_TURBINE_TOKEN}@github.com/OneSignal/turbine.git" turbine
cd turbine

# Configure git identity
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Create new branch
BRANCH_NAME="web-sdk-${SDK_VERSION}-release"

# Check if PR already exists
EXISTING_PR=$(curl -s \
  -H "Authorization: Bearer $GH_TURBINE_TOKEN" \
  "https://api.github.com/repos/OneSignal/turbine/pulls?head=OneSignal:$BRANCH_NAME&state=open" |
  jq length)

if [ "$EXISTING_PR" -gt 0 ]; then
  echo "PR already exists for branch $BRANCH_NAME"
  exit 0
fi

git checkout -B "$BRANCH_NAME"

# Update only USERMODEL_WEB_SDK_VERSION
sed -i "s/USERMODEL_WEB_SDK_VERSION: [a-f0-9]\{40\}/USERMODEL_WEB_SDK_VERSION: ${GITHUB_SHA}/" .circleci/config.yml

# Check if changes were made
if git diff --exit-code; then
  echo "No changes to commit"
  exit 0
fi

# Commit changes
RELEASE_MESSAGE="Update SDK version to ${SDK_VERSION} for web release"
JOB_MESSAGE="Job that successfully built the artifacts: https://github.com/OneSignal/OneSignal-Website-SDK/actions/runs/${GITHUB_RUN_ID}"

git add .circleci/config.yml
git commit -m "$RELEASE_MESSAGE" -m "$JOB_MESSAGE"

# Push to origin
git push -u origin "$BRANCH_NAME"

exit 0

# Create pull request - use full owner:branch format for head
curl -sS -X POST \
  -H "Authorization: Bearer $GH_TURBINE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
\"title\": \"$RELEASE_MESSAGE\",
\"body\": \"$JOB_MESSAGE\",
\"head\": \"OneSignal:$BRANCH_NAME\",
\"base\": \"main\"
}" \
  https://api.github.com/repos/OneSignal/turbine/pulls
