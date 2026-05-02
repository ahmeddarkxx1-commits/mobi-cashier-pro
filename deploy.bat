@echo off
echo Preparing to upload to GitHub...
git add .
git commit -m "Fix data persistence, WSOD, and add delete functionality"
echo Uploading...
git push
echo Done! 
pause
