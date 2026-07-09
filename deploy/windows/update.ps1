wsl -d Ubuntu -- bash -lc "
cd ~/apps/figlolandia &&
./deploy/wsl/update.sh
"
exit $LASTEXITCODE
