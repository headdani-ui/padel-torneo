#!/bin/bash
cd /home/z/my-project/.next/standalone
NODE_OPTIONS="--max-old-space-size=128" PORT=3000 node server.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for ready
for i in $(seq 1 20); do
  if curl -s --max-time 1 -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "Server ready at ${i}s"
    break
  fi
  sleep 1
done

# Setup tournament
curl -s -X DELETE http://localhost:3000/api/tournament/reset
curl -s -X POST http://localhost:3000/api/tournament -H "Content-Type: application/json" -d '{"players":[{"name":"Marco","gender":"M"},{"name":"Luca","gender":"M"},{"name":"Anna","gender":"F"},{"name":"Sara","gender":"F"},{"name":"Paolo","gender":"M"},{"name":"Giulia","gender":"F"},{"name":"Andrea","gender":"M"},{"name":"Elena","gender":"F"}],"isMixed":false,"isFixedPairs":false,"fixedPairs":[],"numCourts":2,"numDays":4,"scoringType":"POINTS","scoringMode":"POINTS_MAX","maxPoints":18}'
echo "Tournament ready"

# Keep alive
while kill -0 $SERVER_PID 2>/dev/null; do
  sleep 5
  curl -s --max-time 2 -o /dev/null http://localhost:3000 2>/dev/null || {
    echo "Server died, restarting..."
    NODE_OPTIONS="--max-old-space-size=128" PORT=3000 node server.js &
    SERVER_PID=$!
  }
done
