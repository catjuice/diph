// JavaScript Document

var map, map2,diph_layers,diphSettings, projectID, mObject,lookupData, lookupParents,markerObject,catFilter,player,clipPosition,dataObject,tcArray;
//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

var projectID = $('.post').attr('id')

$('#map_marker').append('<div class="info"></div><div class="av-transcript"></div>');
//$('#map_marker .av-transcript').append('<audio id="av-player" src="http://msc.renci.org/dev/wp-content/uploads/2013/02/03-Submarines.mp3" type="audio/mp3" controls="controls"></audio>');
//player = new MediaElementPlayer('#av-player', {enablePluginDebug: true, mode:'shim',features: ['playpause','progress','current','duration','volume']});
var videoHasPlayed = false;
var ajax_url = diphData.ajax_url;

diphSettings = JSON.parse(diphData.settings);
diphMap = diphData.map;
// console.log('map ')
// console.log(diphMap)
// console.log('setttings ')
//console.log(diphSettings)

// console.log('layers ')
// console.log(diphData.layers)
if(diphSettings['views']['map-fullscreen']==true){
    $('body').addClass('fullscreen');
    $('.diph-nav .fullscreen').addClass('active');
}

$('<style type="text/css"> @media screen and (min-width: 600px) { #map_div{ width:'+diphSettings['views']['map-width']+'px; height:'+diphSettings['views']['map-height']+'px;}} </style>').appendTo('head');

var layerCount = Object.keys(diphData.layers).length; 
  diph_layers = [];
    for(i=0;i<layerCount;i++) {
        //console.log(diphData.layers[i].name)
        if(diphData.layers[i]['mapType']=='type-OSM') {
            diph_layers[i] = new OpenLayers.Layer.OSM(); 
        }
        if(diphData.layers[i]['mapType']=='type-Google') {
            diph_layers[i] = new OpenLayers.Layer.Google(diphData.layers[i]['name'], // the default
            {   type:diphData.layers[i]['mapTypeId'], numZoomLevels: 20}); 
            //console.log(diphData.layers[i]['mapTypeId'])
        }
        if(diphData.layers[i]['mapType']=='type-CDLA') {
            cdla.maps.defaultAPI(cdla.maps.API_OPENLAYERS);
            // create the cdla.maps.Map object
            var cdlaObj = new cdla.maps.Map(diphData.layers[i].mapTypeId);
        
            // add the map layer
            //map.addLayers([hwymap.layer()]);
            diph_layers[i] = cdlaObj.layer(); 
        }

    }
 $('#secondary').prepend('<div id="legends" class="span4"><div class="legend-row row-fluid"></div></div>');
$('#main').prepend('<div class="diph-nav nav-fixed-top navbar"><div class="navbar-inner"><ul class="nav nav-pills ">\
      <li class="dropdown">\
        <a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="icon-list"></i>  Legends<b class="caret"></b></a>\
        <ul class="dropdown-menu">\
              <!-- links -->\
        </ul>\
      </li>\
      <li class="layers"><a href="#layers-panel"><i class="icon-tasks"></i> Layers </a></li>\
      <li class="fullscreen" ><a href="#"><i class="icon-fullscreen"></i> Fullscreen map </a></li>\
    </ul></div>');
var gg = new OpenLayers.Projection("EPSG:4326");
var sm = new OpenLayers.Projection("EPSG:900913");

markerObject = new Object();
lookupParents = new Object();
catFilter = new Object();

//var osm = new OpenLayers.Layer.OSM(); 
     
map = new OpenLayers.Map({
    div: "map_div",
    projection: sm,
	displayProjection: gg
    
});
map.addLayers(diph_layers);
//load layers here

//map.addControl(new OpenLayers.Control.LayerSwitcher());
var lonlat_default = new OpenLayers.LonLat(0,0);
lonlat_default.transform(gg, map.getProjectionObject());
map.setCenter(lonlat_default, 3);



var lonlat = new OpenLayers.LonLat(diphMap['lon'],diphMap['lat']);
lonlat.transform(gg, map.getProjectionObject());

map.setCenter(lonlat, diphMap['zoom']);

var context = {
                
    getIcon: function(feature) {
        var cats;
        if(feature.cluster) {
            cats = feature.cluster[0].attributes.categories;
        }
        else {    
            cats = feature.attributes["categories"];
        }
        var highParentI ='';
        if(cats) {
            highParentI = getHighestParentIcon(cats);           
        }
        if(!highParentI){
            return '';
        }
        else {
            return highParentI;
        }
    },
    getColor: function(feature) {
        var cats;
        if(feature.cluster) {
            cats = feature.cluster[0].attributes.categories;
        }
        else {    
            cats = feature.attributes["categories"];
        }
        var highParentI ='';
        if(cats) {
            highParentI = getHighestParentColor(cats);            
        }

        return highParentI;
    },
    getLabel: function(feature) {
        if(feature.cluster.length>1) {
            return feature.cluster.length;
        }
        else {
            return '';
        }
    }
};

var template = {
    fillColor: "${getColor}",
    strokeColor: "#333333",
    pointRadius: 10, // using context.getSize(feature)
    width:20,
    externalGraphic: "${getIcon}", //context.getIcon(feature)
    graphicZIndex: 1
    // ,
    // label:"${getLabel}"
};
            
var style = new OpenLayers.Style(template, {context: context});
strategy = new OpenLayers.Strategy.Cluster();
strategy.distance = 1;

mObject = new OpenLayers.Layer.Vector(diphMap['marker-layer'],{
    strategies: [strategy],
    rendererOptions: { zIndexing: true }, 
    styleMap: new OpenLayers.StyleMap(style)
});    


           
selectControl = new OpenLayers.Control.SelectFeature(mObject,
    { onSelect: onFeatureSelect, onUnselect: onFeatureUnselect, hover: false });

hoverControl = new OpenLayers.Control.SelectFeature(mObject, 
    { hover: true, highlightOnly: true, renderIntent: "temporary" });

loadMarkers(projectID,mObject);   

//mObject.id = "Markers";       
map.addLayer(mObject);
map.addControl(hoverControl);
map.addControl(selectControl);
 
hoverControl.activate();  
selectControl.activate(); 
$('.diph-nav .fullscreen').click(function(){
    if($('body').hasClass('fullscreen')) {
        $('body').removeClass('fullscreen');
        $('.diph-nav .fullscreen').removeClass('active');
        map.updateSize();
    }
    else {

        $('body').addClass('fullscreen');
        $('.diph-nav .fullscreen').addClass('active');
        map.updateSize();
    }
});

//geocodeAddress('310 Meredith St');
function createLookup(filter){
    catFilter = filter;

    var lookupData = filter.terms;
    var countTerms = Object.keys(lookupData).length; 
  
    for(i=0;i<countTerms;i++) {
        var tempName = lookupData[i].name;
        lookupParents[tempName];
        lookupParents[tempName] = { externalGraphic : lookupData[i].icon_url };
        
    }
    //alert(JSON.stringify(lookupParents));
    return lookupParents;
   
}
/*  Filter logic
 *  
 */
function getHighestParentIcon(categories) {

    
    var countTerms = Object.keys(lookupData).length; 
    var countCats = categories.length;
    for(i=0;i<countTerms;i++) {

        for(j=0;j<countCats;j++) {

            var tempName = lookupData[i].name;
            if (tempName==categories[j]) {
                if(lookupData[i].icon_url.substring(0,1) == 'h') {
                    
                    return lookupData[i].icon_url;
                }
                else {
                    return '';
                }
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                       if(lookupData[i].icon_url.substring(0,1) == 'h') {
                            return lookupData[i].icon_url;
                        }
                        else {
                            return '';
                        }
                    }
                }
            }
       }
        
    }

}
function getHighestParentColor(categories) {


    var countTerms = Object.keys(lookupData).length; 
    //console.log(categories)
    var tempCats = categories;
    var countCats =  Object.keys(tempCats).length; 

    for(i=0;i<countTerms;i++) {
        for(j=0;j<countCats;j++) {
            
            var tempName = lookupData[i].name;
            
            if (tempName==tempCats[j]) {
                if(lookupData[i].icon_url.substring(0,1) == '#') {
                    //console.log(tempName)
                    return lookupData[i].icon_url;
                }
                else {
                    return '';
                }
            }
            else {
                //for each child cat
                if(lookupData[i].children.length>0) {
                    //console.log(lookupData[i].children)
                    var tempChildren = lookupData[i].children;
                    var tempChildCount = Object.keys(lookupData[i].children).length;
                    
                    for (k=0;k<tempChildCount;k++) {
                        if(tempChildren[k]==tempCats[j]) {
                           if(lookupData[i].icon_url.substring(0,1) == '#') {
                                //console.log(lookupData[i].children)
                                //console.log(tempCats[j])
                                return lookupData[i].icon_url;
                            }
                            else {
                                return '';
                            }
                        }
                    }
                }
            }
       }
        
    }

}
function getHighestParentDisplay(categories) {
    var lookupData = catFilter.terms;
    var countTerms = Object.keys(lookupData).length; 
    var countCats = categories.length;
    for(i=0;i<countTerms;i++) {

        for(j=0;j<countCats;j++) {

            var tempName = lookupData[i].name;
            if (tempName==categories[j]) {              
                return true;
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                        return 'none';
                    }
                }
            }
        }        
    }
}
/*  Create filter control legend
 *
 */
function createLegend(object) {
    //sets the order
    $(document).bind('order.findSelectedCats',function(){ lookupData= findSelectedCats();});
    $(document).bind('order.updateLayerFeatures',function(){ updateLayerFeatures(lookupData);});

    //console.log('here'+_.size(object));
    var legendHtml;
    var legendWidth;
    var mapPosition = $('#map_div').position();
    var mapWidth = $('#map_div').width();
    var pageWidth = $('body').width();
    var pageHeight = $('body').height();
    var spaceRemaining = pageWidth-mapWidth;

    var rightDiv = mapPosition.left + 50;
    var topDiv = mapPosition.top + 40;
    
    //create new legend with bootstrap collapse
    var newLegendsHtml = $('<div class="new-legends"/>');
    _.map(object, function(val,key) {
        $(newLegendsHtml).append('<div class="legend-'+key+'" />');
        $('.legend-'+key, newLegendsHtml).append('<h3>'+val.name+'</h3>');
        $('.legend-'+key, newLegendsHtml).append('<div class="accordion" id="accordion-'+key+'" />');
        console.log('Legend Name: '+val.name)
        console.log(val)
        //display legend terms
        _.map(val.terms, function(val2,key2) {
            if(val.name!=val2.name) {
                console.log('Term: '+val2.name)
                var firstIconChar = val2.icon_url.substring(0,1);
                var icon;
                if(firstIconChar=='#') { icon = 'background:'+val2.icon_url+';'; }
                else { icon = 'background: url(\''+val2.icon_url+'\') no-repeat center;'; }

                var tempLink = $('<div/>');
                $(tempLink).append('<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion-'+key+'" href="#term-'+key+key2+'">'+val2.name+'</a>');

                var tempGroup = $('<div/>');
                $(tempGroup).append('<div class="accordion-heading"><input type="checkbox" checked="checked"><p class="icon-legend" style="'+icon+' display: inline-block; width: 15px; height: 15px; margin-top: 10px;"></p>'+$(tempLink).html()+'</div>');
                
                //children terms
                if(val2.children.length>0) {
                    $(tempGroup).append('<div id="term-'+key+key2+'" class="accordion-body collapse"><div class="accordion-inner" /></div>');
                }
                _.map(val2.children, function(val3,key3) {
                    console.log('Children Terms: '+val3)
                    $('.accordion-inner', tempGroup).append(val3+'<br/>');
                });
                $('#accordion-'+key, newLegendsHtml).append('<div class="accordion-group">'+$(tempGroup).html()+'</div>')

            }
        });
    });
    //$('#legends').append(newLegendsHtml)
    for (j=0;j<Object.keys(object).length;j++) {
       
        var filterTerms = object[j].terms;
        var legendName = object[j].name;
        var countTerms = Object.keys(filterTerms).length; 
        
        legendHtml = $('<div class="'+legendName+' legend-div span12 row" id="term-legend-'+j+'"><ul class="terms"></ul></div>');
        for(i=0;i<countTerms;i++) {
            if(legendName!=filterTerms[i].name) {
                var firstIconChar = filterTerms[i].icon_url.substring(0,1);
                var icon;
                if(firstIconChar=='#') { icon = 'background:'+filterTerms[i].icon_url; }
                else { icon = 'background: url(\''+filterTerms[i].icon_url+'\') no-repeat center;'; }

                if(i>50) {
                $('ul', legendHtml).append('<li><input type="checkbox" ><p class="icon-legend" style="'+icon+'"></p><a class="value">'+filterTerms[i].name+'</a></li>');
                }
                else {
                  $('ul', legendHtml).append('<li><input type="checkbox" checked="checked"><p class="icon-legend" style="'+icon+'"></p><a class="value">'+filterTerms[i].name+'</a></li>');
                  
                }
            }
        }
        //$('ul',legendHtml).prepend('<li><input type="checkbox" ><a class="value">All</a></li>');
       

        $('#legends .legend-row').append(legendHtml);
        $('.diph-nav .dropdown-menu').append('<li><a href="#term-legend-'+j+'">'+legendName+'</a></li>');
    }


        //$('#legends').css({'left':0, 'top':50,'z-index':19});
        $('#legends').prepend('<a class="legend-resize btn pull-right" href="#" alt="mini"><i class="icon-resize-small"></i></a>');
        $('.legend-resize').hide();
        $('#legends').hover(function(){
            $('.legend-resize').fadeIn(100);
        },
        function() {
            $('.legend-resize').fadeOut(100);
        });
        $('.legend-resize').click(function(){

            if($('#legends').hasClass('mini')) {
                $('.terms .value').show();
            $('#legends').animate({width: legendWidth}, 500 );
            $('#legends').removeClass('mini');
            }
            else {
                //console.log($('#legends').width())
                legendWidth = $('#legends').width();
                $('.terms .value').hide();
                $('#legends').animate({width: 70}, 500 );
                $('#legends').addClass('mini');
            }

        });
        //$('#legends').css({
        $('.active-legend').mousemove(function(e){
            var xpos = e.pageX - 250;
            var ypos = e.pageY + 15;
            //$('#child_legend-'+j+'').css({'left':xpos,'top':ypos});
        });
        //var childrenLegendHtml = $('<div id="child_legend-'+j+'"><h3>Children Terms</h3><ul></ul></div>');
        //$('body').append(childrenLegendHtml);
        //$('#child_legend-'+j+'').css({'width':'200px','margin-left':'200px','top':'40px','position':'absolute','z-index': '2001' });
        
        $('#legends ul.terms li a').click(function(event){
            var spanName = $(this).text();
            //console.log(spanName);
            $('.active-legend ul input').removeAttr('checked');
            $('.active-legend ul.terms li.selected').removeClass('selected');
            $(this).closest('li').addClass('selected');
            $(this).closest('li').find('input').attr('checked',true);
            //console.log(spanName)
            lookupData = findSelectedCats(spanName); 
            //console.log('single object '+tempO)
            //console.log('fires how many times')
            updateLayerFeatures(lookupData);
        });
        // $('#term-legend-'+j+' ul.terms li').hover(function(){
        //     $('#child_legend-'+j+'').show();
        //     var childrenLegend = _.where(filterTerms, {name: $(this).find('a').text()})
            
        //     $(childrenLegend[0].children).each(function(){
        //         $('ul', childrenLegendHtml).append('<li>'+this+'</li>')
        //     });
        // }, 
        // function() {
        //     $('#child_legend-'+j+' ul li').remove();
        //     $('#child_legend-'+j+'').hide();
        // });
        $('#legends ul.terms input').click(function(){
            lookupData = findSelectedCats(); 
            //console.log(tempO)       
            updateLayerFeatures(lookupData);
        });
        $('ul.controls li').click(function(){
            $('.active-legend ul input').attr('checked',true);
            //$('.active-legend ul.terms li').css({'background': 'none'});
           //lookupData = findSelectedCats(); 
            //console.log(tempO)       
            //updateLayerFeatures(lookupData);
            
        });
    $('#legends .legend-row').append('<div class="legend-div span12" id="layers-panel"><ul></ul></div>');
    $('.legend-div').hide();
    $('#term-legend-0').show();
    $('#term-legend-0').addClass('active-legend');
    $('.diph-nav .dropdown-menu a').click(function(evt){
        evt.preventDefault();
        var action = $(this).attr('href');
        var filter = $(this).text();
        $('.legend-div').hide();
        $('.legend-div').removeClass('active-legend');
        $(action).addClass('active-legend');
        
        $(action).show();
        switchFilter(filter);
    });
    $('.diph-nav .layers a').click(function(evt){
        evt.preventDefault();
        var action = $(this).attr('href');
        var filter = $(this).text();
        $('.legend-div').hide();
        $('.legend-div').removeClass('active-legend');
        $(action).addClass('active-legend');
        
        $(action).show();
        
    });

    $('.launch-timeline').click(function(){
        loadTimeline('4233');  
    });
    lookupData = findSelectedCats();

    buildLayerControls(map.layers);
}
function buildLayerControls(layerObject) {
    //console.log(map.layers);
    _.map(layerObject,function(layer,index){
        //console.log(layer.name)
        if(index>=0) {
            $('#layers-panel ul').append('<li class="layer'+index+' row-fluid"><div class="span12"><input type="checkbox" checked="checked"><a class="value" id="'+layer.id+'">'+layer.name+'</a></div><div class="span11"><div class="layer-opacity"></div></div></li>');
            //slider for layer opacity
            $( '.layer'+index+' .layer-opacity').slider({
                range: false,
                min: 0,
                max: 1,
                step:.05,
                values: [ 1 ],
                slide: function( event, ui ) {  
                //console.log(index)          
                  map.layers[index].setOpacity(ui.values[ 0 ]);                
                }
            });
            //click
            //
            $( '.layer'+index+' input').click(function(){
               if($(this).attr('checked')) {
                //console.log('check')
                layerObject[index].setVisibility(true);

               }
               else {
                //console.log('uncheck')
                layerObject[index].setVisibility(false);
               }
            })
            //$(layerObject[index]).setVisibility(false);
        }
        
    });
    }
function switchFilter(filterName) {
    var filterObj = _.where(dataObject, {type: "filter", name: filterName});
    catFilter = filterObj[0];
    $(document).trigger('order.findSelectedCats').trigger('order.updateLayerFeatures');
    selectControl.activate(); 
}
function updateLayerFeatures(catObject){
    //find all features with cat
    //lookupData = findSelectedCats(); 
    //catObject = lookupData;
    var newFeatures = {type: "FeatureCollection", features: []};
    var childCatObject = [];
 
    _.map(catObject,function(cat,i){
        childCatObject.push(cat.name);

        if(cat.children.length>0){
            var tempChildren = cat.children;
            _.map(tempChildren, function(catChild,i) {
                childCatObject.push(catChild);
            });
        }
    });

    newFeatures.features = _(markerObject.features).select(function(feature){ 
        if(_.intersection(feature.properties.categories,childCatObject).length > 0) {         
           return feature;
        }
    });
    var reader = new OpenLayers.Format.GeoJSON({
        'externalProjection': gg,
        'internalProjection': sm
    });

    var featureData = reader.read(newFeatures);
    var myLayer = map.layers[diphMap['layers'].length];
    
    myLayer.removeAllFeatures();
    myLayer.addFeatures(featureData);
}



//rewrite this to eliminate loop
function findSelectedCats(single) {
    //console.log(single);

    var selCatFilter = new Object();
    var countTerms = Object.keys(catFilter.terms).length; 

    if(!single) {

        $('#legends .active-legend input:checked').each(function(index){
            var tempSelCat = $(this).parent().find('.value').text();
            //console.log(tempSelCat+' :'+index)
            for(i=0;i<countTerms;i++) {
                var tempFilter = catFilter.terms[i].name;
                if(tempFilter==tempSelCat) {
                    selCatFilter[index] = catFilter.terms[i];
                    
                }
            }
        });
    }
    else {
        var tempSelCat = single;
        for(i=0;i<countTerms;i++) {
            var tempFilter = catFilter.terms[i].name;
            if(tempFilter==tempSelCat) {
                selCatFilter[0] = catFilter.terms[i];
            }
        }
    }

    return selCatFilter;
}
function convertToMilliSeconds(timecode) {
    var tempN = timecode.replace("[","");
    var tempM = tempN.replace("]","");
    var tempArr = tempM.split(":");

    var secondsCode = parseInt(tempArr[0])*3600 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
    var milliSecondsCode = secondsCode*1000;

    return milliSecondsCode;
}
function geocodeAddress(addy){
	//http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false
	jQuery.ajax({
        type: 'POST',
        url: 'http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false',
        dataType:'jsonp',
        data: {
            address: addy
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log('geocode: '+textStatus);
            //console.log(data);
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
function onFeatureSelect(feature) {
	// if not cluster

	//if(!feature.cluster||(feature.attributes.count==1)) {
        var tempModalHtml;
        if(feature.cluster){selectedFeature = feature.cluster[0];}
        else {selectedFeature = feature;}
            
        tempModalHtml = $('<div><ul/></div>');

		 var pageLink = selectedFeature.attributes.link;
		 var titleAtt;
         var tagAtt =  selectedFeature.attributes.categories;
         var audio =  selectedFeature.attributes.audio;
         var transcript =  selectedFeature.attributes.transcript;
         var timecode =  selectedFeature.attributes.timecode;
         var time_codes = timecode.split('-');
         clipPosition = time_codes[0];
         var thumb;
        
        if(timecode) { 
            var startTime = convertToMilliSeconds(time_codes[0]);
            var endTime = convertToMilliSeconds(time_codes[1]);
            //loadTranscriptClip(projectID,transcript,timecode);
            console.log(time_codes[0])
             //$('#map_marker .av-transcript').append('File sizes are too large to load on page. Link to page to listen to audio.');

        }
         if(diphSettings['views']['title']) {
            var titleAtt =  selectedFeature.attributes['title'];
         }
         if(diphSettings['views']['modal-ep'][0]=='transcript') {
            console.log('ep:')
            console.log(diphSettings['views']['modal-ep'])

            $('#markerModal').addClass('transcript');
            _.map(diphSettings['views']['modal-ep'],function(val,key) {

                loadTranscriptClip(projectID,transcript,timecode);

                $('ul', tempModalHtml).append('<li class="transcript-ep"><p class="pull-right"><a class="btn btn-success seek-override" type="button" data-seek="'+startTime+'">Seek to: '+time_codes[0]+'</a><iframe id="ep-player" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+audio+'&show_artwork=true"></iframe></p></li>');
            });
         }
         if(diphSettings['views']['content']) {
            //var titleAtt =  selectedFeature.attributes['title'];
            //var contentAtt;
            //$('#map_marker .info ul').append($('<ul/>'));
            $('ul', tempModalHtml).append('<li><h3>Details:</h3></li>');
            _.map(selectedFeature.attributes.content,function(val,key) {
                 _.map(val,function(val1,key1) {
                    if(val=='Thumbnail Right') {
                        $('ul', tempModalHtml).append('<li class="thumb-right">'+$("<div/>").html(val1).text()+'</li>');
                    }
                    else if(val=='Thumbnail Left') {
                        $('ul', tempModalHtml).append('<li class="thumb-left">'+$("<div/>").html(val1).text()+'</li>');
                    }
                    else {
                        $('ul', tempModalHtml).append('<li>'+key1+': '+$("<div/>").html(val1).text()+'</li>');
                    }
                });
              });
         }
         if(diphSettings['views']['content']) {

         }
         
		 
		 if(selectedFeature.attributes.thumb){
			 thumb = selectedFeature.attributes.thumb;
			 var thumbHtml = '<img src="'+thumb+'"/><br/>';
			 }
		 var li = '<b>'+titleAtt+'</b>';
		 //for(var attr in selectedFeature.attributes){
         //   li += "<li><div style='width:25%;float:left'>" + attr + "</div><div style='width:75%;float:right'>" 
         //   + selectedFeature.attributes[attr] + "</div></li>";
        //	}
		li += '<p>';
		if(thumbHtml){
			li+= thumbHtml;
		}
		
		li += tagAtt+' '+audio+' '+transcript+' '+timecode+'</p>';
        if(pageLink!='no-link') {
            li += '<a href="'+pageLink+'" target="_blank">More Info</a>';
        }
		 //alert("clicked "+description+" "+thesecats);
		
        //$('#av-transcript').get(0).setSrc(audio);
        //player.pause();
		
        //console.log(timecode)
        
        

        //tb_show(titleAtt, '#TB_inline?height=480&width=400&inlineId=map_marker' );
        $('#markerModal #markerModalLabel').empty().append(titleAtt);


        $('#markerModal .modal-body').empty().append(tempModalHtml);
        $('#markerModal .modal-footer .btn-success').remove();
        if(pageLink!='no-link') {
            $('#markerModal .modal-footer').prepend('<a target="_blank" class="btn btn-success" href="'+pageLink+'"><i class="icon-volume-down icon-white"></i> <i class="icon-indent-left icon-white"></i> Link</a>');
        }
        $('#markerModal').modal('show');
        
        //build function to load transcript clip and load media player
        var iframeElement   = document.querySelector('.player');
        var soundUrl = 'http://soundcloud.com/sohp/u0490-audio';
        //iframeElement.src = widgetUrl;
        console.log(iframeElement)
        var iframeElementID = iframeElement.id;
        var widget         = SC.Widget(iframeElement);
        var widget2         = SC.Widget(iframeElementID);
        var WIDGET_PLAYING = false;
        widget2.bind(SC.Widget.Events.READY, function() {
              // load new widget
              //widget2.play()
             widget2.bind(SC.Widget.Events.PLAY, function() {
                console.log('playing')
                WIDGET_PLAYING = true;
                widget2.seekTo(startTime);
             });
             widget2.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {
                
                if(e.currentPosition<startTime){
                    //console.log(e)
                    widget2.seekTo(startTime);
                }
                if(e.currentPosition>endTime){
                    //console.log(e)
                    widget2.pause();
                }
                hightlightTranscriptLine(e.currentPosition);
             });
            widget2.bind(SC.Widget.Events.SEEK, function() {
                console.log('seeked')
                
            });
            widget2.bind(SC.Widget.Events.FINISH, function() {
            
            });
            $('.seek-override').on('click',function(){
                console.log($(this).attr('data-seek'));
                widget2.seekTo(startTime);
            });
        });

        $('#markerModal').on('hidden', function () {
            //selectControl.unselect(feature);
           
            if(WIDGET_PLAYING) {
                var tempWidget = SC.Widget(iframeElementID);
                tempWidget.pause();
            }
            
        });
        
	
}   
function hightlightTranscriptLine(millisecond){
    var foundIndex;
    _.map(tcArray, function(val,index){
        if(millisecond>=val&&millisecond<tcArray[index+1]){
            $('.transcript-list li.type-timecode').removeClass('current-clip');
            $('.transcript-list li.type-timecode').eq(index).addClass('current-clip');
        }
    });
    
    //$('.type-timecode').attr('data-timecode');
} 
function onFeatureUnselect(feature) {
	feature.attributes.poppedup = false;
} 
function splitTranscript(transcriptData) {
    var transcriptArray = transcriptData.split('[');
    console.log(transcriptArray)
}
/**
 * [formatTranscript: cleans up quicktime text, formats transcript and puts it in a list]
 * @author  joeehope
 * @version version
 * @param   {string} dirty_transcript [quicktime text format]
 * @return  {html}  $transcript_html  [html unordered list]
 */
function formatTranscript(dirty_transcript) {
    // split into array by line
    var split_transcript = dirty_transcript.split('\n');
    tcArray = [];
    if(split_transcript) {
        var $transcript_html = $('<ul class="transcript-list"/>');
        _.map(split_transcript, function(val){ 
            //skip values with line breaks...basically empty items
            if(val.length>1) {
                if(val[0]=='['){
                    tcArray.push(convertToMilliSeconds(val.trim()));
                    $transcript_html.append('<li class="type-timecode" data-timecode="'+convertToMilliSeconds(val.trim())+'">'+val.trim()+'</li>'); 
                }
                else {
                    $transcript_html.append('<li class="type-text">'+val+'</li>'); 
                }
            }       
        });
    }   
    return $transcript_html;
}
function attachTranscript(transcriptData){
    //create millisecond markers for transcript
    //split transcript at timecodes
    $('.transcript-ep p').append(formatTranscript(transcriptData));
}
function zoomCluster(){
    var displayedFeatures = [];
    var lay = map.layers[1];
    for (var i=0, len=lay.features.length; i<len; i++) {
        var featC = lay.features[i];
        if (featC.onScreen()) {
            displayedFeatures.push(featC);
        }
    }
    //console.log(displayedFeatures.length);
    if(displayedFeatures.length<2) {
        //console.log('only on left');
        return false;
    }
    else {
        return true;
    }
}
//use STYLE to show different icons      
 
function createMarkers(data,mLayer) {

    //split the filter and feature object
    //Object.keys(lookupData).length; 
    dataObject = data;
    console.log(dataObject);
    var featureObject;
    var legends = new Object();
    _.map(dataObject, function(val,key){
        console.log(val.type)
        if(val.type =='filter') {
            legends[key] = val;
            // var countTerms = Object.keys(legends[i].terms).length; 
            // for(k=0;k<countTerms;k++) {
            //     legends[i].terms[k].name = _.unescape(legends[i].terms[k].name);
            //     var tempChildCount = Object.keys(legends[i].terms[k].children).length
            //     for(j=0;j<tempChildCount;j++) {
            //         legends[i].terms[k].children[j] = _.unescape(legends[i].terms[k].children[j]);
            //     }
            // }
            

        }
        if(val.type =='FeatureCollection') {
            featureObject = val;
            markerObject = val;
        }
    });
    // for(i=0;i<Object.keys(dataObject).length;i++) {
    //     if(dataObject[i].type =='filter') {
    //         legends[i] = (dataObject[i]);
    //         var countTerms = Object.keys(legends[i].terms).length; 
    //         for(k=0;k<countTerms;k++) {
    //             legends[i].terms[k].name = _.unescape(legends[i].terms[k].name);
    //             var tempChildCount = Object.keys(legends[i].terms[k].children).length
    //             for(j=0;j<tempChildCount;j++) {
    //                 legends[i].terms[k].children[j] = _.unescape(legends[i].terms[k].children[j]);
    //             }
    //         }
            

    //     }
    //     if(dataObject[i].type =='FeatureCollection') {
    //         featureObject = dataObject[i];
    //         markerObject = dataObject[i];
    //     }
    //}
    catFilter  = legends[0];//dataObject[0];
    console.log(featureObject)
    var countFeatures = Object.keys(featureObject.features).length; 
    for(i=0;i<countFeatures;i++) {
        var countCategories = Object.keys(featureObject.features[i].properties.categories).length; 
        for(j=0;j<countCategories;j++) {
            featureObject.features[i].properties.categories[j] = _.unescape(featureObject.features[i].properties.categories[j]);
        }
    }
    //console.log(markerObject);
    //console.log(legends);
    createLegend(legends);
    //markerObject = dataObject[2];
    //var featureObject = dataObject[2];
   
	var reader = new OpenLayers.Format.GeoJSON({
            'externalProjection': gg,
            'internalProjection': sm
    });

	var featureData = reader.read(featureObject);

    var  myLayer = mLayer;
    myLayer.addFeatures(featureData);




//player.pause();

}
function createTimeline(data) {
    //console.log(data);
    createStoryJS({
        type:       'timeline',
        width:      '960',
        height:     '600',
        source:     'http://msc.renci.org/dev/wp-content/plugins/diph/js/test.json',
        embed_id:   'timeline'           // ID of the DIV you want to load the timeline into
    });
}

function loadMarkers(projectID,mLayer){
    //console.log('loading');
    //$('#markerModal').
    $('body').append('<div id="loading" class="modal hide fade">\
        <div class="modal-body">\
        <div class="loading-content" style="font-size:56px; ">\
        <i class="icon-spinner icon-spin"> </i> loading </div>\
        </div>\
        </div>');   
    $('#loading').modal({backdrop:false});
    $('#loading').modal('show');
    //$('.modal-backdrop').css({'opacity':0.1});
	jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetMarkers',
            project: projectID
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            createMarkers(JSON.parse(data),mLayer);
            //console.log('done');
            //$('#markerModal').modal({backdrop:true}); 
            $('#loading').modal('hide');

            //$('#markerModal .loading-content').remove();   

            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}

function loadTimeline(projectID){
    jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetTimeline',
            project: projectID
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            createTimeline(JSON.parse(data));
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
function loadTranscriptClip(projectID,transcriptName,clip){
    jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetTranscriptClip',
            project: projectID,
            transcript: transcriptName,
            timecode: clip
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(JSON.parse(data));
            attachTranscript(JSON.parse(data));

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
});