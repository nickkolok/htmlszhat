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

function sortArrayByFrequence(chars,freq){

	chars.sort(function(a,b){
		return freq[b]-freq[a];
	});
	while(!freq[chars[chars.length-1]]){
		chars.length--;
	}
	return chars;

}









function getClassFrequency(tags,placed){
	var freq = {};
	for(var i=0; i<tags.length; i++){
		if(!(tags[i].attribs['class'])){
			continue;
		}
		var classes = tags[i].attribs['class'].split(' ');
		for(var j=placed; classes && j < classes.length; j++){
			safeinc(freq,classes[j]);
		}
	}
	return freq;
}

function classToPosition(tag,className,position){
	var classArray = tag.attribs['class'].split(' ');
	for(var i=0; i<classArray.length; i++){
		if(classArray[i]===className){
			classArray.splice(i,1);
			break;
		}
	}
	classArray.splice(position,0,className);
	tag.attribs['class'] = classArray.join(' ');
}

function hasClass(tag,className){
	if(!(tag.attribs['class'])){
		return false;
	}
	var classArray = tag.attribs['class'].split(' ');
	for(var i=0; i<classArray.length; i++){
		if(classArray[i]===className){
			return true;
		}
	}
	return false;
}

function filterTagsWithTooFewClasses(tags,count){
	var goodTags=[];
	for(var i=0; i<tags.length; i++){
		if(!(tags[i].attribs['class'])){
			continue;
		}
		if(tags[i].attribs['class'].split(' ').length>count){
			goodTags.push(tags[i]);
		}
	}
	return goodTags;
}

function optimizeClassOrder(tags,placed){
	tags = filterTagsWithTooFewClasses(tags,placed);
	if(tags.length < 2){
		return;
	}
	var freq = getClassFrequency(tags,placed);
	var maxclass = getMaxProp(freq);
	console.log('Наиболее частотный класс в блоке: '+maxclass)
	var touchedTags=[], untouchedTags=[];
	for(var i=0; i<tags.length; i++){
		if(hasClass(tags[i],maxclass)){
			classToPosition(tags[i],maxclass,placed);
			touchedTags.push(tags[i]);
		} else {
			untouchedTags.push(tags[i]);
		}
	}
	optimizeClassOrder(untouchedTags,placed);
	optimizeClassOrder(touchedTags,placed+1);
}


function szhat(html){
	var $ = cheerio.load(html,{decodeEntities: false});

	var tags = filterFrequency(getTagsFrequency($));
	for(var tag in tags){
		console.log('Оптимизируется расположение атрибутов у тэгов <'+tag+'>');
		optimizeAttrOrder($(tag),0);
	}
	console.log('Оптимизируется перестановка классов...');
	optimizeClassOrder($('*'),0);

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
	console.log('Изучается блок:');
	logTagsArray(tags);
	console.log('Уже отсортировано атрибутов: '+placed);
	console.log('Наиболее частотный атрибут в блоке: '+maxprop)

	var touchedTags=[], untouchedTags=[];
	for(var i=0; i<tags.length; i++){
		if(maxprop in tags[i].attribs){
			console.log('Было:');
			logTag(tags[i]);
			movePropToIndex(tags[i].attribs,maxprop,placed);
			console.log('Стало:');
			logTag(tags[i]);
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
