var express = require('express');
var router = express.Router();
var moment = require('moment');

var fs = require('fs');
var path = require('path');
var nets = require('net');
var pages = [];
var page = [];
var timetable = [];
var calWeeks = [];
var message = {"message":"myDarling", "id":33333};
var objdata = require(path.join(__dirname, 'Master_MIE_Pflicht.json'));



pages = objdata.formImage.Pages;
for (var p = 0; p < pages.length; p++) {

    var lines = removeDuplicates(pages[p].VLines); //pdf2Json does not represent PDF line as it is, so remove duplicate lines
    var daysInWeek = getNumberOfWeekDays(lines);    //finds number of days by detecting vertical lines with estimated length
    var dayCounter = 0;
    var lineHeight;
    var lineDistance;
    var exactLineDistance;
    var xStartPosition = lines[0].x;

    //loop to detect vertical line height and distance in single day of a page
    for(var i=50;i<100;i++){
        if(lines[i].l > 4){
            lineHeight = lines[i].l;
            lineDistance = ((lines[i+1].x +0.1 - lines[i].x).toFixed(2)); //exaggerated line
            exactLineDistance = (lines[i+1].x  - lines[i].x);
            break;
        }

    }

    //detect where vertical lines has gap, the gap will represent a class

    for (var w=0; w < lines.length-1; w++) {

        if( (lines[w].x - lines[w+1].x) > 40)
            dayCounter++;


        if( !(lines[w].x == xStartPosition)){ //the first vertical line belongs to days name such as Mo, Di, and Mi
           var classLineIntervels =  lines[w+1].x - lines[w].x;
            if (classLineIntervels <= lineDistance) {
            } else { //find distance of current line against next line in loop and compare with standard distance
                var durationInMinutes = ( classLineIntervels / exactLineDistance * 15);
                var startTime = 0, endTime = 0;
                if ((lines[w].x - lines[1].x) > 0.3) {
                    startTime = ( ( ((lines[w].x - lines[1].x) / exactLineDistance) * 15 ) + (8.25 * 60));

                }
                else {
                    startTime = (8.25 * 60);
                }
                //console.log("start: " + Number(startTime/60) + " : endTime: " + Number( (durationInMinutes + startTime)) + ":" + ((startTime + endTime) % 60) );
                endTime = (Math.floor((startTime + durationInMinutes) / 60) + ":" +round( (startTime + durationInMinutes),1) % 60 );
                startTime = (Math.floor(startTime / 60)) + ":" + round(startTime ,1) % 60;
                for (var s = 0, t = getCalWeeks(pages[p].Texts); s < t.length; s++) {
                    var date = getDateOfISOWeek(Number(t[s]), getYear(pages[p].Texts));
                    var classDetail = getClassDetails(pages[p].Texts, lines[w].x, Number(lines[w].x + classLineIntervels), lines[w].y, Number(lines[w].y + lineHeight));

                    console.log(lines[w].x);
                    console.log(Number(lines[w].x + classLineIntervels));
                    console.log(lines[w].y);
                    console.log(Number(lines[w].y + lineHeight));

                    console.log(classDetail);
                    date.setDate(date.getDate() + dayCounter);
                    date = date.toJSON().slice(0,10);
                    //console.log(date+"."+startTime +"-" + endTime);
                    //console.log(getCalWeeks(pages[p].Texts)[n]);
                    console.log(classDetail[0]);
                    timetable.push({ "date":date,"sTime": startTime, "eTime": endTime,"name": classDetail[0], "detail":classDetail[1]});
                }




            }
        }
    }

} fs.writeFile('./timetable2.json', JSON.stringify(timetable, null, 2) , 'utf-8');

console.log(getCalWeeks(pages[3].Texts));
//console.log(timetable.sort(function compare(a,b){ return new Date(a.date).getTime() - new Date(b.date).getTime();}));


function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}



function compare(a, b) {
    if (a.y < b.y)
        return -1;
    if (a.y > b.y)
        return 1;
    if (a.x < b.x)
        return -1;
    if (a.x > b.x)
        return 1;
    return 0;
}

function removeDuplicates(vLines) { //receives Vlines
    var arrResult = [];
    var nonDuplicatedArray = [];
    for ( i = 0, n = vLines.length; i < n; i++) {
        var item = vLines[i];
        arrResult[item.x + " - " + item.y] = item; // create associative array
    }

    var j = 0;
    for (var item in arrResult) {

        nonDuplicatedArray[j++] = arrResult[item]; // copy the objects that are now unique
    }
    for(var i = nonDuplicatedArray.length -1;i>=0;i--){
         if(nonDuplicatedArray[i].l < 2){
             nonDuplicatedArray.splice(i,1);
         }
     }

    return nonDuplicatedArray.sort(compare);
}


//console.log(unescape(objdata.formImage.Pages[0].Texts));

function getCalWeeks(txt){
    var weeks = [];
    var extTxt;
    var rawWeeksTxt;

    for(var i=0, n= txt.length; i< n-1;i++){
        if((txt[i].y > 1) && (txt[i].y < 2)){
            if(txt[i].R[0].T != null)
                extTxt += txt[i].R[0].T;
        }
    }
    extTxt = unescape(extTxt);
    rawWeeksTxt = extTxt.substr(extTxt.indexOf("Kalenderwoche:")+14,extTxt.indexOf("Datum:") -
        (extTxt.indexOf("Kalenderwoche:")+14));


    for( var i = 0,  temp = rawWeeksTxt.split(",");i < temp.length; i++){ // if there are multiple weeks in single page
        if(temp[i].indexOf("-") != -1) {
            var temp2 = temp[i].split("-");
            var from = temp2[0].trim();
            var to = temp2[1].trim();



            for (var j = 0; j <=(to - from); j++) {
                weeks.push(Number(from) + j);
            }

        }
        else
        {
            weeks.push(temp[i].trim());
        }
    }

    return weeks;
}


function getClassDetails(txt, x1, x2, y1, y2){
    var extTxt;

    var classDetail = ["",""];

    for(var i=0, n= txt.length; i< n;i++){
        if(( Number(txt[i].y + 0.2) >= y1) && (Number(txt[i].y +0.128) <= y2) && (txt[i].x >= x1, txt[i].x <= x2)){

            if( Number(txt[i].R[0].T) != 0) {
                if(txt[i].R[0].TS[2] == 1){
                    classDetail[0] += txt[i].R[0].T + " ";

                }
                else{ classDetail[1] += txt[i].R[0].T + " ";}
            }

            classDetail[0] =  unescape(classDetail[0].replace(/%C3%9C/g, 'Ü'));
            classDetail[1] = unescape(classDetail[1].replace(/%C3%B6/g,'ö'));
        }

    }


    return classDetail;

}


function getNumberOfWeekDays(lines) {


    var days = 1;

    for (var k = 0; k < lines.length - 2; k++) {
        if (lines[k].y > 3.3) {//checks if lines relates to day row and does goes to null in vlines
            if (lines[k].y < lines[k + 1].y) {
                days++;
            }
        }
    }
    return days;
}

function getDateOfISOWeek(w, y) {

    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOWeekStart = simple;
    if (dow <= 4)
        ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    ISOWeekStart.setHours(-(ISOWeekStart.getTimezoneOffset() / 60));

    return ISOWeekStart;
} // thanks to Jordan Trudgatt

function getYear(txt){
    var extTxt;
    var result=0;
    for(var i=0, n= txt.length; i< n-1;i++){
        if((txt[i].y > 1) && (txt[i].y < 2)){
            if(txt[i].R[0].T != null)
                extTxt += txt[i].R[0].T;
        }
    }
    extTxt = unescape(extTxt).trim();
    var rawWeeksTxt = extTxt.substr(extTxt.indexOf("bis:")-1,2);

    result = "20" + rawWeeksTxt.trim();
    return result;
}

/* GET home page. */
router.get('/', function (req, res, next) {

    res.render('complicated', {"I":"I"});
});

module.exports = router;
