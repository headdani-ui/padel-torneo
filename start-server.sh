#!/bin/bash
cd /home/z/my-project
rm -rf .next
> dev.log
while true; do
  bun run dev >> dev.log 2>&1
  echo "Server died, restarting..." >> dev.log
  sleep 2
done
