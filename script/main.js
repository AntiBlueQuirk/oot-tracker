var dungeonImg = [
    'Unknown',
    'Slingshot0',
    'Bombs0',
    'Boomerang',
    'Bow0',
    'Hammer',
    'Hookshot0',
    'HoverBoots',
    'MirrorShield'
];
ganonlogic = 'Open';
showprizes = false;
startsopen = {
	Forest: true,
	KakarikoGate: false,
	DoorofTime: false,
	ZorasFountain: false,
};
shuffled = {
	Ocarinas: false,
	WeirdEgg: false,
	GerudoCard: false,
};
glitches = {
	WTnoZora: false,
};
lensLogic = 'All'
chuInLogic = false;

var itemGrid = [];
var itemLayout = [];

var editmode = false;
var selected = {};

var dungeonSelect = 0;

function el(id) { return document.getElementById(id); }
function elsName(id) { return document.getElementsByName(id); }

function setCookie(obj) {
    var d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    var val = encodeURIComponent(JSON.stringify(obj));
    document.cookie = "key=" + val + ";" + expires + ";path=/";
}

function getCookie() {
    var name = "key=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return JSON.parse(decodeURIComponent(c.substring(name.length, c.length)));
        }
    }
    return {};
}

window.chests_open = {}; //technically, this gets set as part of logic, but we call chestOpen before logic setup
function chestOpen(chest) {
	var target = chest.target;
	return target in chests_open && chests_open[target] || false;
}
function chestAccessible(chest) {
	return (chest.type != 'skulltula' || showSkulltulas) &&
	       logic_state.can_reach(logic_world.getLocation(chest.target));
}
function regionAccessible(target) {
	return logic_state.can_reach(logic_world.getRegion(target));
}

function dungeonLocCount(dungeon) {
	return Object.values(dungeon.chestlist).reduce((a, c) => a + (
	//count where this is true:
		c.type != 'skulltula' || showSkulltulas
	? 1 : 0), 0);
}
function dungeonAccessible(dungeon) {
	//return dungeon.regions.reduce((a, r) => a + (regionAccessible(r) ? 1 : 0), 0);
	return Object.values(dungeon.chestlist).reduce((a, c) => a + (
	//count where this is true:
		chestAccessible(c)
	? 1 : 0), 0);
}
function chestClass(chest)
{
	if (chestOpen(chest)) return "opened";
	if (chestAccessible(chest)) return "available";
	return "unavailable";
}
function dungeonClass(dungeon)
{
	//if (chestOpen(target)) return "opened";
	var acc = dungeonAccessible(dungeon);
	if (acc == dungeonLocCount(dungeon)) return "available";
	if (acc) return "possible";
	return "unavailable";
}

var cookieDefault = {
    map: 1,
    iZoom: 150,
    mZoom: 100,
    mPos: 0,
    prize: 1,
	showSkulltulas: false,
    //medallions: defaultMedallions,
    grid: serializeLayout(gridpreset_natural),
    obtainedItems: {},
    chests: serializeChests(),
    dungeonChests: serializeDungeonChests(),
	settings: {},
}
var showSkulltulas = false;

var cookielock = false;

function normalizeObj(obj) { return JSON.parse(JSON.stringify(obj)); } 
function loadCookie() {
    if (cookielock) {
        return;
    }
	
	cookielock = true;

	cookieobj = getCookie();

    Object.keys(cookieDefault).forEach(function(key) {
        if (cookieobj[key] === undefined) {
            cookieobj[key] = cookieDefault[key];
        }
    });

	stateInit();
	stateLoadWorld(logic_world);
    
    //medallions = normalizeObj(cookieobj.medallions));
    try {
		initGridRow(deserializeLayout(normalizeObj(cookieobj.grid)));
	} catch (error) {
		console.error(err.toString()+"\n"+(err.stack ? err.stack.toString() : ""))
		alert("I failed to load your layout for some reason.\nThe data has been lost.");
		initGridRow(deserializeLayout(serializeLayout(gridpreset_natural)));
	}
	try {
		deserializeItems(normalizeObj(cookieobj.obtainedItems));
		deserializeChests(normalizeObj(cookieobj.chests));
		deserializeDungeonChests(normalizeObj(cookieobj.dungeonChests));
	} catch (error) {
		console.error(err.toString()+"\n"+(err.stack ? err.stack.toString() : ""))
		alert("I failed to load your tracker state for some reason.\nThe data has been lost.");
		stateInit();
		stateLoadWorld(logic_world);
	}
	try {
		deserializeSettings(normalizeObj(cookieobj.settings));
	} catch (error) {
		console.error(err.toString()+"\n"+(err.stack ? err.stack.toString() : ""))
		alert("I failed to load your logic settings for some reason.\nThe data has been lost.");
		ResetLogic();
	}
	
    updateGridItemAll();

    elsName('showmap')[0].checked = !!cookieobj.map;
    elsName('itemdivsize')[0].value = cookieobj.iZoom;
    elsName('mapdivsize')[0].value = cookieobj.mZoom;

    elsName('mapposition')[cookieobj.mPos].click();

    elsName('showprizes')[0].checked = !!cookieobj.prize;
	
	setSkulltulas(cookieobj.showSkulltulas);
    
	[
		'showmap', 'itemdivsize', 'mapdivsize', 'showprizes',
	].forEach(function (s) {
		elsName(s)[0].onchange();
	});

    cookielock = false;
}

function saveCookie() {
    if (cookielock) {
        return;
    }

    cookielock = true;

    cookieobj = {};

    cookieobj.map = elsName('showmap')[0].checked ? 1 : 0;
    cookieobj.iZoom = elsName('itemdivsize')[0].value;
    cookieobj.mZoom = elsName('mapdivsize')[0].value;

    cookieobj.mPos = elsName('mapposition')[1].checked ? 1 : 0;

    cookieobj.prize = elsName('showprizes')[0].checked ? 1 : 0;
    
    for (rbuttonID in elsName('ganonlogic')) {
        rbutton = elsName('ganonlogic')[rbuttonID];
        if (rbutton.checked) {
            cookieobj.glogic = rbutton.value;
        }
    }

    //cookieobj.medallions = normalizeObj(medallions));
    cookieobj.grid = normalizeObj(serializeLayout());
    cookieobj.obtainedItems = normalizeObj(serializeItems());
    cookieobj.chests = normalizeObj(serializeChests());
    cookieobj.dungeonChests = normalizeObj(serializeDungeonChests());
	cookieobj.settings = normalizeObj(serializeSettings());

	cookieobj.showSkulltulas = showSkulltulas;
	
    setCookie(cookieobj);

    cookielock = false;
}

function serializeLayout(layout) {
    return (layout || itemLayout).map(r => r.map(i => getItemNum(i)));
}
function serializeItems() {
	var newMap = {};
	Object.keys(item_status).forEach(k => {
		if (item_status[k] != item_data[k].defcount)
			newMap[getItemNum(k)] = item_status[k];
	})
    return newMap;
}

function serializeChests() {
    return chests.map(c => chestOpen(c) ? 1 : 0);
}

function serializeDungeonChests() {
    return dungeons.map(
		d => Object.values(d.chestlist)
				.map(
					c => chestOpen(c) ? 1 : 0
				));
}

function serializeSettings() {
	var newMap = {};
	settings_data.forEach(s => {
		var sid    = s[0];
		var stype  = s[1];
		var sdef   = s[2];
		
		if (logic_state.settings[sid] != sdef)
			newMap[sid] = logic_state.settings[sid];
	})
    return newMap;
}

function deserializeLayout(ser) {
    return ser.map(r => r.map(i => lookupItemNum(i)));
}
function deserializeItems(ser) {
	var newMap = {};
	Object.keys(ser).forEach(k => {
		item_status[lookupItemNum(k)] = ser[k];
	})
    return newMap;
}

function deserializeChests(serializedChests) {
    for (var i = 0; i < chests.length; i++) {
        chests_open[chests[i].target] = !!serializedChests[i];
        refreshChest(i);
    }
}

function deserializeDungeonChests(serializedDungeons) {
    for (var i = 0; i < dungeons.length; i++) {
        var dungeon = dungeons[i];
        var serializedDungeon = serializedDungeons[i];
		if (serializedDungeon) { //false if we add a dungeon
			var chestNames = Object.keys(dungeon.chestlist);
			for (var j = 0; j < chestNames.length; j++) {
				var target = dungeon.chestlist[chestNames[j]].target;
				chests_open[target] = !!serializedDungeon[j];
			}
		}
    }
}
function deserializeSettings(ser) {
	Object.keys(ser).forEach(k => {
		var v = ser[k];
		var si = settings_data_lut[k];
		var sdata = settings_data[si];
		
		if (sdata)
		{
			var stype = sdata[1];
			if (stype == 'bool')
			{
				logic_state.settings[k] = !!v;
			}
			else if (stype == 'choice')
			{
				var sextra = sdata[5];
				if (sextra.includes(v))
				{
					logic_state.settings[k] = v;
				}
			}
			updateLogicSettingInput(k);
		}
	})
}

// Event of clicking a chest on the map
function toggleChest(x) {
	var chest = chests[x];
    chests_open[chest.target] = !chestOpen(chest);
    refreshChest(x);
    saveCookie();
}

function refreshChest(i) {
	var chest = chests[i];
	var id = 'chest' + i;
	var elem = el(id);
	
	var classList = 'mapspan chest';
	if (chestOpen(chest)) {
		classList += ' opened';
	} else {
		classList += ' ' + chestClass(chest);
	}
	if (chest.type == 'skulltula')
		classList += ' mapSkulltula';
	
    elem.className = classList;
}

// Highlights a chest location
function highlightChest(i) {
	var chest = chests[i];
	var id = 'chest' + i;
	var elem = el(id);
	var loc = logic_world.getLocation(chest.target);
	
    elem.classList.add('highlighted');
	//elem.style.backgroundImage = 'url(images/highlighted.png)';
	
	var tt = chest.name;
	if (chest.type == 'skulltula')
		tt = '<span class="skulltula"></span>'+tt.replace(/\(GS\)/, '');
	if (!logic_state.can_reach(loc.parent))
		tt += '<br><span class="rulefalse">Can\'t reach '+loc.parent.name+'</span>';
	if (!loc.ruletrue)
		tt += '<br>Chest Rule: '+toHTMLCompiledRule(loc.rule, logic_state);
	
	showTooltip(id, elem, tt);
}

function unhighlightChest(i) {
	var chest = chests[i];
	var id = 'chest' + i;
	var elem = el(id);
	
    //elem.style.backgroundImage = 'url(images/poi.png)';
	elem.classList.remove('highlighted');
	
	hideTooltip(id);
}

// Highlights a chest location (but for dungeons)
function highlightDungeon(d) {
	var dungeon = dungeons[d];
	var id = 'dungeon' + d;
	var elem = el(id);
    elem.classList.add('highlighted');
	//elem.style.backgroundImage = 'url(images/highlighted.png)';
	showTooltip(id, elem, dungeon.name);//+'<br>'+toHTMLCompiledRule(dungeon.rule));
}

function unhighlightDungeon(d) {
	var dungeon = dungeons[d];
	var id = 'dungeon' + d;
	var elem = el(id);
	
    if (dungeonSelect != d)
        elem.classList.remove('highlighted');
		//elem.style.backgroundImage = 'url(images/poi.png)';
	
	hideTooltip(id);
}

function populateDungeonChestlist(d) {
	var DClist = el('submaplist');
    DClist.innerHTML = '';
	
	for (var key in dungeons[d].chestlist) {
		var chest = dungeons[d].chestlist[key];
		if (!showSkulltulas && chest.type == "skulltula")
			continue;
		
        var s = document.createElement('li');
        s.innerHTML = chest.name.replace(/\(GS\) /g, '');

		var classname = "";
		var id = "sml"+chest.id;
        if (chestOpen(chest)) {
            classname = "DCopened";
        } else if ( chestAccessible(chest) ) {
            classname = "DCavailable";
        } else {
            classname = "DCunavailable";
        }
		if (chest.type == "skulltula")
			classname += " DCskulltula";
		
		s.className = classname;
        s.onclick = new Function('toggleDungeonChest(this,' + d + ',"' + chest.id + '")');
        s.onmouseover = new Function('highlightDungeonChest('+d+', "'+chest.id+'")');
        s.onmouseout = new Function('unhighlightDungeonChest('+d+', "'+chest.id+'")');
        s.style.cursor = "pointer";
		
		s.id = id;

        DClist.appendChild(s);
    }
}
function clickDungeon(d) {
    el('dungeon' + dungeonSelect).classList.remove('highlighted');
	//el('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/poi.png)';
    dungeonSelect = d;
    el('dungeon' + dungeonSelect).classList.add('highlighted');
	//el('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/highlighted.png)';

    el('submaparea').innerHTML = dungeons[dungeonSelect].name;
    el('submaparea').className = 'DC' + dungeonClass(dungeons[dungeonSelect]);
    
    populateDungeonChestlist(d);
}

function toggleDungeonChest(sender, d, cid) {
	var chest = dungeons[d].chestlist[cid];
	var target = chest.target;
    chests_open[target] = !chestOpen(chest);
    if (chests_open[target])
        sender.className = 'DCopened';
    else if (chestAccessible(chest))
        sender.className = 'DCavailable';
    else
        sender.className = 'DCunavailable';

    updateMap();
    saveCookie();
}

function highlightDungeonChest(d, cid) {
	var dungeon = dungeons[d];
	var chest = dungeons[d].chestlist[cid];
	var id = 'sml' + chest.id;
	var elem = el(id);
	var loc = logic_world.getLocation(chest.target);
	
    elem.style.backgroundColor = '#282828';
	
	var tt = chest.name;
	if (!logic_state.can_reach(loc.parent))
		tt += '<br><span class="rulefalse">Can\'t reach '+loc.parent.name+'</span>';
	if (!loc.ruletrue)
		tt += '<br>Chest Rule: '+toHTMLCompiledRule(loc.rule, logic_state);
	
	showTooltip(id, elem, tt);
}

function unhighlightDungeonChest(d, cid) {
	var dungeon = dungeons[d];
	var chest = dungeons[d].chestlist[cid];
	var id = 'sml' + chest.id;
	var elem = el(id);
	
    elem.style.backgroundColor = '';
	
	hideTooltip(id);
}

function setOrder(H) {
    if (H) {
        el('layoutdiv').classList.remove('flexcontainer');
    } else {
        el('layoutdiv').classList.add('flexcontainer');
    }
    saveCookie();
}

function showPrizes(sender) {
    showprizes = sender.checked;
    updateGridItemAll();
    saveCookie();
}


function setGanonLogic(sender) {
    ganonlogic = sender.value;
    updateMap();
    saveCookie();
}

function setLens(sender){
    lensLogic = sender.value;
    updateMap()
 }
 function setChu(sender){
    if (sender.checked){
        chuInLogic = true
    }else {
        chuInLogic = false
    }
     updateMap();
 }


function setZoom(target, sender) {
    el(target).style.setProperty('--size-unit', 32 * (sender.value / 100) + 'px');
    //el(target).style.zoom = sender.value / 100;

    //el(target).style.MozTransform = 'scale(' + (sender.value / 100) + ')';
    //el(target).style.MozTransformOrigin = '0 0';

    el(target + 'size').innerHTML = (sender.value) + '%';
    saveCookie();
}

function setSkulltulas(state) {
	showSkulltulas = state;
	
	if (state)
		document.body.classList.remove('hideSkulltulas');
	else
		document.body.classList.add('hideSkulltulas');
	
	populateDungeonChestlist(dungeonSelect);
	updateMap();
}
function toggleSkulltulas(sender) {
	setSkulltulas(!showSkulltulas);
}

function setSetting(i, v) {
	var sid    = settings_data[i][0];
	var stype  = settings_data[i][1];
	logic_state.settings[sid] = v;
	
	saveCookie();
	updateMap();
}
function showSettings(sender) {
    if (editmode) {
        var r, c;
        var startdraw = false;

        editmode = false;
        updateGridItemAll();
        showTracker('mapdiv', elsName('showmap')[0]);
        el('itemconfig').style.display = 'none';
		el('settingsbutton').style.removeProperty('width');
        //el('rowButtons').style.display = 'none';
        sender.innerHTML = '🔧';
        saveCookie();
    } else {
        var x = el('settings');
        if (!x.style.display || x.style.display == 'none') {
            x.style.display = 'initial';
            sender.innerHTML = 'X';
        } else {
            x.style.display = 'none';
            sender.innerHTML = '🔧';
        }
    }
}

var tooltipId = null;
function getDocumentRect(elem)
{
	var box = elem.getBoundingClientRect();
	box = { x: box.x + window.scrollX, y: box.y+scrollY, width: box.width, height: box.height };
	if (box.width >= 0)
	{
		box.left  = box.x;
		box.right = box.x+box.width;
	}
	else
	{
		box.left  = box.x+box.width;
		box.right = box.x;
	}
	if (box.height >= 0)
	{
		box.top    = box.y;
		box.bottom = box.y+box.height;
	}
	else
	{
		box.top    = box.y+box.height;
		box.bottom = box.y;
	}
	return box;
}
function showTooltip(id, elem, html) {
	var ttc = el('tooltipcontainer');
	var box = getDocumentRect(elem);
	
	ttc.innerHTML = '<div>'+html+'</div>';
	ttc.style.display = 'block';
	ttc.style.left   = box.left+box.width/2;
	if (box.top > 100)
	{
		ttc.style.bottom = 'calc(100% - '+box.top+'px)';
		ttc.style.removeProperty('top');
	}
	else
	{
		ttc.style.top = box.bottom+'px';
		ttc.style.removeProperty('bottom');
	}
	
	tooltipId = id;
}
function hideTooltip(id) {
	if (!id || tooltipId == id)
	{
		var ttc = el('tooltipcontainer');
		ttc.style.display = 'none';
		
		tooltipId = null;
	}
}

function showTracker(target, sender) {
    if (sender.checked) {
        el(target).style.display = '';
    }
    else {
        el(target).style.display = 'none';
    }
}

var quickstarts = {
	'kokiri': {
		'Deku Sticks':   1,
		'Deku Nuts':     1,
		'Kokiri Sword':  1,
		'Deku Shield':   1,
	//	'Child Trade':   3,
	//	'Ocarina':       1,
	}
}
function quickstart(tag)
{
	var qs = quickstarts[tag];
	
	Object.keys(qs).forEach(i => {
		var v = qs[i];
		if (item_status[i] < v)
			item_status[i] = v;
	})
	
    updateGridItemAll();
	updateMap();
}

function EditMode() {
    var r, c;

    editmode = true;
    updateGridItemAll();
    showTracker('mapdiv', {checked: false});
    el('settings').style.display = 'none';
    el('itemconfig').style.display = '';
    //el('rowButtons').style.display = 'flex';

    el('settingsbutton').style.width = 'auto';
    el('settingsbutton').innerHTML = 'Exit Edit Mode';
}


function ResetLayout() {
	cookielock = true;
    initGridRow(gridpreset_natural);
    updateGridItemAll();
	cookielock = false;
	saveCookie();
}


function ResetTracker() {
	stateInit();
	stateLoadWorld(logic_world);
	
	//setupInit();
	
    //chests.forEach(chest => delete chest.isOpened);
    //dungeons.forEach(d => Object.values(d.chestlist).forEach(c => delete c.isOpened));
    //items = Object.assign({}, baseItems);

    updateGridItemAll();
    updateMap();
    saveCookie();
}

function ResetLogic() {
	stateResetSettings();
	settings_data.forEach(s => updateLogicSettingInput(s[0]));
	saveCookie();
}

function addItemRow() {
    var sender = el('itemdiv')
    var r = itemLayout.length;

    itemGrid[r] = [];
    itemLayout[r] = [];

    itemGrid[r]['row'] = document.createElement('table');
    itemGrid[r]['row'].className = 'tracker';

    itemGrid[r]['tablerow'] = document.createElement('tr')
    itemGrid[r]['tablerow'].appendChild(itemGrid[r]['row']);
    sender.appendChild(itemGrid[r]['tablerow']);

    var tr = document.createElement('tr');
    itemGrid[r]['row'].appendChild(tr);

    itemGrid[r]['addbutton'] = document.createElement('button');
    itemGrid[r]['addbutton'].innerHTML = '+';
    itemGrid[r]['addbutton'].style.backgroundColor = 'green';
    itemGrid[r]['addbutton'].style.color = 'white';
    itemGrid[r]['addbutton'].onclick = new Function("addItem(" + r + ")");
    itemGrid[r]['row'].appendChild(itemGrid[r]['addbutton']);

    itemGrid[r]['removebutton'] = document.createElement('button');
    itemGrid[r]['removebutton'].innerHTML = '-';
    itemGrid[r]['removebutton'].style.backgroundColor = 'red';
    itemGrid[r]['removebutton'].style.color = 'white';
    itemGrid[r]['removebutton'].onclick = new Function("removeItem(" + r + ")");
    itemGrid[r]['row'].appendChild(itemGrid[r]['removebutton']);

    saveCookie();
}


function removeItemRow() {
    var sender = el('itemdiv')
    var r = itemLayout.length - 1;

    sender.removeChild(itemGrid[r]['tablerow'])
    itemGrid.splice(r, 1);
    itemLayout.splice(r, 1);

    saveCookie();
}


function addItem(r) {
    var i = itemLayout[r].length

    var gd = itemGrid[r][i] = [];
    itemLayout[r][i] = 'blank';

    gd['item'] = document.createElement('td');
    gd['item'].className = 'griditem';
    gd['item'].onclick       = new Function("return gridItemClick(" + r + "," + i + ",false,false)");
    gd['item'].oncontextmenu = new Function("return gridItemClick(" + r + "," + i + ",false,true)");
    itemGrid[r]['row'].appendChild(itemGrid[r][i]['item']);
	
	var inn = document.createElement('div');
	inn.className = 'iteminner';
    inn.onclick       = new Function("evt", "evt.stopPropagation(); return gridItemClick(" + r + "," + i + ",true,false)");
    inn.oncontextmenu = new Function("evt", "evt.stopPropagation(); return gridItemClick(" + r + "," + i + ",true,true)");
	gd['item'].appendChild(inn);
	gd['inner'] = inn;
	
    //var tdt = document.createElement('table');
    //tdt.className = 'lonk';
    //gd['item'].appendChild(tdt);
    //    var tdtr1 = document.createElement('tr');
    //    tdt.appendChild(tdtr1);
    //        gd[0] = document.createElement('th');
    //        gd[0].className = 'corner';
    //        gd[0].onclick = new Function("gridItemClick(" + r + "," + i + ",0)");
    //        tdtr1.appendChild(gd[0]);
    //        gd[1] = document.createElement('th');
    //        gd[1].className = 'corner';
    //        gd[1].onclick = new Function("gridItemClick(" + r + "," + i + ",1)");
    //        tdtr1.appendChild(gd[1]);
    //    var tdtr2 = document.createElement('tr');
    //    tdt.appendChild(tdtr2);
    //        gd[2] = document.createElement('th');
    //        gd[2].className = 'corner';
    //        gd[2].onclick = new Function("gridItemClick(" + r + "," + i + ",2)");
    //        tdtr2.appendChild(gd[2]);
    //        gd[3] = document.createElement('th');
    //        gd[3].className = 'corner';
    //        gd[3].onclick = new Function("gridItemClick(" + r + "," + i + ",3)");
    //        tdtr2.appendChild(gd[3]);

    updateGridItem(r, i);
    saveCookie();
}


function removeItem(r) {
    var i = itemLayout[r].length - 1

    if (i < 0) {
        return
    }

    itemGrid[r]['row'].removeChild(itemGrid[r][i]['item'])
    itemGrid[r].splice(i, 1);
    itemLayout[r].splice(i, 1);
    saveCookie();
}


function updateGridItem(row, index) {
    var item = itemLayout[row][index];
	var ito = item_data[item];
	var itel = itemGrid[row][index]['item'];
	
    if (editmode) {
        if (!item || item == 'blank') {
            itel.style.backgroundImage = 'url(images/blank.png)';
        } else if (ito.maxcount == 1 || ito.data.oneimg) {
			itel.style.backgroundImage = 'url(images/' + ito.pic + '.png)';
        } else {
            itel.style.backgroundImage = 'url(images/' + ito.pic + ito.maxcount + '.png)';
        }

        itel.style.border = '1px solid white';
        itel.className = 'griditem true'

        return;
    }

    itel.style.border = '0px';

    if (!item || item == 'blank') {
        itel.style.backgroundImage = '';
        return;
    } else if (ito.maxcount == 1 || ito.data.oneimg) {
        itel.style.backgroundImage = 'url(images/' + ito.pic + '.png)';
    } else {
		var num = item_status[item];
		if (num == 0)
		{
			if (ito.data.zerosub === true)
				num = 1;
			else if (typeof ito.data.zerosub === 'number')
				num = ito.data.zerosub;
		}
        itel.style.backgroundImage = 'url(images/' + ito.pic + num + '.png)';
    }
	
	if (item && ito.data.corner) {
		var inn = itemGrid[row][index]['inner'];
		if (ito.data.corner == "count") {
			inn.innerText = item_status[item] ? item_status[item] : "";
		}
		else if (Array.isArray(ito.data.corner)) {
			var val = ito.data.corner[item_status[item]];
			inn.innerText = val != null ? val : "";
		}
		
		var max = ito.maxcount;
		if (ito.data.regmax) max = ito.data.regmax;
		
		if (item_status[item] >= max)
			inn.classList.add('itemmax');
		else
			inn.classList.remove('itemmax');
	}

    itel.className = 'griditem ' + !!item_status[item];

    //if (medallions[item] !== undefined) {
    //    if (showprizes) {
    //        itemGrid[row][index][3].style.backgroundImage = 'url(images/' + dungeonImg[medallions[item]] + '.png)';
    //    } else {
    //        itemGrid[row][index][3].style.backgroundImage = '';
    //    }
    //}
}


function updateGridItemAll() {
    var r, c;
    for (r = 0; r < itemLayout.length; r++) {
        for (c = 0; c < itemLayout[r].length; c++) {
            updateGridItem(r, c);
        }

        if (editmode) {
            itemGrid[r]['addbutton'].style.display = ''
            itemGrid[r]['removebutton'].style.display = ''
        }
        else {
            itemGrid[r]['addbutton'].style.display = 'none'
            itemGrid[r]['removebutton'].style.display = 'none'
        }
    }
}


function setGridItem(item, row, index) {
    while (!itemLayout[row]) {
        addItemRow();
    }
    while (!itemLayout[row][index]) {
        addItem(row);
    }
	if (item == "Sold Out") item = 'blank';
	
    itemLayout[row][index] = item;
    updateGridItem(row, index);
}


function initGridRow(itemsets) {
    while (itemLayout.length > 0) {
        removeItemRow();
    }

    var r, c;
    for (r = 0; r < itemsets.length; r++) {
        for (c = 0; c < itemsets[r].length; c++) {
            setGridItem(itemsets[r][c], r, c);
        }
    }
}


function gridItemClick(row, col, inner, rmb) {
	//Clear selection, in case the user touched some text
	if (window.getSelection().empty) {
		window.getSelection().empty();
	} else if (window.getSelection().removeAllRanges) {
		window.getSelection().removeAllRanges();
	}
	  
    if (editmode) {
		if (rmb)
			return true; //default handler;
		
        if (selected.item) {
            el(selected.item).style.border = '1px solid white';
            var old = itemLayout[row][col];

            if (old == selected.item) {
                selected = {};
                return;
            }

            itemLayout[row][col] = selected.item;
            updateGridItem(row, col);
            selected = {};
            //el(old).style.opacity = 1;
        } else if (selected.row !== undefined) {
            itemGrid[selected.row][selected.col]['item'].style.border = '1px solid white';

            var temp = itemLayout[row][col];
            itemLayout[row][col] = itemLayout[selected.row][selected.col];
            itemLayout[selected.row][selected.col] = temp;
            updateGridItem(row, col);
            updateGridItem(selected.row, selected.col);
            selected = {};
        } else {
            itemGrid[row][col]['item'].style.border = '3px solid yellow';
            selected = {row: row, col: col};
        }
    } else {
        var item = itemLayout[row][col];
		var ito = item_data[item];

		if (ito)
		{
			/*
			if (medallions[item] !== undefined && showprizes) {
				if (corner == 3) {
					medallions[item]++;
					if (medallions[item] >=  9) {
						medallions[item] = 0;
					}
				} 
				else {
					item_status[item] = item_status[item] ? 0 : 1;
				}
			}
			else */if (ito.maxcount == 1) {
				item_status[item] = item_status[item] ? 0 : 1
			}
			else {
				do {
					if (rmb)
					{
						item_status[item]--;
						if (item_status[item] < ito.mincount) {
							item_status[item] = ito.maxcount;
						}
					}
					else
					{
						item_status[item]++;
						if (item_status[item] > ito.maxcount) {
							item_status[item] = ito.mincount;
						}
					}
				} while (ito.data.skip && ito.data.skip.includes(item_status[item]));
			}
		}

        updateMap();
        updateGridItem(row,col);
    }
    saveCookie();
	return false;
}

function updateMap() {
	stateExploreWorld(true);
	
    for (k = 0; k < chests.length; k++) {
		var chest = chests[k];
        if (!chestOpen(chest))
		{
			refreshChest(k)
		}
    }
    for (k = 0; k < dungeons.length; k++) {
		var dungeon = dungeons[k];
		var elem = el('dungeon' + k);
        elem.className = 'mapspan dungeon ' + dungeonClass(dungeons[k]);
		
		if (dungeonLocCount(dungeon) == 0)
			elem.style.display = 'none';
		else
			elem.style.removeProperty('display');
		
        var DCcount = 0;
        for (var key in dungeon.chestlist) {
            if (dungeon.chestlist.hasOwnProperty(key)) {
				var chest = dungeon.chestlist[key];
                if (!chestOpen(chest)&& chestAccessible(chest)) {
                    DCcount++;
                }
            }
        }

        var child = elem.firstChild;
        while (child) {
            if (child.className == 'chestCount') {
                if (DCcount == 0) {
                    child.innerHTML = '';
                } else {
                    child.innerHTML = DCcount;
                }
                break;
            }
            child = child.nextSibling;
        }
    }

    el('submaparea').className = 'DC' + dungeonClass(dungeons[dungeonSelect]);
    var itemlist = el('submaplist').children;
    for (var item in itemlist) {
        if (itemlist.hasOwnProperty(item)) {
			var elem = itemlist[item];
			var cid = elem.id.substring(3);
			var chest = dungeons[dungeonSelect].chestlist[cid];
			var classname = '';
            if ( chestOpen(chest) ) {
                classname = 'DCopened';
            } else if ( chestAccessible(chest) ) {
                classname = 'DCavailable';
            } else {
                classname = 'DCunavailable';
            }
			
			if (chest.type == 'skulltula')
				classname += ' DCskulltula';
			
			itemlist[item].className = classname;
        }
    }
}

function itemConfigClick (sender) {
    var item = sender.id;

    if (selected.item) {
        el(selected.item).style.border = '0px';
        sender.style.border = '3px solid yellow';
        selected = {item: item};
    } else if (selected.row !== undefined) {
        itemGrid[selected.row][selected.col]['item'].style.border = '1px solid white';
        var old = itemLayout[selected.row][selected.col];

        if (old == item) {
            selected = {};
            return;
        }

        itemLayout[selected.row][selected.col] = item;
        updateGridItem(selected.row, selected.col);

        //el(old).style.opacity = 1;

        selected = {};
    } else {
        sender.style.border = '3px solid yellow';
        selected = {item: item}
    }
}

function populateMapdiv() {
    var mapdiv = el('mapdiv');

    // Initialize all chests on the map
    for (k = 0; k < chests.length; k++) {
		var s = document.createElement('span');
        //s.style.backgroundImage = 'url(images/poi.png)';
        s.style.color = 'black';
        s.id = 'chest' + k;
        s.onclick = new Function('toggleChest(' + k + ')');
        s.onmouseover = new Function('highlightChest(' + k + ')');
        s.onmouseout = new Function('unhighlightChest(' + k + ')');
        s.style.left = chests[k].x;
        s.style.top = chests[k].y;
		
        mapdiv.appendChild(s);
		
		refreshChest(k);
    }

    // Dungeon bosses & chests
    for (k=0; k<dungeons.length; k++) {
        s = document.createElement('span');
        //s.style.backgroundImage = 'url(images/poi.png)';
        s.id = 'dungeon' + k;

        s.onclick = new Function('clickDungeon(' + k + ')');
        s.onmouseover = new Function('highlightDungeon(' + k + ')');
        s.onmouseout = new Function('unhighlightDungeon(' + k + ')');
        s.style.left = dungeons[k].x;
        s.style.top = dungeons[k].y;
        s.className = 'mapspan dungeon '+dungeonClass(dungeons[k]);

        var DCcount = 0;
        for (var key in dungeons[k].chestlist) {
            if (dungeons[k].chestlist.hasOwnProperty(key)) {
				var chest = dungeons[k].chestlist[key];
                if (!chestOpen(chest) && chestAccessible(chest)) {
                    DCcount++;
                }
            }
        }

        var ss = document.createElement('span');
        ss.className = 'chestCount';
        if (DCcount == 0) {
            ss.innerHTML = '';
        } else {
            ss.innerHTML = DCcount;
        }
        ss.style.color = 'black'
        s.style.textAlign = 'center';
        ss.display = 'inline-block';
        //ss.style.lineHeight = '24px';
        s.appendChild(ss);

        //var ss = document.createElement('span');
        //ss.className = 'tooltipgray';
        //ss.innerHTML = dungeons[k].name;
        //s.appendChild(ss);

        mapdiv.appendChild(s);
    }

    el('submaparea').innerHTML = dungeons[dungeonSelect].name;
    el('submaparea').className = 'DC'+dungeonClass(dungeons[dungeonSelect]);
    el('dungeon' + dungeonSelect).classList.add('highlighted');
	//el('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/highlighted.png)';
	
	populateDungeonChestlist(dungeonSelect);
}

function populateItemconfig() {
    var grid = el('itemconfig');

    var i = 0;

    var row;

    for (var key in item_data) {
        if (i % 10 == 0) {
            row = document.createElement('tr');
            grid.appendChild(row);
        }
        i++;

        var rowitem = document.createElement('td');
        rowitem.className = 'corner';
        rowitem.id = key;
        rowitem.style.backgroundSize = '100% 100%';
        rowitem.onclick = new Function('itemConfigClick(this)');
		var item = item_data[key];
        if (item.maxcount == 1 || item.data.oneimg) {
            rowitem.style.backgroundImage = 'url(images/' + item.pic + '.png)';
        } else {
            rowitem.style.backgroundImage = 'url(images/' + item.pic + item.maxcount + '.png)';
        }
        row.appendChild(rowitem);
    }
}

var settings_data_lut = {};

function populateLogicSettings() {
	var panel = el('logicpanel');
	settings_data.forEach((s, i) => {
		var sid    = s[0];
		var stype  = s[1];
		var sdef   = s[2];
		var sgroup = s[3];
		var stitle = s[4];
		var sextra = s[5];
		settings_data_lut[sid] = i;
		
		var id = 'logicSetting'+i;
		var row   = document.createElement('div');
		var label = document.createElement('label');
		label.setAttribute('for', id);
		label.innerText = stitle;
		row.appendChild(label);
		
		var input;
		if (stype == 'bool')
		{
			input = document.createElement('input');
			input.setAttribute('id', id);
			input.setAttribute('type', "checkbox");
			input.checked = sdef;
			input.onchange = function(e) { setSetting(i, e.target.checked); }
		
			row.appendChild(input);
		}
		else if (stype == 'choice')
		{
			input = document.createElement('select');
			input.setAttribute('id', id);
			sextra.forEach(o => {
				var opt = document.createElement('option');
				opt.innerText = o;
				input.appendChild(opt);
			})
			input.value = sdef;
			input.onchange = function(e) { setSetting(i, e.target.value); }
			row.appendChild(input);
		}
		
		panel.appendChild(row);
	});
}
function updateLogicSettingInput(key) {
	var si = settings_data_lut[key];
	var sdata = settings_data[si];
	var stype = sdata[1];
	
	if (stype == 'bool')
	{
		el('logicSetting'+si).checked = logic_state.settings[key];
	}
	else if (stype == 'choice')
	{
		var sextra = sdata[5];
		el('logicSetting'+si).value = logic_state.settings[key];
	}
}
function init() {
	populateLogicSettings();
	
	loadLogic().then(() => {
		stateInit();
		stateLoadWorld(logic_world);
		
		//for debugging
		//make sure all chests point somewhere sensible
		var test = dungeons.flatMap(d => Object.values(d.chestlist));
		test = test.concat(chests);
		test = test.filter(c => !logic_world.locationsByName[c.target]);
		if (test.length > 0) { console.log(test); throw 'location sanity failed'; }
		
		//more debugging
		testAllRules(logic_state);
		
		populateMapdiv();
		populateItemconfig();

		try {
			loadCookie();
		}
		catch (err)
		{
			cookielock = false; //needed since loadCookie returned abnormally.
			console.error(err.toString()+"\n"+(err.stack ? err.stack.toString() : ""))
			alert("There was an error loading your saved data. Unfortunately, I have to reset it. This may have been caused by an update.")
			setCookie({});
			loadCookie();
		}
		saveCookie();
		
		updateMap();
	});
}

function preloader() {
    for (item in items_template) {
		var pic = item[1];
		var minnum = item[3];
		var maxnum = item[4];
		var data = item[5] || {};
        if (maxnum == 1 || data.oneimg) {
            var img = new Image();
            img.src = 'images/' + pic + '.png';
        } else {
            for (i = minnum; i < maxnum; i++) {
                var img = new Image();
                img.src = 'images/' + pic + i + '.png';
            }
        }
    }

    for (medallion in dungeonImg) {
        var img = new Image();
        img.src = 'images/' + dungeonImg[medallion] + '.png';
    }
}
function addLoadEvent(func) {
    var oldonload = window.onload;
    if (typeof window.onload != 'function') {
        window.onload = func;
    } else {
        window.onload = function() {
            if (oldonload) {
                oldonload();
            }
            func();
        }
    }
}
addLoadEvent(preloader);
