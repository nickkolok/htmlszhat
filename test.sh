#!/bin/bash
cd testpages

for html in `ls *.html`
do
	js ../htmlszhat.js $html > /dev/null

	tar -zcvf  $html.gz.tar.gz             $html
	tar -zcvf  $html.gz.htmlszhat.tar.gz   $html.htmlszhat

	tar -cvjf  $html.bz2.tar.bz2           $html
	tar -cvjf  $html.bz2.htmlszhat.tar.bz2 $html.htmlszhat

done;

ls -l
