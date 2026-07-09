$ErrorActionPreference = "Stop"

wsl -d Ubuntu -- bash -lc "
cd ~/apps/figlolandia &&
./deploy/wsl/start.sh
"
