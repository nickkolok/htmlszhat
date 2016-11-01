#!/bin/bash
cd testpages

for html in `ls *.html`
do
	js ../htmlszhat.js $html > /dev/null

	gzip -c9   $html            > $html.gz
	gzip -c9   $html.htmlszhat  > $html.gz.htmlszhat
	gzip -c9   $html.htmlorig   > $html.gz.htmlorig

	bzip2 -kc   $html           > $html.bz2
	bzip2 -kc   $html.htmlszhat > $html.bz2.htmlszhat
	bzip2 -kc   $html.htmlorig  > $html.bz2.htmlorig

done;

ls -l

echo "Файлов: " `ls -1 *.gz.htmlorig  | wc -l`
echo ""

echo "*.gz.htmlorig : " `wc -c *.gz.htmlorig    | tail -1`
echo "*.gz.htmlszhat: " `wc -c *.gz.htmlszhat   | tail -1`
echo ""

echo "*.bz2.htmlorig :" `wc -c *.bz2.htmlorig   | tail -1`
echo "*.bz2.htmlszhat:" `wc -c *.bz2.htmlszhat  | tail -1`
