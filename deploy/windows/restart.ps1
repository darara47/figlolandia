wsl -d Ubuntu -- bash -lc "
cd ~/apps/figlolandia &&
./deploy/wsl/restart.sh
"
exit $LASTEXITCODE
