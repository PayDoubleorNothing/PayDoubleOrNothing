#!/bin/bash
# Script to reword commits - shorter messages

git filter-branch -f --msg-filter '
case "$GIT_COMMIT" in
3732158*)
    echo "Add README and LICENSE"
    ;;
6a1a404*)
    echo "Update README"
    ;;
*)
    cat
    ;;
esac
' HEAD~20..HEAD
