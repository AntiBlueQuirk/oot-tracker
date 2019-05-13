(function() {

var branch = "v4.0"; // or use "Dev", or "master", or whatever
var logicSrc = "https://raw.githubusercontent.com/TestRunnerSRL/OoT-Randomizer/"+branch+"/data/World/";
var dungeons = [
	'Deku Tree',
	'Dodongos Cavern',
	'Jabu Jabus Belly',
	'Forest Temple',
	'Bottom of the Well',
	'Fire Temple',
	'Ice Cavern',
	'Water Temple',
	'Shadow Temple',
	'Gerudo Training Grounds',
	'Spirit Temple',
	'Ganons Castle',
];

function ruleError(desc, rulesrc, error)
{
	console.error("For "+desc+", failed to call rule \""+rulesrc.replace(/\s+/g, ' ')+"\": "+error.toString()+"\n"+(error.stack ? error.stack.toString() : ""));
}
function Location(parent, name, rule, rulesrc)
{
	this.parent = parent;
	this.name = name;
	this.rule = rule;
	this.rulesrc = rulesrc;
	this.recurse = 0;
}
Location.prototype.canReach = function(state)
{
	var ruleres;
	try { ruleres = this.rule(state) } catch (error) {
		ruleError("Loc "+this.parent.name+":"+this.name, this.rulesrc, error);
		ruleres = true;
		this.rule = function(state) { return true; }
	}
	if (ruleres && state.can_reach(this.parent))
		return true;

	return false;
}
function Exit(parent, region, rule, rulesrc)
{
	this.parent = parent;
	this.region = region;
	this.rule = rule;
	this.rulesrc = rulesrc;
	this.name = this.region.name;
	this.recurse = 0;
}
Exit.prototype.canReach = function(state)
{
	var ruleres;
	try { ruleres = this.rule(state) } catch (error) {
		ruleError("Exit "+this.parent.name+":"+this.name+" -> "+this.region.name, this.rulesrc, error);
		ruleres = true;
		this.rule = function(state) { return true; }
	}
	if (ruleres && state.can_reach(this.parent))
		return true;

	return false;
}
function Item(name, pic, type, mincount, defcount, maxcount, data)
{
	this.name = name;
	this.type = type;
	this.pic = pic;
	this.mincount = mincount;
	this.defcount = defcount;
	this.maxcount = maxcount;
	this.data = data || {};
}
function ItemFromArgs(args)
{
	var obj = Object.create(Item.prototype);
	Item.apply(obj, args);
	return obj;
}
function Region(world, name)
{
	this.world = world;
	this.name = name;
	this.locations = [];
	this.locationsByName = {};
	this.exits = [];
	this.exitsByName = {};
	this.entrances = [];
	this.entrancesByName = {};
	this.recurse = 0;
}
Region.prototype.canReach = function(state)
{
	if (this.entrances.some(e => state.can_reach(e)))
		return true;

	return false;
}
Region.prototype.addLocation = function(location)
{
	if (location.name in this.locationsByName) throw "Location with that name already exists";
	
	this.locations.push(location);
	this.locationsByName[location.name] = location;
}
Region.prototype.addExit = function(exit)
{
	if (exit.region.name in this.exitsByName) throw "Exit leading to that region already exists";
	
	this.exits.push(exit);
	this.exitsByName[exit.region.name] = exit;
}
Region.prototype.addEntrance = function(exit)
{
	if (exit.parent.name in this.entrancesByName) throw "Entrance leading from that region already exists";
	
	this.entrances.push(exit);
	this.entrancesByName[exit.parent.name] = exit;
}
Region.prototype.getLocation = function(target)
{
	var loc = this.locationsByName[target];
	if (!loc) throw "Unknown location "+target;
	return loc;
}

function World()
{
	this.regions = [];
	this.regionsByName = {};
	this.locations = [];
	this.locationsByName = {};
}
World.prototype.addRegion = function(region)
{
	if (region.name in this.regionsByName) throw "Region with that name already exists";
	
	this.regions.push(region);
	this.regionsByName[region.name] = region;
}
World.prototype.addLocation = function(location)
{
	if (location.name in this.locationsByName) throw "Location with that name already exists";
	
	this.locations.push(location);
	this.locationsByName[location.name] = location;
}
World.prototype.getRegion = function(target)
{
	var loc = this.regionsByName[target];
	if (!loc) throw "Unknown region "+target;
	return loc;
}
World.prototype.getLocation = function(target)
{
	var loc = this.locationsByName[target];
	if (!loc) throw "Unknown location "+target;
	return loc;
}
//World.prototype.getOrMakeLocation = function(name)
//{
//	if (name in this.locationsByName)
//		return this.locationsByName[name];
//	else
//		return new Location(name);
//}
var rulesUrlCache = {};
World.prototype.loadRegionsURL = function(url, cb) {
	var self = this;
	return new Promise(function(resolve, reject) {
		if (url in rulesUrlCache)
		{
			var obj = JSON.parse(rulesUrlCache[url]);
			try
			{
				resolve(self.loadRegionsObj(obj));
			}
			catch (error)
			{
				delete rulesUrlCache[url];
				reject("Failed to load regions (bad data): "+url+", "+error);
			}
		}
		else
		{
			var req = new XMLHttpRequest();
			req.open('GET', url, true);
			
			req.onload = function() {
				if (req.status >= 200 && req.status < 400) {
					var data = req.responseText;
					//the rules files have # comments in them
					data = data.replace(/\#.*$/gm, "");
					//also, they use newlines in strings. The easiest way to fix this is just to remove all newlines
					data = data.replace(/[\r\n]/gm, "");
					
					rulesUrlCache[url] = data;
					
					var obj = JSON.parse(data);
					try
					{
						resolve(self.loadRegionsObj(obj));
						
					}
					catch (error)
					{
						delete rulesUrlCache[url];
						reject("Failed to load regions (bad data): "+url+", "+error);
					}
				} else {
					reject("Bad response "+req.status+" while loading rule: "+url);
				}
			};
			
			req.onerror = function() {
				reject("Failed to load regions (request failed): "+url);
			};

			req.send();
		}
	});
}

World.prototype.loadRegionsObj = function(obj) {
	if (!obj || !Array.isArray(obj)) throw "Expected array";
	
	var new_regions = [];
	
	obj.forEach(rdata => {
		var region = new Region(this, rdata.region_name);
		if ('dungeon' in rdata)
			region.dungeon = rdata.dungeon;
		
		if ('locations' in rdata)
		{
			for (lname in rdata.locations)
			{
				var lrule = rdata.locations[lname];
				region.locations.push({unresolvedName: lname, unresolvedRule: lrule});
			}
		}
		
		if ('exits' in rdata)
		{
			for (ename in rdata.exits)
			{
				var erule = rdata.exits[ename];
				region.exits.push({unresolvedName: ename, unresolvedRule: erule});
			}
		}
		new_regions.push(region);
		this.addRegion(region);
	});
	
	return new_regions;
}
World.prototype.resolveLocationsExits = function() {
	this.regions.forEach(r => {
		var unresolvedLocations = [];
		var unresolvedExits = [];
		r.locations = r.locations.filter(o => {
			if ('unresolvedName' in o)
			{
				unresolvedLocations.push(o);
				return false;
			} else return true;
		});
		r.exits = r.exits.filter(o => {
			if ('unresolvedName' in o)
			{
				unresolvedExits.push(o);
				return false;
			} else return true;
		});
		
		unresolvedLocations.forEach(o => {
			//var newloc = this.getOrMakeLocation(o.unresolvedName);
			var nrule = o.unresolvedRule;
			try
			{
				nrule = parseRuleString(nrule, this);
				var rast = nrule;
				//nrule = toStringRuleAST(nrule, this); //for testing
				nrule = compileRuleAST(nrule, this);
			}
			catch (error)
			{
				console.error("Failed to parse rule for "+r.name+", location "+lname+": "+error);
				nrule = function(state) { return true; }
			}
			
			var loc = new Location(r, o.unresolvedName, nrule, o.unresolvedRule);
			loc.ruleast = rast;
			loc.ruletrue = isASTTrivialTrue(rast);
			
			r.addLocation(loc);
			this.addLocation(loc);
		});
		unresolvedExits.forEach(o => {
			var cregion = this.regionsByName[o.unresolvedName];
			if (cregion) {
				var nrule = o.unresolvedRule;
				try
				{
					nrule = parseRuleString(nrule, this);
					var rast = nrule;
					//nrule = toStringRuleAST(nrule, this); //for testing
					nrule = compileRuleAST(nrule, this);
				}
				catch (error)
				{
					console.error("Failed to parse rule for "+r.name+", exit "+cregion.name+": "+error);
					nrule = function(state) { return true; }
				}
				
				var exit = new Exit(r, cregion, nrule, o.unresolvedRule);
				exit.ruleast = rast;
				exit.ruletrue = isASTTrivialTrue(rast);
				
				r.addExit(exit);
				cregion.addEntrance(exit);
			}
			else
			{
				console.error("Failed to find region for "+region.name+", exit "+o.unresolvedName);
			}
			
		});
	});
}

function loadRuleFileSync(url) {
	var req = new XMLHttpRequest();
	req.open('GET', url, false); //synchronous for now
	
	req.send();
	if (req.status >= 200 && req.status < 400) {
		var data = req.responseText;
		//the rules files have # comments in them
		data = data.replace(/\#.*$/gm, "");
		//also, they use newlines in strings. The easiest way to fix this is just to remove all newlines
		data = data.replace(/[\r\n]/gm, "");
		
		return JSON.parse(data);
	} else {
		throw "Failed to load rule: "+url;
	}
}


var world = null;
function loadLogic() {
	return new Promise(function(resolve, reject) {
		window.logic_world = world = new World();
		var loading = [];
		
		loading.push(world.loadRegionsURL(logicSrc+"Overworld.json"));
		
		dungeons.forEach(dname => loading.push(world.loadRegionsURL(logicSrc+dname+".json")));
		
		Promise.all(loading).then(function() {
			//var ow = world.regionsByName['Overworld'];
			
			//Entry/reload points, always accessible.
			world.regionsByName['Links House'].canReach = function(state) { return true; }
			
			world.resolveLocationsExits();
			resolve();
		}).catch(function(error) {
			reject(error);
		});
	});
}

var magic_items = ['Dins Fire', 'Farores Wind', 'Nayrus Love', 'Lens of Truth']
var adult_items = ['Bow', 'Hammer', 'Iron Boots', 'Hover Boots', 'Magic Bean']
var magic_arrows = ['Fire Arrows', 'Light Arrows']

var state = null;
var reach_recurse = 0;
var state_prototype = {
	can_reach: function(spot, hint)
	{
		var cache = null;
		
		//try to guess spot
		if (typeof spot === 'string')
		{
			if (hint == 'Location')
			{
				spot = state.world.locationsByName[spot];
				cache = state.loc_acc;
				
			}
			else if (hint == 'Entrance')
			{
				//spot = state.world.exitsByName[spot];
				//cache = state.exit_acc;
				throw 'not supported';
			}
			else
			{
				spot = state.world.regionsByName[spot];
				cache = state.reg_acc;
			}
		}
		else if (spot instanceof Region)
		{
			cache = state.reg_acc;
		}
		else if (spot instanceof Location)
		{
			cache = state.loc_acc;
		}
		else if (spot instanceof Exit)
		{
			cache = state.exit_acc;
		}
		else throw "Unknown spot: "+spot;
		
		if (spot.recurse > 0) return false;
		
		if (spot.name in cache)
		{
			return cache[spot.name];
		}
		else
		{
			spot.recurse++;
			reach_recurse++;
			var reachable = spot.canReach(state);
			spot.recurse--;
			reach_recurse--;
			
			if (!reachable)
			{
				if (reach_recurse == 0)
					cache[spot.name] = reachable;
			}
			else
				cache[spot.name] = reachable;
			return reachable;
		}
	},
	
	has: function(item, count=1)
	{
		if (item instanceof Item)
			item = item.id;
		
		item = item.replace(/_/g, " ");
		
		if (item in state.auto_items)
			state.auto_items[item](state);
		
		return state.prog_items[item] >= count
	},

	item_count: function(item)
	{
		return state.prog_items[item]
	},

	is_adult: function()
	{
		return state.has('Master Sword')
	},

	can_child_attack: function()
	{
		return  state.has_slingshot() ||
				state.has('Boomerang') ||
				state.has_sticks() ||
				state.has_explosives() ||
				state.has('Kokiri Sword') ||
				(state.has('Dins Fire') && state.has('Magic Meter'))
	},

	can_stun_deku: function()
	{
		return  state.is_adult() ||
				state.can_child_attack() ||
				state.has_nuts() ||
				state.has('Deku Shield')
	},

	has_nuts: function()
	{
		return state.has('Deku Nuts')
	},

	has_sticks: function()
	{
		return state.has('Deku Sticks')
	},

	has_bow: function()
	{
		return state.has('Bow')
	},

	has_slingshot: function()
	{
		return state.has('Slingshot')
	},

	has_bombs: function()
	{
		return state.has('Bombs')
	},

	has_blue_fire: function()
	{
		return state.has_bottle() &&
				(state.can_reach('Ice Cavern')
				|| state.can_reach('Ganons Castle Water Trial')
				|| (state.settings.dungeon_mq['Gerudo Training Grounds'] && state.can_reach('Gerudo Training Grounds Stalfos Room')))
	},

	has_ocarina: function()
	{
		return state.has('Ocarina');
	},

	can_play: function(song)
	{
		return state.has_ocarina() && state.has(song)
	},

	can_use: function(item)
	{
		if (item instanceof Item)
			item = item.id;
		
		if (magic_items.includes(item))
			return state.has(item) && state.has('Magic Meter')
		else if (adult_items.includes(item))
			return state.has(item) && state.is_adult()
		else if (magic_arrows.includes(item))
			return state.has(item) && state.is_adult() && state.has_bow() && state.has('Magic Meter')
		else if (item == 'Hookshot')
			return state.has('Hookshot') && state.is_adult()
		else if (item == 'Longshot')
			return state.has('Hookshot', 2) && state.is_adult()
		else if (item == 'Silver Gauntlets')
			return state.has('Gloves', 2) && state.is_adult()
		else if (item == 'Golden Gauntlets')
			return state.has('Gloves', 3) && state.is_adult()
		else if (item == 'Scarecrow')
			return state.has('Hookshot') && state.is_adult() && state.has_ocarina()
		else if (item == 'Distant Scarecrow')
			return state.has('Hookshot', 2) && state.is_adult() && state.has_ocarina()
		else
			return state.has(item)
	},

	can_buy_bombchus: function()
	{
		return state.can_reach('Castle Town Bombchu Bowling') ||
			   state.can_reach('Haunted Wasteland Bombchu Salesman', 'Location');
	},

	has_bombchus: function()
	{
		return state.has('Bombchus')
	},

	has_bombchus_item: function()
	{
		return state.has('Bombchus')
	},

	has_explosives: function()
	{
		return state.has_bombs() || state.has_bombchus()
	},

	can_blast_or_smash: function()
	{
		return state.has_explosives() || (state.is_adult() && state.has('Hammer'))
	},

	can_dive: function()
	{
		return state.has('Scale')
	},

	can_see_with_lens: function()
	{
		return ((state.has('Magic Meter') && state.has('Lens of Truth')) || state.settings.logic_lens != 'all')
	},

	has_projectile: function(age='either')
	{
		if (age == 'child')
			return state.has_explosives() || state.has_slingshot() || state.has('Boomerang')
		else if (age == 'adult')
			return state.has_explosives() || state.has_bow() || state.has('Hookshot')
		else if (age == 'both')
			return state.has_explosives() || ((state.has_bow() || state.has('Hookshot')) && (state.has_slingshot() || state.has('Boomerang')))
		else
			return state.has_explosives() || ((state.has_bow() || state.has('Hookshot')) || (state.has_slingshot() || state.has('Boomerang')))
	},

	has_GoronTunic: function()
	{
		return state.has('Goron Tunic')
	},

	has_ZoraTunic: function()
	{
		return state.has('Zora Tunic') 
	},

	can_leave_forest: function()
	{
		return state.settings.open_forest || state.chests_open["Queen Gohma"]
	},

	can_finish_adult_trades: function()
	{
		zora_thawed = (state.can_play('Zeldas Lullaby') || (state.has('Hover Boots') && state.settings.logic_zora_with_hovers)) && state.has_blue_fire()
		carpenter_access = state.has('Epona') || state.has('Hookshot', 2)
		return (state.has('Claim Check') || ((state.has('Progressive Strength Upgrade') || state.can_blast_or_smash() || state.has_bow()) && (((state.has('Eyedrops') || state.has('Eyeball Frog') || state.has('Prescription') || state.has('Broken Sword')) && zora_thawed) || ((state.has('Poachers Saw') || state.has('Odd Mushroom') || state.has('Cojiro') || state.has('Pocket Cucco') || state.has('Pocket Egg')) && zora_thawed && carpenter_access))))
	},

	has_bottle: function()
	{
		//is_normal_bottle = (item) => (item.startswith('Bottle') && item != 'Bottle with Letter' && (item != 'Bottle with Big Poe' || state.is_adult()));
		return state.prog_items["Bottle"] > 0;
	},

	bottle_count: function()
	{
		return state.prog_items.filter(pritem => pritem.startswith('Bottle') && pritem != 'Bottle with Letter' && (pritem != 'Bottle with Big Poe' || state.is_adult())).length;
	},

	has_hearts: function(count)
	{
		// Warning: This only considers items that are marked as advancement items
		return state.heart_count() >= count
	},

	heart_count: function()
	{
		// Warning: This only considers items that are marked as advancement items
		return (
			state.item_count('Heart Container')
			+ state.item_count('Piece of Heart') // 4
			+ 3 // starting hearts
		)
	},

	has_fire_source: function()
	{
		return state.can_use('Dins Fire') || state.can_use('Fire Arrows')
	},

	guarantee_hint: function()
	{
		if (state.settings.hints == 'mask')
			// has the mask of truth
			return state.has('Zeldas Letter') && state.can_play('Sarias Song') && state.has('Kokiri Emerald') && state.has('Goron Ruby') && state.has('Zora Sapphire')
		else if (state.settings.hints == 'agony')
			// has the Stone of Agony
			return state.has('Stone of Agony')
		return true
	},

	nighttime: function()
	{
		if (state.settings.logic_no_night_tokens_without_suns_song)
			return state.can_play('Suns Song')
		return true
	},

	had_night_start: function()
	{
		stod = state.settings.starting_tod
		// These are all between 6:30 and 18:00
		if (stod == 'evening' ||        // 18
			stod == 'dusk' ||           // 21
			stod == 'midnight' ||       // 00
			stod == 'witching-hour' ||  // 03
			stod == 'early-morning')    // 06
			return true
		else
			return false
	},

	can_finish_GerudoFortress: function()
	{
		if (state.settings.gerudo_fortress == 'normal')
			return state.has('Small Key (Gerudo Fortress)', 4) && (state.can_use('Bow') || state.can_use('Hookshot') || state.can_use('Hover Boots') || state.settings.logic_gerudo_kitchen)
		else if (state.settings.gerudo_fortress == 'fast')
			return state.has('Small Key (Gerudo Fortress)', 1) && state.is_adult()
		else
			return state.is_adult()
	},
};
var items_template = [
	//Equipment
	['Kokiri Sword',                        '', 'Item',             0, 0, 1],
    ['Master Sword',                        '', 'Item',             0, 0, 1],
    ['Biggoron Sword',                      '', 'Item',             0, 0, 1],
    ['Deku Shield',                         '', 'Item',             0, 0, 1],
    ['Hylian Shield',                       '', 'Item',             0, 0, 1],
    ['Mirror Shield',                       '', 'Item',             0, 0, 1],
    ['Kokiri Tunic',                        '', 'Item',             1, 1, 1],
    ['Goron Tunic',                         '', 'Item',             0, 0, 1],
    ['Zora Tunic',                          '', 'Item',             0, 0, 1],
	['Kokiri Boots',                        '', 'Item',             1, 1, 1],
    ['Iron Boots',                          '', 'Item',             0, 0, 1],
    ['Hover Boots',                         '', 'Item',             0, 0, 1],
    ['Wallet',                              '', 'Item',             0, 0, 3, {corner: [99, 200, 500, 999], zerosub: true, regmax: 2}], //99, 200, 500, 999 (Adult, Giant, Tycoon)
    ['Gloves',                              '', 'Item',             0, 0, 3, {zerosub: true}], //None, Goron, Silver, Golden
    ['Scale',                               '', 'Item',             0, 0, 2, {zerosub: true}],
    ['Magic Meter',                         '', 'Item',             0, 0, 2, {zerosub: true}],
    ['Double Defense',                      '', 'Item',             0, 0, 1, {zerosub: true}],
    
	//Quest
	['Heart Container',                     '', 'Item',             0, 0, 8, {oneimg: true, corner: "count"}], //Assuming Normal Difficulty
    ['Piece of Heart',                      '', 'Item',             0, 0, 36, {oneimg: true, corner: "count"}], //Assuming Normal Difficulty
    ['Gold Skulltula Token',       'Skulltula', 'Token',            0, 0, 100, {oneimg: true, corner: "count"}],
    ['Stone of Agony',                      '', 'Item',             0, 0, 1],
    ['Gerudo Membership Card',              '', 'Item',             0, 0, 1],
    ['Ice Trap',                            '', 'Item',             0, 0, 20, {oneimg: true, corner: "count"}], //No accounting for difficulty, people might just want to count this. :D
    
	//['Deku Stick Drop',                     '', 'Event',            0, 0, 1],
    //['Deku Nut Drop',                       '', 'Event',            0, 0, 1],
    //['Triforce',                            '', 'Event',            0, 0, 1],

    ['Minuet of Forest',                    '', 'Song',             0, 0, 1],
    ['Bolero of Fire',                      '', 'Song',             0, 0, 1],
    ['Serenade of Water',                   '', 'Song',             0, 0, 1],
    ['Requiem of Spirit',                   '', 'Song',             0, 0, 1],
    ['Nocturne of Shadow',                  '', 'Song',             0, 0, 1],
    ['Prelude of Light',                    '', 'Song',             0, 0, 1],
    ['Zeldas Lullaby',                      '', 'Song',             0, 0, 1],
    ['Eponas Song',                         '', 'Song',             0, 0, 1],
    ['Sarias Song',                         '', 'Song',             0, 0, 1],
    ['Suns Song',                           '', 'Song',             0, 0, 1],
    ['Song of Time',                        '', 'Song',             0, 0, 1],
    ['Song of Storms',                      '', 'Song',             0, 0, 1],

    ['Kokiri Emerald',                      '', 'Event',            0, 0, 1],
    ['Goron Ruby',                          '', 'Event',            0, 0, 1],
    ['Zora Sapphire',                       '', 'Event',            0, 0, 1],
    ['Forest Medallion',                    '', 'Event',            0, 0, 1],
    ['Fire Medallion',                      '', 'Event',            0, 0, 1],
    ['Water Medallion',                     '', 'Event',            0, 0, 1],
    ['Spirit Medallion',                    '', 'Event',            0, 0, 1],
    ['Shadow Medallion',                    '', 'Event',            0, 0, 1],
    ['Light Medallion',                     '', 'Event',            0, 0, 1],

	//Items
	['Deku Sticks',                         '', 'Item',             0, 0, 3, {corner: [null, 10, 20, 30], oneimg: true}], //0, 10, 20, 30 (Deku Stick Upgrade)
    ['Slingshot',                           '', 'Item',             0, 0, 3, {corner: [null, 30, 40, 50], oneimg: true}], //0, 30, 40, 50 (BulletDeku Seed Bag)
    ['Boomerang',                           '', 'Item',             0, 0, 1], 
    ['Deku Nuts',                           '', 'Item',             0, 0, 3, {corner: [null, 20, 30, 40], oneimg: true}], //0, 20, 30, 40 (Deku Nut Upgrade)
    ['Ocarina',                             '', 'Item',             0, 0, 2, {zerosub: true}],
	['Lens of Truth',                       '', 'Item',             0, 0, 1],
    ['Bombs',                               '', 'Item',             0, 0, 3, {corner: [null, 20, 30, 40], oneimg: true}], //0, 20, 30, 40 (Bomb Bag)
    ['Bombchus',                            '', 'Item',             0, 0, 1, {corner: [null, 50], oneimg: true}], //0, 50
	['Magic Bean',                          '', 'Item',             0, 0, 10, {oneimg: true, corner: "count"}],
    ['Bow',                                 '', 'Item',             0, 0, 3, {corner: [null, 30, 40, 50], oneimg: true}], //0, 30, 40, 50 (Quiver)
    ['Hookshot',                            '', 'Item',             0, 0, 2], //None, Hookshot, Longshot
    ['Hammer',                              '', 'Item',             0, 0, 1],
    ['Fire Arrows',                         '', 'Item',             0, 0, 1],
    ['Ice Arrows',                          '', 'Item',             0, 0, 1],
    ['Light Arrows',                        '', 'Item',             0, 0, 1],
    ['Dins Fire',                           '', 'Item',             0, 0, 1],
    ['Nayrus Love',                         '', 'Item',             0, 0, 1],
    ['Farores Wind',                        '', 'Item',             0, 0, 1],
    ['Bottle',                              '', 'Item',             0, 0, 4, {oneimg: true, corner: "count"}],
    
	//Items / Child Trading
	['Child Trade',                    'Child', 'Item',             0, 0, 8, {zerosub: 3, skip: [2]}],
//    ['Weird Egg',                           '', 'Item',             0, 0, 1],
//    ['Zeldas Letter',                       '', 'Item',             0, 0, 1],
//    ['Keaton Mask',                         '', 'Item',             0, 0, 1],
//    ['Skull Mask',                          '', 'Item',             0, 0, 1],
//    ['Spooky Mask',                         '', 'Item',             0, 0, 1],
//    ['Bunny Hood',                          '', 'Item',             0, 0, 1],
//    ['Mask of Truth',                       '', 'Item',             0, 0, 1],
//    ['Goron Mask',                          '', 'Item',             0, 0, 1],
//    ['Zora Mask',                           '', 'Item',             0, 0, 1],
//    ['Gerudo Mask',                         '', 'Item',             0, 0, 1],
    
	//Items / Adult Trading
	['Adult Trade',                    'Adult', 'Item',             0, 0, 11, {zerosub: 3}],
//    ['Pocket Egg',                          '', 'Item',             0, 0, 1],
//    ['Pocket Cucco',                        '', 'Item',             0, 0, 1],
//    ['Cojiro',                              '', 'Item',             0, 0, 1],
//    ['Odd Mushroom',                        '', 'Item',             0, 0, 1],
//    ['Odd Potion',                          '', 'Item',             0, 0, 1],
//    ['Poachers Saw',                        '', 'Item',             0, 0, 1],
//    ['Broken Sword',                        '', 'Item',             0, 0, 1],
//    ['Prescription',                        '', 'Item',             0, 0, 1],
//    ['Eyeball Frog',                        '', 'Item',             0, 0, 1],
//    ['Eyedrops',                            '', 'Item',             0, 0, 1],
//    ['Claim Check',                         '', 'Item',             0, 0, 1],
    
	//Items / Extra
	['Bottle with Letter',      'BottleLetter', 'Item',             0, 0, 1],
    ['Big Poe',                 'BottleBigPoe', 'Item',             0, 0, 10, {oneimg: true, corner: "count"}],
	
	//Items / Dungeon (for keysanity)
	['Boss Key (Forest Temple)',            '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Forest Temple'}],
    ['Boss Key (Fire Temple)',              '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Fire Temple'}],
    ['Boss Key (Water Temple)',             '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Water Temple'}],
    ['Boss Key (Spirit Temple)',            '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Spirit Temple'}],
    ['Boss Key (Shadow Temple)',            '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Shadow Temple'}],
    ['Boss Key (Ganons Castle)',            '', 'BossKey',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Ganons Castle'}],
    ['Compass (Deku Tree)',                 '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Deku Tree'}],
    ['Compass (Dodongos Cavern)',           '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Dodongos Cavern'}],
    ['Compass (Jabu Jabus Belly)',          '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Jabu Jabus Belly'}],
    ['Compass (Forest Temple)',             '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Forest Temple'}],
    ['Compass (Fire Temple)',               '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Fire Temple'}],
    ['Compass (Water Temple)',              '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Water Temple'}],
    ['Compass (Spirit Temple)',             '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Spirit Temple'}],
    ['Compass (Shadow Temple)',             '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Shadow Temple'}],
    ['Compass (Bottom of the Well)',        '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Bottom of the Well'}],
    ['Compass (Ice Cavern)',                '', 'Compass',          0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Ice Cavern'}],
    ['Map (Deku Tree)',                     '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Deku Tree'}],
    ['Map (Dodongos Cavern)',               '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Dodongos Cavern'}],
    ['Map (Jabu Jabus Belly)',              '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Jabu Jabus Belly'}],
    ['Map (Forest Temple)',                 '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Forest Temple'}],
    ['Map (Fire Temple)',                   '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Fire Temple'}],
    ['Map (Water Temple)',                  '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Water Temple'}],
    ['Map (Spirit Temple)',                 '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Spirit Temple'}],
    ['Map (Shadow Temple)',                 '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Shadow Temple'}],
    ['Map (Bottom of the Well)',            '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Bottom of the Well'}],
    ['Map (Ice Cavern)',                    '', 'Map',              0, 1, 1, {oneimg: true, corner: "count", dungeon: 'Ice Cavern'}],
    ['Small Key (Forest Temple)',           '', 'SmallKey',         0, 6, 6, {oneimg: true, corner: "count", dungeon: 'Forest Temple'}],           //5 norm / 6 mq
    ['Small Key (Fire Temple)',             '', 'SmallKey',         0, 8, 8, {oneimg: true, corner: "count", dungeon: 'Fire Temple'}],             //8 norm / 5 mq
    ['Small Key (Water Temple)',            '', 'SmallKey',         0, 6, 6, {oneimg: true, corner: "count", dungeon: 'Water Temple'}],            //6 norm / 2 mq
    ['Small Key (Spirit Temple)',           '', 'SmallKey',         0, 7, 7, {oneimg: true, corner: "count", dungeon: 'Spirit Temple'}],           //5 norm / 7 mq
    ['Small Key (Shadow Temple)',           '', 'SmallKey',         0, 6, 6, {oneimg: true, corner: "count", dungeon: 'Shadow Temple'}],           //5 norm / 6 mq
    ['Small Key (Bottom of the Well)',      '', 'SmallKey',         0, 3, 3, {oneimg: true, corner: "count", dungeon: 'Bottom of the Well'}],      //3 norm / 2 mq
    ['Small Key (Gerudo Training Grounds)', '', 'SmallKey',         0, 9, 9, {oneimg: true, corner: "count", dungeon: 'Gerudo Training Grounds'}], //9 norm / 3 mq
    ['Small Key (Gerudo Fortress)',         '', 'SmallKey',         0, 4, 4, {oneimg: true, corner: "count", dungeon: 'Gerudo Fortress'}],         //4 norm / 1 fast
    ['Small Key (Ganons Castle)',           '', 'SmallKey',         0, 3, 3, {oneimg: true, corner: "count", dungeon: 'Ganons Castle'}],           //2 norm / 3 mq
	
	//Auto Items (These are automatically granted when certain locations can be reached)
	//['Epona',                               '', 'Auto', 0, 1],
    //['Carpenter Rescue',                    '', 'Auto', 0, 1],
    //['Forest Trial Clear',                  '', 'Auto', 0, 1],
    //['Fire Trial Clear',                    '', 'Auto', 0, 1],
    //['Water Trial Clear',                   '', 'Auto', 0, 1],
    //['Shadow Trial Clear',                  '', 'Auto', 0, 1],
    //['Spirit Trial Clear',                  '', 'Auto', 0, 1],
    //['Light Trial Clear',                   '', 'Auto', 0, 1],
];

function itemNameToID(name) { return name.replace(/[\(\)]/g, ''); }

function getItemNum(itemname) {
	for (var i = 0; i < items_template.length; i++)
		if (itemNameToID(items_template[i][0]) == itemname)
			return i;
	return itemname;
}
function lookupItemNum(itemnum) {
	var num = NaN;
	
	if (typeof itemnum === 'number')
		num = itemnum;
	else if (typeof itemnum === 'string')
		num = parseInt(itemnum);
	
	if (num != NaN) {
		if (num < items_template.length)
			return itemNameToID(items_template[num][0]);
		else return "Sold Out";
	}
	return itemnum;
}

var auto_items_template = {
	'Epona':              function (state) { return state.can_reach('Epona', 'Location'); },
    'Carpenter Rescue':   function (state) { return state.can_reach('Gerudo Fortress Carpenter Rescue', 'Location'); },
    'Forest Trial Clear': function (state) { return state.can_reach('Ganons Castle Forest Trial Clear', 'Location'); },
    'Fire Trial Clear':   function (state) { return state.can_reach('Ganons Castle Fire Trial Clear', 'Location'); },
    'Water Trial Clear':  function (state) { return state.can_reach('Ganons Castle Water Trial Clear', 'Location'); },
    'Shadow Trial Clear': function (state) { return state.can_reach('Ganons Castle Shadow Trial Clear', 'Location'); },
    'Spirit Trial Clear': function (state) { return state.can_reach('Ganons Castle Spirit Trial Clear', 'Location'); },
    'Light Trial Clear':  function (state) { return state.can_reach('Ganons Castle Light Trial Clear', 'Location'); },
}
var settings_data = [
	['logic_morpha_with_scale',                  'bool',          false, 'Trick',       'Morpha with Gold Scale'],
	['logic_fewer_tunic_requirements',           'bool',          false, 'Trick',       'Fewer Tunic Requirements'],
	['logic_child_deadhand',                     'bool',          false, 'Trick',       'Child Deadhand without Kokiri Sword'],
	['logic_man_on_roof',                        'bool',          false, 'Trick',       'Man on Roof without Hookshot'],
	['logic_dc_staircase',                       'bool',          false, 'Trick',       'Dodongo\'s Cavern Staircase with Bow'],
	['logic_dc_jump',                            'bool',          false, 'Trick',       'Dodongo\'s Cavern Spike Trap Room Jump without Hover Boots'],
	['logic_gerudo_kitchen',                     'bool',          false, 'Trick',       'Gerudo Fortress "Kitchen" with No Additional Items'],
	['logic_deku_basement_gs',                   'bool',          false, 'Trick',       'Deku Tree Basement Vines GS with Jump Slash'],
	['logic_rusted_switches',                    'bool',          false, 'Trick',       'Hammer Rusted Switches Through Walls'],
	['logic_botw_basement',                      'bool',          false, 'Trick',       'Bottom of the Well Basement Chest with Strength & Sticks'],
	['logic_forest_mq_block_puzzle',             'bool',          false, 'Trick',       'Skip Forest Temple MQ Block Puzzle with Bombchu'],
	['logic_spirit_child_bombchu',               'bool',          false, 'Trick',       'Spirit Temple Child Side Bridge with Bombchu'],
	['logic_windmill_poh',                       'bool',          false, 'Trick',       'Windmill PoH as Adult with Nothing'],
	['logic_crater_bean_poh_with_hovers',        'bool',          false, 'Trick',       'Crater\'s Bean PoH with Hover Boots'],
	['logic_gtg_mq_with_hookshot',               'bool',          false, 'Trick',       'Gerudo Training Grounds MQ Left Side Silver Rupees with Hookshot'],
	['logic_forest_vines',                       'bool',          false, 'Trick',       'Forest Temple East Courtyard Vines with Hookshot'],
	['logic_forest_well_swim',                   'bool',          false, 'Trick',       'Swim Through Forest Temple MQ Well with Hookshot'],
	['logic_dmt_bombable',                       'bool',          false, 'Trick',       'Death Mountain Trail Bombable Chest with Strength'],
	['logic_water_bk_chest',                     'bool',          false, 'Trick',       'Water Temple Boss Key Chest with No Additional Items'],
	['logic_adult_kokiri_gs',                    'bool',          false, 'Trick',       'Adult Kokiri Forest GS with Hover Boots'],
	['logic_spirit_mq_frozen_eye',               'bool',          false, 'Trick',       'Spirit Temple MQ Frozen Eye Switch without Fire'],
	['logic_fire_mq_bk_chest',                   'bool',          false, 'Trick',       'Fire Temple MQ Boss Key Chest without Bow'],
	['logic_zora_with_cucco',                    'bool',          false, 'Trick',       'Zora\'s Domain Entry with Cucco'],
	['logic_zora_with_hovers',                   'bool',          false, 'Trick',       'Zora\'s Domain Entry with Hover Boots'],
	['open_forest',                              'bool',           true, 'Open',        'Open Forest'],
	['open_kakariko',                            'bool',          false, 'Open',        'Open Kakariko Gate'],
	['open_door_of_time',                        'bool',          false, 'Open',        'Open Door of Time'],
	['open_fountain',                            'bool',          false, 'Open',        'Open Zora\'s Fountain'],
	['gerudo_fortress',                          'choice',     'normal', 'Open',        'Gerudo Fortress',
		['normal', 'fast', 'open']],
	['bridge',                                   'choice', 'medallions', 'Open',        'Rainbow Bridge Requirement',
		['open', 'vanilla', 'stones', 'medallions', 'dungeons', 'tokens']],
//	['logic_rules',                              'choice', 'glitchless', 'World',       'Logic Rules',
//		['glitchless', 'none']],
//	['all_reachable',                            'bool',           true, 'World',       'All Locations Reachable'],
	['bombchus_in_logic',                        'bool',           true, 'World',       'Bombchus Are Considered in Logic'],
//	['one_item_per_dungeon',                     'bool',          false, 'World',       'Dungeons Have One Major Item'],
//	['trials_random',                            'bool',          false, 'Open',        'Random Number of Ganon\'s Trials'],
//	['trials',                                   'intrange',          6, 'Open',        'Ganon\'s Trial Count', [0, 6]],
//	['no_escape_sequence',                       'bool',          false, 'Convenience', 'Skip Tower Escape Sequence'],
//	['no_guard_stealth',                         'bool',          false, 'Convenience', 'Skip Child Stealth'],
//	['no_epona_race',                            'bool',          false, 'Convenience', 'Skip Epona Race'],
//	['fast_chests',                              'bool',           true, 'Convenience', 'Fast Chest Cutscenes'],
	['logic_no_night_tokens_without_suns_song',  'bool',          false, 'Convenience', 'Nighttime Skulltulas Expect Sun\'s Song'],
//	['free_scarecrow',                           'bool',          false, 'Convenience', 'Free Scarecrow\'s Song'],
//	['start_with_fast_travel',                   'bool',          false, 'Convenience', 'Start with Fast Travel'],
//	['start_with_rupees',                        'bool',          false, 'Convenience', 'Start with Max Rupees'],
//	['start_with_wallet',                        'bool',          false, 'Convenience', 'Start with Tycoon\'s Wallet'],
//	['start_with_deku_equipment',                'bool',          false, 'Convenience', 'Start with Deku Equipment'],
//	['big_poe_count_random',                     'bool',          false, 'Convenience', 'Random Big Poe Target Count'],
//	['big_poe_count',                            'intrange',         10, 'Convenience', 'Big Poe Target Count', [1, 10]],
//	['shuffle_kokiri_sword',                     'bool',           true, 'Shuffle',     'Shuffle Kokiri Sword'],
//	['shuffle_ocarinas',                         'bool',           true, 'Shuffle',     'Shuffle Ocarinas'],
	['shuffle_weird_egg',                        'bool',           true, 'Shuffle',     'Shuffle Weird Egg'],
//	['shuffle_gerudo_card',                      'bool',          false, 'Shuffle',     'Shuffle Gerudo Card'],
//	['shuffle_song_items',                       'bool',           true, 'Shuffle',     'Shuffle Songs with Items'],
	['shuffle_scrubs',                           'choice',        'off', 'Shuffle',     'Scrub Shuffle',
		['off', 'low', 'regular', 'random']],
//	['shopsanity',                               'choice',        'off', 'Shuffle',     'Shopsanity',
//		['off', '0', '1', '2', '3', '4', 'random']],
//	['tokensanity',                              'choice',        'off', 'Shuffle',     'Tokensanity',
//		['off', 'dungeons', 'all']],
//	['shuffle_mapcompass',                       'choice',    'dungeon', 'Shuffle',     'Shuffle Dungeon Items',
//		['remove', 'startwith', 'dungeon', 'keysanity']],
//	['shuffle_smallkeys',                        'choice',    'dungeon', 'Shuffle',     'Shuffle Small Keys',
//		['remove', 'dungeon', 'keysanity']],
//	['shuffle_bosskeys',                         'choice',    'dungeon', 'Shuffle',     'Shuffle Boss Keys',
//		['remove', 'dungeon', 'keysanity']],
//	['enhance_map_compass',                      'bool',          false, 'Shuffle',     'Maps and Compasses Give Information'],
	['unlocked_ganondorf',                       'bool',          false, 'Shuffle',     'Remove Ganon\'s Boss Door Lock'],
//	['mq_dungeons_random',                       'bool',          false, 'World',       'Random Number of MQ Dungeons'],
//	['mq_dungeons',                              'intrange',          0, 'World',       'MQ Dungeons', [0, 12]],
//	['logic_earliest_adult_trade',               'choice', 'pocket_egg', 'Checks',      'Earliest Adult Trade',
//		['pocket_egg', 'pocket_cucco', 'cojiro', 'odd_mushroom', 'poachers_saw', 'broken_sword', 'prescription', 'eyeball_frog', 'eyedrops', 'claim_check']],
//	['logic_latest_adult_trade',                 'choice','claim_check', 'Checks',      'Lastest Adult Trade',
//		['pocket_egg', 'pocket_cucco', 'cojiro', 'odd_mushroom', 'poachers_saw', 'broken_sword', 'prescription', 'eyeball_frog', 'eyedrops', 'claim_check']],
	['logic_lens',                               'choice',        'all', 'Trick',       'Lens of Truth Required',
		['all', 'chest-wasteland', 'chest']],
//	['ocarina_songs',                            'bool',          false, 'Other',       'Randomize Ocarina Song Notes'],
//	['correct_chest_sizes',                      'bool',          false, 'Other',       'Chest Size Matches Contents'],
//	['clearer_hints',                            'bool',          false, 'Other',       'Clearer Hints'],
	['hints',                                    'choice',      'agony', 'Other',       'Gossip Stones',
		['none', 'mask', 'agony', 'always']],
//	['hint_dist',                                'choice',   'balanced', 'Other',       'Hint Distribution',
//		['useless', 'balanced', 'strong', 'very_strong', 'tournament']],
//	['text_shuffle',                             'choice',       'none', 'Other',       'Text Shuffle',
//		['none', 'except_hints', 'complete']],
//	['junk_ice_traps',                           'choice',     'normal', 'Other',       'Ice Traps',
//		['off', 'normal', 'on', 'mayhem', 'onslaught']],
//	['item_pool_value',                          'choice',   'balanced', 'Other',       'Item Pool',
//		['plentiful', 'balanced', 'scarce', 'minimal']],
	['damage_multiplier',                        'choice',     'normal', 'Other',       'Damage Multiplier',
		['half', 'normal', 'double', 'quadruple', 'ohko', ]],
	['starting_tod',                             'choice',    'default', 'Other',       'Starting Time of Day',
		['default', /*'random',*/ 'early-morning', 'morning', 'noon', 
		 'afternoon', 'evening', 'dusk', 'midnight', 'witching-hour']],
//	['default_targeting',                        'choice',       'hold', 'Cosmetic',    'Default Targeting Option',
//		['hold', 'switch']],
]
function makeItemPic(name, type, pic)
{
	if (pic && pic.length != 0)
		return pic;
	
	if (type == 'SmallKey' || type == 'FortressSmallKey')
		return 'SmallKey';
	if (type == 'Map')
		return 'DungeonMap';
	if (type == 'Compass' || type == 'BossKey')
		return type;
	
	return name.replace(/\s+/g, '');	
}
items_template.forEach(it => {
	it[1] = makeItemPic(it[0], it[2], it[1]);
});
window.items_template = items_template;

var remap_template = 
{
	'Bomb_Bag':                     'Bombs',
	'Progressive_Hookshot':         'Hookshot',
	'Progressive_Strength_Upgrade': 'Gloves',
	'Buy_Deku_Shield':              'Deku Shield',
	//'Longshot':                     'Hookshot',
	//'Scarecrow':                    'Hookshot',
	//'Distant_Scarecrow':            'Hookshot',
	'Weird_Egg':                    ['Child Trade', 1],
	'Zeldas_Letter':                ['Child Trade', 3],
	
    'Boss_Key_Forest_Temple': 'Boss Key (Forest Temple)',
    'Boss_Key_Fire_Temple':   'Boss Key (Fire Temple)',
    'Boss_Key_Water_Temple':  'Boss Key (Water Temple)',
    'Boss_Key_Spirit_Temple': 'Boss Key (Spirit Temple)',
    'Boss_Key_Shadow_Temple': 'Boss Key (Shadow Temple)',
    'Boss_Key_Ganons_Castle': 'Boss Key (Ganons Castle)',
}
var autos_template = 
{
	'Epona':                     'Epona',
	'Carpenter Rescue':          'Gerudo Fortress Carpenter Rescue',
	'Forest Trial Clear':        'Ganons Castle Forest Trial Clear',
	'Fire Trial Clear':          'Ganons Castle Fire Trial Clear',
	'Water Trial Clear':         'Ganons Castle Water Trial Clear',
	'Shadow Trial Clear':        'Ganons Castle Shadow Trial Clear',
	'Spirit Trial Clear':        'Ganons Castle Spirit Trial Clear',
	'Light Trial Clear':         'Ganons Castle Light Trial Clear',
}

//var settings_template = 
//{
//	logic_man_on_roof: false,
//	logic_fewer_tunic_requirements: false,
//	logic_adult_kokiri_gs: false,
//	logic_water_bk_chest: false,
//	logic_morpha_with_scale: false,
//	logic_child_deadhand: false,
//	logic_dmt_bombable: false,
//	logic_deku_basement_gs: false,
//	logic_dc_jump: false,
//	logic_gerudo_kitchen: false,
//	logic_crater_bean_poh_with_hovers: false,
//	logic_botw_basement: false,
//	logic_zora_with_cucco: false,
//	logic_forest_vines: false,
//	gerudo_fortress: 'normal',
//	skipped_trials: {},
//	keysanity: false,
//	shuffle_weird_egg: true,
//	open_kakariko: false,
//	open_forest: true,
//	open_fountain: false,
//	open_door_of_time: false,
//	unlocked_ganondorf: false,
//	logic_lens: 'all', //['all', 'chest-wasteland', 'chest']
//	bridge: 'medallions', //['dungeons', 'medallions', 'vanilla', 'open', 'stones', 'tokens']
//	big_poe_count: 10, //[1..10]
//	damage_multiplier: 'normal', //['half', 'normal', 'double', 'quadruple', 'ohko']
//}
function stateInit() {
	window.logic_state = state = Object.create(state_prototype);
	
	state.item_data = {};
	state.prog_items = {};
	state.chests_open = {};
	window.item_data   = state.item_data;
	window.item_status = state.prog_items;
	window.chests_open = state.chests_open;
	stateClearAccess();
}
function stateResetSettings()
{
	state.settings = {skipped_trials: {}, dungeon_mq: {}};
	settings_data.forEach(s => {
		var skey = s[0];
		var sdef = s[2];
		state.settings[skey] = sdef;
	});
}
function stateLoadWorld(world)
{
	state.world = world;
	state.world.locations.forEach(l => state.loc_acc[l.name] = false);
	
	items_template.forEach(it => {
		var item = ItemFromArgs(it);
		var id = itemNameToID(it[0]);
		item.id = id;
		state.item_data[id] = item;
		state.prog_items[id] = item.defcount;
	});
	state.hints = 'none'; //['none', 'mask', 'agony']
	state.remap = Object.assign({}, remap_template);
	state.auto_items = Object.assign({}, auto_items_template);
	stateResetSettings();
}
function stateClearAccess() {
	state.reg_acc = {};
	state.loc_acc = {};
	state.exit_acc = {};
	window.reg_acc    = state.reg_acc;
	window.loc_acc    = state.loc_acc;
	window.exit_acc   = state.exit_acc;
}
function stateExploreWorld(reset) {
	if (reset)
		stateClearAccess();
	
	var count = Object.keys(state.reg_acc).reduce((a, k) => a + (state.reg_acc[k] ? 1 : 0), 0);
	do {
		for (var k in state.reg_acc)
			if (!state.reg_acc[k]) delete state.reg_acc[k];
		for (var k in state.exit_acc)
			if (!state.exit_acc[k]) delete state.exit_acc[k];
		
		var ncount = Object.keys(state.reg_acc).reduce((a, k) => a + (state.reg_acc[k] ? 1 : 0), 0);
		if (ncount == count)
			break;
		count = ncount;
	} while (true);
	
	//world.locations.forEach(l => l.canReach(logic_state));
}

function testAllRules(state)
{
	logic_world.regions.forEach(r => {
		r.locations.forEach(o => {
			try {
				o.rule(state);
			}
			catch (error)
			{
				console.error("For "+r.name+" location "+o.name+", failed to call rule \""+o.rulesrc.replace(/\s+/g, ' ')+"\": "+error.toString()+"\n"+(error.stack ? error.stack.toString() : ""));
			}
		});
		r.exits.forEach(o => {
			try {
				o.rule(state);
			}
			catch (error)
			{
				console.error("For "+r.name+" exit "+o.name+", failed to call rule \""+o.rulesrc.replace(/\s+/g, ' ')+"\": "+error.toString()+"\n"+(error.stack ? error.stack.toString() : ""));
			}
		});
	});
}
function dumpAllRules()
{
	var spots = logic_world.regions.flatMap(r => r.locations.concat(r.exits));
	var rules = spots.map(s => {
		return s.parent.name + (s instanceof Location ? " -] " : " -> ") + s.name + ": " + s.rulesrc.replace(/\s+/g, ' ')
	})
	var str = "";
	
	return console.log(rules.join("\n"));
}

window.logic_world = null;
window.logic_state = null;
window.Region = Region;
window.World = World;
window.getItemNum = getItemNum;
window.lookupItemNum = lookupItemNum;
window.loadLogic = loadLogic;
window.stateInit = stateInit;
window.stateLoadWorld = stateLoadWorld;
window.stateClearAccess = stateClearAccess;
window.stateExploreWorld = stateExploreWorld;
window.stateResetSettings = stateResetSettings;
window.testAllRules = testAllRules;
window.dumpAllRules = dumpAllRules;
window.settings_data = settings_data;
window.reach_location = function (name) { return logic_world.getLocation(name).canReach(logic_state); }
window.reach_region   = function (name) { return logic_world.getRegion(name).canReach(logic_state); }

})();
