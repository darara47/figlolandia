wsl -d Ubuntu -- bash -lc "
cd ~/apps/figlolandia &&
./deploy/wsl/stop.sh
"
exit $LASTEXITCODE
