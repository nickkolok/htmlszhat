var fs = require('fs');
var cheerio = require('cheerio');

var filename = process.argv[2];


function safeinc(obj,key){
	if(obj[key]){
		obj[key]++;
	} else {
		obj[key] = 1;
	}
}


function getAttrFrequency($){
	// Возвращает список атрибутов с количеством употреблений каждого из них
	var allTags = $('*');
	var attrFrequency = {};
	for(var i = 0; i < allTags.length; i++){
		for(var attr in allTags[i].attribs){
			safeinc(attrFrequency,attr);
		}
	}
	return attrFrequency;
}


function getTagsFrequency($){
	// Возвращает список тэгов с количеством употреблений каждого из них
	var allTags = $('*');
	var frequency = {};
//	console.log(allTags.length);
	for(var i = 0; i < allTags.length; i++){
//		console.log(allTags[i]);
		safeinc(frequency,allTags[i].name)
	}
	return frequency;
}


function filterFrequency(frequency){
	for(var attr in frequency){
		if(frequency[attr] === 1){
			delete frequency[attr];
		}
	}
	return frequency;
}

var legalCharacters='qwertyuiopasdfghjklzxcvbnm';//+'ёйцукенгшщзхъфывапролджэячсмитьбю';//Так только хуже
legalCharacters+=legalCharacters.toUpperCase()+'1234567890_';
legalCharacters=legalCharacters.split('');

function getCharactersFrequence(html){
	var freq = {};
	for(var i = 0; i < legalCharacters.length; i++){
		freq[legalCharacters[i]]=0;
		var matches = html.match(new RegExp(legalCharacters[i],'g'));
		if(matches){
			freq[legalCharacters[i]]=matches.length;
		}
	}
	return(freq);
}

function getSortedCharacters(html){
	var freq = getCharactersFrequence(html);
	return sortArrayByFrequence(legalCharacters.slice(),freq);
}

function sortArrayByFrequence(chars,freq){

	chars.sort(function(a,b){
		return freq[b]-freq[a];
	});
	while(!freq[chars[chars.length-1]]){
		chars.length--;
	}
	return chars;

}

function getCharCombination(n,sortedChars){
	if(n<sortedChars.length){
		return sortedChars[n];
	}
	return (
		getCharCombination( Math.floor(n / sortedChars.length) ,sortedChars)+
		getCharCombination( n % sortedChars.length             ,sortedChars)
	);

}

function buildReplacementTable(whatFreq,sortedChars){
	var whatArray = [];
	for(var prop in whatFreq){
		whatArray.push(prop);
	}
	var replacementTable = {};
	whatArray = sortArrayByFrequence(whatArray,whatFreq);
	for(var i = 0; i < whatArray.length; i++){
		replacementTable[whatArray[i]] = getCharCombination(i,sortedChars);
	}
	return replacementTable;
}

function applyAttrReplacementTable(table,$){
	var allTags = $('*');
	for(var i = 0; i < allTags.length; i++){
		for(var attr in allTags[i].attribs){
			if(table[attr]){
				allTags[i].attribs[table[attr]]=allTags[i].attribs[attr];
				delete allTags[i].attribs[attr];
			}
		}
	}
}


function serializeAttrTable(table){
	var tag = "<z ";
	for(var attr in table){
		tag += table[attr] + "=" + attr + " ";
	}
	return tag+">";
}

function buildTagsAttrTable($){
	var freqTable = filterFrequency(getTagsFrequency($));
	var attrTable = {};
	for(var tag in freqTable){
		var attrFreq = {};
		var tagsArray = $(tag);
		var totalTagsCount = tagsArray.length;
		for(var i = 0; i < tagsArray.length; i++){
			for(var attr in tagsArray[i].attribs){
				safeinc(attrFreq,attr);
				if(tagsArray[i].attribs[attr]===""){
					// Всякое типа checked=""
					attrFreq[attr] = -Infinity;
				}
			}
		}
		// Оборачиваем в массив - с первого элемента пойдут атрибуты
		attrTable[tag] = [];
		//console.log(tag);
		//console.log(attrFreq);
		for(var attr in attrFreq){
			if(attrFreq[attr]>totalTagsCount/3){ // Грубо
				attrTable[tag].push(attr);
			}
		}
	}
	return attrTable;
}

function applyTagsTables($,replTable,attrTable){
	for(var tagname in replTable){
		var tagsArray = $(tagname);
		for(var i = 0; i < tagsArray.length; i++){
			var tag = tagsArray[i];
			tag.name = replTable[tag.name];

			for(var j=0; j<attrTable[tagname].length; j++){
				var val = (tag.attribs[attrTable[tagname][j]] || "");
				tag.name += '"'+val;
				delete tag.attribs[attrTable[tagname][j]];
			}

		}
	}
}


function joinTagsTables(tagsReplacementTable, tagsAttrTable){
	var rez="";
	for(var tag in tagsReplacementTable){
		rez+=" "+tagsReplacementTable[tag]+"="+tag+":"+tagsAttrTable[tag].join(" ");
	}
	return "<z>"+rez.trim()+"</z>";
}


function isComment(index, node) {
  return node.type === 'comment'
}

function removeComments($){
	$('*').contents().filter(isComment).remove();
}


function szhat(html){
	//var $ = cheerio.load('<h2 title="title" 1+=" something">Hello world</h2>');
	//console.log($('h2'));
	var $ = cheerio.load(html,{decodeEntities: false});

	var tags = filterFrequency(getTagsFrequency($));
	for(var tag in tags){
		console.log('Оптимизируется расположение атрибутов у тэгов <'+tag+'>');
//		optimizeAttrValueOrder($(tag),0);
		optimizeAttrOrder($(tag),0);
	}


//	console.log(getMostPopularAttrValue($('a')));
//	console.log(getMostPopularAttrValue($('link')));
//	console.log(getMostPopularAttrValue($('script')));

/*
	// Предвариательная подготовка

	// Удаляем комментарии
//	removeComments($);

	// Получаем отсортированный по частоте массив символов - алгоритм Хаффмана спасибо скажет
	var sortedChars = getSortedCharacters(html);
	//console.log(sortedChars);

	// Этап первый - замена атрибутов и тэгов на более короткие

	// Атрибуты

	// Строим таблицу замены атрибутов
	var attrReplacementTable = buildReplacementTable(filterFrequency(getAttrFrequency($)),sortedChars);
	// Применяем её к объекту документа
//	applyAttrReplacementTable(attrReplacementTable,$);
	// Сериализация таблицы замены атрибутов
	var attrTableSerialized = serializeAttrTable(attrReplacementTable);

	// Тэги



	//console.log(filterFrequency(getAttrFrequency($)));
	//console.log(getCharactersFrequence(html));

	//console.log(filterFrequency(getTagsFrequency($)));

	var tagsAttrTable = buildTagsAttrTable($);
	var tagsReplacementTable = buildReplacementTable(filterFrequency(getTagsFrequency($)),sortedChars);
	applyTagsTables($,tagsReplacementTable,tagsAttrTable);

	console.log(tagsReplacementTable);
	console.log(tagsAttrTable);

	console.log(joinTagsTables(tagsReplacementTable, tagsAttrTable));
//	console.log($('*'));
	return joinTagsTables(tagsReplacementTable, tagsAttrTable)+/*attrTableSerialized+*/$.html();
	return $.html();
}





function movePropToEnd(obj,prop){
	var val = obj[prop];
	delete obj[prop];
	obj[prop] = val;
}


function movePropToIndex(obj,prop,index){
	var i = 0;
	for(var exprop in obj){
		if(i < index){
			i++;
			continue;
		}
		if(prop === exprop){
			break;
		}
		movePropToEnd(obj,exprop);
	}
}

function getFirstProp(obj){
	for(var prop in obj){
		return prop;
	}
}

function getMaxProp(obj){
	var maxprop = getFirstProp(obj);
	for(var prop in obj){
		if(obj[prop]>obj[maxprop] || obj[prop]==obj[maxprop] && (prop.length > maxprop.length)){
			maxprop = prop;
		}
	}
	return maxprop;
}

function getMostPopularAttrValue(tags,placed){
	var freqs={};
	for(var i=0; i<tags.length; i++){
		var j=0;
		for(var attr in tags[i].attribs){
			if(j<placed){
				j++;
				continue;
			}
			safeinc(freqs,attr+'="'+tags[i].attribs[attr]+'"');
		}
	}
	var maxprop = getMaxProp(freqs);
	return freqs[maxprop] > 1 ? maxprop : null;
}


function getMostPopularAttr(tags,placed){
	var freqs={};
	for(var i=0; i<tags.length; i++){
		var j=0;
		for(var attr in tags[i].attribs){
			if(j<placed){
				j++;
				continue;
			}
			safeinc(freqs,attr);
		}
	}
	var maxprop = getMaxProp(freqs);
	return freqs[maxprop] > 1 ? maxprop : null;
}



function optimizeAttrOrder(tags,placed){
	var maxprop = getMostPopularAttr(tags,placed);
	if(!maxprop){
		return;
	}
	var touchedTags=[], untouchedTags=[];
	for(var i=0; i<tags.length; i++){
		if(maxprop in tags[i].attribs){
			movePropToIndex(tags[i].attribs,maxprop,placed);
			touchedTags.push(tags[i]);
		} else {
			untouchedTags.push(tags[i]);
		}
	}
	optimizeAttrOrder(touchedTags,placed+1);
	optimizeAttrOrder(untouchedTags,placed);
}


function logTag(tag){
	var rez = '<'+tag.name;
	for(var attr in tag.attribs){
		rez += ' '+attr+'="'+tag.attribs[attr]+'"';
	}
	console.log(rez+'>');
}


function logTagsArray(tags){
	for(var i=0; i<tags.length; i++){
		logTag(tags[i]);
	}
}


function optimizeAttrValueOrder(tags,placed){
	logTagsArray(tags);
	if(tags.length == 1){
		console.log('Единственный тэг, пропускается');
		return;
	}
	var maxprop = getMostPopularAttrValue(tags,placed);
	if(!maxprop){
		optimizeAttrOrder(tags,placed);
		return;
	}
	console.log('Наиболее частотная пара атрибут-значение: '+maxprop)
	var etalAttr = maxprop.split('="')[0];
	var etalValue = maxprop.split('="')[1].split(/"$/)[0];
	console.log(etalAttr,etalValue);
	var touchedTags=[], untouchedTags=[];
	for(var i=0; i<tags.length; i++){
		if(tags[i].attribs[etalAttr] === etalValue){
			movePropToIndex(tags[i].attribs,etalAttr,placed);
			touchedTags.push(tags[i]);
		} else {
			untouchedTags.push(tags[i]);
		}
	}
	optimizeAttrValueOrder(touchedTags,placed+1);
	optimizeAttrValueOrder(untouchedTags,placed);
}




fs.writeFileSync(
	filename+'.htmlszhat',
	szhat(fs.readFileSync(filename,'utf-8'))
);

fs.writeFileSync(
	filename+'.htmlorig',
	cheerio.load(fs.readFileSync(filename,'utf-8'),{decodeEntities: false}).html()
);
