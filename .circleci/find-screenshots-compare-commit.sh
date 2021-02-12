# If we're on master already, compare against our parent commit.
# Otherwise, compare against the merge-base commit on master.
#
# Export the environment variable using the trick from
# https://discuss.circleci.com/t/exporting-environment-variables-from-sourced-scripts/4564/3
if [ $(git rev-parse HEAD) = $(git merge-base origin/master HEAD) ]
then
  echo "export REG_SUIT_EXPECTED_KEY=$(git rev-parse HEAD~1)" >> $BASH_ENV
else
  echo "export REG_SUIT_EXPECTED_KEY=$(git merge-base origin/master HEAD)" >> $BASH_ENV
fi
