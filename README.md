[**career scraper**]

This tool scrapes jobs from this company's site: https://wpp.careersitecloud.com/search
It does this by getting the urls for a bunch of jobs and getting specific job info from each individual job listing,

[installation]
npm install

npm run build

(npm i -g) <- to install the "career_scraper" command to your system (optional)

[usage]

node ./dist/script.js -u "https://wpp.careersitecloud.com/search" -b "https://wpp.careersitecloud.com" -o [output file dir (default output.json)]
