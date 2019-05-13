function chestResolveTarget(region, target, data)
{
	target = target.replace(/!G /g, "GS "+region+" ");
	target = target.replace(/! /g, region+" ");
	if (!data.allowquote)
		target = target.replace(/'/g, '');
	return target;
}
function chestResolveName(region, target, data)
{
	target = target.replace(/!G /g, "(GS) ");
	target = target.replace(/! /g, "");
	return target;
}
function chestResolveData(region, target, data, mode)
{
	if (!data) //'' is falsey
		data = {};
	if (data === 'v')
		data = {visible: true};
	if (typeof data === 'string')
		data = {name: data};
	
	if (typeof data !== 'object')
		throw 'unrecognized chest data';
	
	if (!data.hasOwnProperty('type') && (target.match(/^GS /g) || target.match(/!G /g)))
		data.type = 'skulltula';
	
	data.target = chestResolveTarget(region, target, data);
	if (!data.name)
		data.name = chestResolveName(region, target, data);
	
	return data;
}
function chestMakeID(chest) { return chest.target.replace(/[^a-zA-Z0-9]/g, ''); }

// Define dungons on map. Each key in the chestlist indicates a location in the randomizer logic.
// The key in the chestlist undergoes some processing before being used for some purposes:
// - For location lookup: '!G ' is replaced with 'GS {0} ', where {0} is the region name. In addition, the default type for the location becomes "skulltula".
// - For location lookup: '! ' is replaced with '{0} ', where {0} is the region name.
// - For display name: '!G ' is replaced with '(GS) '.
// - For display name: '! ' is replaced with ''.
// The value for a key in the chestlist shall be:
// - Any object: Overrides default properties for the chest.
// - null or '': Treated as {}.
// - 'v': Treated as an object {visible: true}.
// - Any other string: Treated as {name: <the string>}.
// The chest data supports the following properties:
// - name: The display name for the chest; see above for how the default is calculated.
// - type: 'normal', 'skulltula'; indicates the type of the chest; defaults to 'normal'.
// - visible: true or false; if the type of this item can be determined without obtaining it; defaults to false.
var dungeons = [
    {
        name: "Deku Tree",
		regions: ['Deku Tree Lobby', 'Deku Tree Slingshot Room', 'Deku Tree Boss Room'],
        x: "87.0%",
        y: "57.0%",
        chestlist: {
            '! Lobby Chest':                'Lobby Chest (Map)',
            '! Compass Chest':              '3 Pillars Chest (Compass)',
            '! Compass Room Side Chest':    '3 Pillars Side Chest',
            '! Basement Chest':             '',
            '! Slingshot Chest':            'Floating Platform Chest (Slingshot)',
            '! Slingshot Room Side Chest':  'Floating Platform Side Chest',
            'Queen Gohma':                  'Queen Gohma (Opens Forest)',
            '!G Compass Room':              '',
            '!G Basement Vines':            '',
            '!G Basement Gate':             '',
            '!G Basement Back Room':        '',
        }
    },
    {
        name: "Water Temple",
        regions: ['Water Temple Lobby', 'Water Temple Middle Water Level', 'Water Temple Dark Link Region'],
        x: "36.1%",
        y: "91.0%",
        chestlist: {
            '! Map Chest':                '4 Spikes Chest (Map)',
            '! Compass Chest':            '',
            '! Torches Chest':            '',
            '! Dragon Chest':             '',
            '! Central Bow Target Chest': '',
            '! Boss Key Chest':           '',
            '! Central Pillar Chest':     '',
            '! Cracked Wall Chest':       '',
            '! Dark Link Chest':          '',
            '! River Chest':              '',
            'Morpha':                     'Morpha',
			//listed separately since it requires iron boots
            'Morpha Heart':               'Morpha Heart',
            '!G South Basement':          '',
            '!G Near Boss Key Chest':     '',
            '!G Central Room':            '',
            '!G Serpent River':           '',
            '!G Falling Platform Room':   '',
        },
    },
    {
        name: "Gerudo Training Grounds",
        regions: ['Gerudo Training Grounds Lobby', 'Gerudo Training Grounds Central Maze', 'Gerudo Training Grounds Central Maze Right', 'Gerudo Training Grounds Lava Room', 'Gerudo Training Grounds Hammer Room', 'Gerudo Training Grounds Eye Statue Lower', 'Gerudo Training Grounds Eye Statue Upper', 'Gerudo Training Grounds Heavy Block Room'],
        x: "18.8%",
        y: "28.0%",
        chestlist: {
            '! Lobby Left Chest':              '',
            '! Lobby Right Chest':             '',
            '! Stalfos Chest':                 '',
            '! Beamos Chest':                  '',
            '! Hidden Ceiling Chest':          '',
            '! Maze Path First Chest':         '',
            '! Maze Path Second Chest':        '',
            '! Maze Path Third Chest':         '',
            '! Maze Path Final Chest':         '',
            '! Maze Right Central Chest':      '',
            '! Maze Right Side Chest':         '',
            '! Freestanding Key':              'Maze Right Side Key',
            '! Underwater Silver Rupee Chest': '',
            '! Hammer Room Clear Chest':       '',
            '! Hammer Room Switch Chest':      '',
            '! Eye Statue Chest':              '',
            '! Near Scarecrow Chest':          '',
            '! Before Heavy Block Chest':      '',
            '! Heavy Block First Chest':       '',
            '! Heavy Block Second Chest':      '',
            '! Heavy Block Third Chest':       '',
            '! Heavy Block Fourth Chest':      '',
        },
    },
    {
        name: "Spirit Temple",
        regions: ['Spirit Temple Lobby', 'Child Spirit Temple', 'Child Spirit Temple Climb', 'Early Adult Spirit Temple', 'Spirit Temple Central Chamber', 'Spirit Temple Outdoor Hands', 'Spirit Temple Beyond Central Locked Door', 'Spirit Temple Beyond Final Locked Door'],
        x: "02.5%",
        y: "17.0%",
        chestlist: {
            '! Child Left Chest':              '',
            '! Child Right Chest':             '',
            '! Compass Chest':                 '',
            '! Early Adult Right Chest':       '',
            '! First Mirror Right Chest':      '',
            '! First Mirror Left Chest':       '',
            '! Map Chest':                     '',
            '! Child Climb East Chest':        '',
            '! Child Climb North Chest':       '',
            '! Sun Block Room Chest':          '',
            '! Statue Hand Chest':             '',
            '! NE Main Room Chest':            '',
            'Silver Gauntlets Chest':          'Silver Gauntlets Chest',
            'Mirror Shield Chest':             'Mirror Shield Chest',
            '! Near Four Armos Chest':         '',
            '! Hallway Left Invisible Chest':  '',
            '! Hallway Right Invisible Chest': '',
            '! Boss Key Chest':                '',
            '! Topmost Chest':                 '',
            'Twinrova':                        'Twinrova',
            '!G Metal Fence':                  '',
            '!G Bomb for Light Room':          '',
            '!G Boulder Room':                 '',
            '!G Hall to West Iron Knuckle':    '',
            '!G Lobby':                        '',
        },
    },
    {
        name: "Bottom of the Well",
        regions: ['Bottom of the Well'],
        x: "68.0%",
        y: "23.0%",
        chestlist: {
            '! Front Left Hidden Wall':   '',
            '! Front Center Bombable':    '',
            '! Right Bottom Hidden Wall': '',
            '! Center Large Chest':       '',
            '! Center Small Chest':       '',
            '! Back Left Bombable':       '',
            '! Freestanding Key':         'Coffin Key',
            '! Defeat Boss':              '',
            '! Invisible Chest':          '',
            '! Underwater Front Chest':   '',
            '! Underwater Left Chest':    '',
            '! Basement Chest':           '',
            '! Locked Pits':              '',
            '! Behind Right Grate':       '',
            'GS Well West Inner Room':    '(GS) West Inner Room',
            'GS Well East Inner Room':    '(GS) East Inner Room',
            'GS Well Like Like Cage':     '(GS) Like Like Cage',
        },
    },
    {
        name: "Shadow Temple",
        regions: ['Shadow Temple Beginning', 'Shadow Temple First Beamos', 'Shadow Temple Huge Pit', 'Shadow Temple Wind Tunnel', 'Shadow Temple Beyond Boat'],
        x: "76.0%",
        y: "21.0%",
        chestlist: {
            '! Map Chest':                        '',
            '! Hover Boots Chest':                '',
            '! Compass Chest':                    '',
            '! Early Silver Rupee Chest':         '',
            '! Invisible Blades Visible Chest':   '',
            '! Invisible Blades Invisible Chest': '',
            '! Falling Spikes Lower Chest':       '',
            '! Falling Spikes Upper Chest':       '',
            '! Falling Spikes Switch Chest':      '',
            '! Invisible Spikes Chest':           '',
            '! Freestanding Key':                 'Giant Pot Key',
            '! Wind Hint Chest':                  '',
            '! After Wind Enemy Chest':           '',
            '! After Wind Hidden Chest':          '',
            '! Spike Walls Left Chest':           '',
            '! Boss Key Chest':                   '',
            '! Hidden Floormaster Chest':         '',
            'Bongo Bongo':                        'Bongo Bongo',
            '!G Like Like Room':                  '',
            '!G Crusher Room':                    '',
            '!G Single Giant Pot':                '',
            '!G Near Ship':                       '',
            '!G Triple Giant Pot':                '',
        },
    },
    {
        name: "Dodongo's Cavern",
        regions: ['Dodongos Cavern Beginning', 'Dodongos Cavern Lobby', 'Dodongos Gossip Stone', 'Dodongos Cavern Climb', 'Dodongos Cavern Far Bridge', 'Dodongos Cavern Boss Area'],
        x: "59.0%",
        y: "13.5%",
        chestlist: {
            '! Map Chest':              'Lobby Left Side Chest (Map)',
            '! Compass Chest':          'Armos Chest (Compass)',
            '! Bomb Flower Platform':   '',
            '! Bomb Bag Chest':         'Upper Platform Chest (Bomb Bag)',
            '! End of Bridge Chest':    '',
            'Chest Above King Dodongo': 'Chest Above King Dodongo',
            'King Dodongo':             'King Dodongo',
            '!G East Side Room':        {allowquote:true},
            '!G Scarecrow':             {allowquote:true},
            '!G Vines Above Stairs':    {allowquote:true},
            '!G Alcove Above Stairs':   {allowquote:true},
            '!G Back Room':             {allowquote:true},
        },
    },
    {
        name: "Fire Temple",
        regions: ['Fire Temple Lower', 'Fire Temple Middle', 'Fire Temple Upper'],
        x: "68.0%",
        y: "06.5%",
        chestlist: {
            '! Chest Near Boss':              '',
            '! Fire Dancer Chest':            '',
            '! Boss Key Chest':               '',
            '! Big Lava Room Bombable Chest': '',
            '! Big Lava Room Open Chest':     '',
            '! Boulder Maze Lower Chest':     '',
            '! Boulder Maze Upper Chest':     '',
            '! Boulder Maze Side Room':       '',
            '! Boulder Maze Bombable Pit':    '',
            '! Scarecrow Chest':              '',
            '! Map Chest':                    '',
            '! Compass Chest':                '',
            '! Highest Goron Chest':          '',
            '! Megaton Hammer Chest':         '',
            'Volvagia':                       'Volvagia',
            '!G Song of Time Room':           '',
            '!G Basement':                    '',
            '!G Unmarked Bomb Wall':          '',
            '!G East Tower Climb':            '',
            '!G East Tower Top':              '',
        },
    },
    {
        name: "Jabu Jabu's Belly",
        regions: ['Jabu Jabus Belly Beginning', 'Jabu Jabus Belly Main', 'Jabu Jabus Belly Depths', 'Jabu Jabus Belly Boss Area'],
        x: "91.5%",
        y: "21.0%",
        chestlist: {
            'Boomerang Chest': 'Far Right Y Chest (Boomerang)',
            '! Map Chest':     'Far Left Y Chest (Map)',
            '! Compass Chest': 'Mid Left Y Chest (Compass)',
            'Barinade':        'Barinade',
            'GS Jabu Jabu Water Switch Room':    'Water Switch Room',
            'GS Jabu Jabu Lobby Basement Lower': 'Lobby Basement Lower',
            'GS Jabu Jabu Lobby Basement Upper': 'Lobby Basement Upper',
            'GS Jabu Jabu Near Boss':            'Near Boss',
        },
    },
    {
        name: "Ice Cavern",
        regions: ['Ice Cavern'],
        x: "90.5%",
        y: "16.0%",
        chestlist: {
            '! Map Chest':         '',
            '! Compass Chest':     '',
            '! Freestanding PoH':  'Heart Piece',
            '! Iron Boots Chest':  'Iron Boots Chest',
            'Sheik in Ice Cavern': 'Sheik in Ice Cavern',
            '!G Spinning Scythe Room': '',
            '!G Heart Piece Room':     '',
            '!G Push Block Room':      '',
        },
    },
    {
        name: "Forest Temple",
        regions: ['Forest Temple Lobby', 'Forest Temple NW Outdoors', 'Forest Temple NE Outdoors', 'Forest Temple Falling Room', 'Forest Temple Block Push Room', 'Forest Temple Straightened Hall', 'Forest Temple Outside Upper Ledge', 'Forest Temple Bow Region', 'Forest Temple Boss Region'],
        x: "78.5%",
        y: "39.0%",
        chestlist: {
            '! First Chest':            'Entrance Tree Chest',
            '! Chest Behind Lobby':     'Lower Stalfos Chest',
            '! Well Chest':             '',
            '! Map Chest':              'Between Outsides Chest (Map)',
            '! Outside Hookshot Chest': '',
            '! Falling Room Chest':     '',
            '! Block Push Chest':       '',
            '! Boss Key Chest':         '',
            '! Floormaster Chest':      '',
            '! Bow Chest':              'Upper Stalfos Chest (Bow)',
            '! Red Poe Chest':          '',
            '! Blue Poe Chest':         'Blue Poe Chest (Compass)',
            '! Near Boss Chest':        '',
            'Phantom Ganon':            'Phantom Ganon',
            '!G First Room':            '',
            '!G Lobby':                 '',
            '!G Outdoor West':          '',
            '!G Outdoor East':          '',
            '!G Basement':              '',
        },
    },
    {
        name: "Ganon's Castle",
        regions: ['Ganons Castle Lobby', 'Ganons Castle Deku Scrubs', 'Ganons Castle Forest Trial', 'Ganons Castle Fire Trial', 'Ganons Castle Water Trial', 'Ganons Castle Shadow Trial', 'Ganons Castle Spirit Trial', 'Ganons Castle Light Trial'],
        x: "52.0%",
        y: "10.0%",
        chestlist: {
            '! Forest Trial Chest':                  '',
            '! Water Trial Left Chest':              '',
            '! Water Trial Right Chest':             '',
            '! Shadow Trial First Chest':            '',
            '! Shadow Trial Second Chest':           '',
            '! Spirit Trial First Chest':            '',
            '! Spirit Trial Second Chest':           '',
            '! Light Trial First Left Chest':        '',
            '! Light Trial Second Left Chest':       '',
            '! Light Trial Third Left Chest':        '',
            '! Light Trial First Right Chest':       '',
            '! Light Trial Second Right Chest':      '',
            '! Light Trial Third Right Chest':       '',
            '! Light Trial Invisible Enemies Chest': '',
            '! Light Trial Lullaby Chest':           '',
            'Ganons Castle Light Trial Clear':       'Boss Key Chest',
        },
        trials: {
            'Forest Trial Clear': '',
            'Fire Trial Clear':   '',
            'Water Trial Clear':  '',
            'Shadow Trial Clear': '',
            'Spirit Trial Clear': '',
            'Light Trial Clear':  '',
        },
    },
    {
        name: "Castle Town",
        regions: ['Castle Town'],
        x: "52.0%",
        y: "20.0%",
        chestlist: {
            'Malon Egg':                      'Malon at Castle (Weird Egg)',
            'Impa at Castle':                 'Zelda\'s Lullaby',
            'Child Shooting Gallery':         '',
            'Bombchu Bowling Bomb Bag':       'Bombchu Bowling 1',
            'Bombchu Bowling Piece of Heart': 'Bombchu Bowling 2',
            'Treasure Chest Game':            '',
            'Dog Lady':                       '',
            '10 Big Poes':                    '',
            'Hyrule Castle Fairy Reward':     'Hyrule Castle Fairy',
            'Ganons Castle Fairy Reward':     'Ganon\'s Castle Fairy',
            'Master Sword Pedestal':          'Master Sword',
            'Sheik at Temple':                'Prelude of Light',
            'Zelda':                          'Light Arrows',
            'GS Castle Market Guard House':   '(GS) Guard House',
            'GS Hyrule Castle Tree':          '(GS) Castle Tree',
            'GS Hyrule Castle Grotto':        '(GS) Castle Grotto',
            'GS Outside Ganon\'s Castle':     {allowquote:true, name: '(GS) Outside Ganon\'s Castle'},
        },
    },
    {
        name: "Kakariko Village",
        regions: ['Kakariko Village'],
        x: "65.0%",
        y: "24.0%",
        chestlist: {
            'Anju as Adult':                '',
            'Anju\'s Chickens':             '',
            'Kakariko Back Grotto Chest':   '',
            'Redead Grotto Chest':          '',
            'Impa House Freestanding PoH':  'Cow Heart Piece',
            'Man on Roof':                  '',
            'Adult Shooting Gallery':       '',
            'Song at Windmill':             'Song of Storms',
            'Windmill Freestanding PoH':    'Windmill Heart Piece',
            'Hookshot Chest':               'Dampe Race 1',
            'Dampe Race Freestanding PoH':  'Dampe Race 2',
            'Gravedigging Tour':            '',
            'Shield Grave Chest':           '',
            'Heart Piece Grave Chest':      'Redead Grave Chest',
            'Song from Composer Grave':     'Sun\'s Song',
            'Composer Grave Chest':         'Sun\'s Song Chest',
            'Graveyard Freestanding PoH':   'Magic Bean Heart Piece',
            'Sheik in Kakariko':            'Nocturne of Shadow',
            '10 Gold Skulltula Reward':     '',
            '20 Gold Skulltula Reward':     '',
            '30 Gold Skulltula Reward':     '',
            '40 Gold Skulltula Reward':     '',
            '50 Gold Skulltula Reward':     '',
            'GS Kakariko House Under Construction': '(GS) House Under Construction',
            'GS Kakariko Skulltula House':          '(GS) Skulltula House',
            'GS Kakariko Guard\'s House':           {allowquote:true, name: '(GS) Guard\'s House'},
            'GS Kakariko Tree':                     '(GS) Tree',
            'GS Kakariko Watchtower':               '(GS) Watchtower',
            'GS Kakariko Above Impa\'s House':      {allowquote:true, name: '(GS) Above Impa\'s House'},
            'GS Graveyard Wall':                    '(GS) Graveyard Wall',
            'GS Graveyard Bean Patch':              '(GS) Graveyard Bean Patch',
        },
    },
    {
        name: "Goron City",
        regions: ['Goron City'],
        x: "60.0%",
        y: "06.5%",
        chestlist: {
            'Goron City Leftmost Maze Chest':  'Left Boulder Maze Chest',
            'Goron City Left Maze Chest':      'Center Boulder Maze Chest',
            'Goron City Right Maze Chest':     'Right Boulder Maze Chest',
            'Rolling Goron as Child':          'Hot Rodder Goron',
            'Link the Goron':                  '',
            'Goron City Pot Freestanding PoH': 'Spinning Pot Heart Piece',
            'Darunias Joy':                    'Darunia\'s Joy',
            '!G Boulder Maze':                 '',
            '!G Center Platform':              '',
        },
    },
    {
        name: "Lost Woods",
        regions: ['Lost Woods'],
        x: "78.0%",
        y: "48.0%",
        chestlist: {
            'Skull Kid': '',
            'LW Deku Scrub Deku Stick Upgrade': 'Deku Salesman',
            'Ocarina Memory Game': '',
            'Target in Woods': '',
            'Lost Woods Generic Grotto Chest': 'Bomb Grotto Chest',
            'LW Grotto Deku Scrub Arrows': 'Deku Salesman Grotto',
            'Wolfos Grotto Chest': '',
            'Song from Saria': 'Saria\'s Song',
            'Sheik Forest Song': 'Minuet of Forest',
            'Deku Theater Skull Mask': '',
            'Deku Theater Mask of Truth': '',
            '!G Bean Patch Near Bridge': '',
            '!G Bean Patch Near Stage': '',
            '!G Above Stage': '',
        },
    },
    {
        name: "Zora\'s Domain",
        regions: ['Zoras Domain'],
        x: "93.5%",
        y: "29.0%",
        chestlist: {
            'Diving Minigame':                         '',
            'Zoras Domain Torch Run':                  '',
            'Zoras Fountain Fairy Reward':             'Fairy Fountain',
            'Zoras Fountain Iceberg Freestanding PoH': 'Iceberg Heart Piece',
            'Zoras Fountain Bottom Freestanding PoH':  'Underwater Heart Piece',
            'King Zora Thawed':                        '',
            '!G Frozen Waterfall':                     {allowquote:true},
        },
    },
    {
        name: "Zora\'s Fountain",
        regions: ['Zoras Fountain', 'Outside Ice Cavern'],
        x: "94.5%",
        y: "17.0%",
        chestlist: {
            '!G Tree':          {allowquote:true},
            '!G Above the Log': {allowquote:true},
            '!G Hidden Cave':   {allowquote:true},
        },
    },
    {
        name: "Death Mountain",
        regions: ['Death Mountain'],
        x: "64.0%",
        y: "09.0%",
        chestlist: {
            'DM Trail Freestanding PoH':          'Heart Piece Above Dodongo Cavern',
            'Death Mountain Bombable Chest':      'Outside Goron City Chest',
            'Mountain Storms Grotto Chest':       'Outside Goron City Grotto',
            'Sheik in Crater':                    'Bolero of Fire',
            'DM Crater Wall Freestanding PoH':    'Crater Wall Heart Piece',
            'DM Crater Volcano Freestanding PoH': 'Crater Magic Bean Heart Piece',
            'Top of Crater Grotto Chest':         'Crater Grotto',
            'Crater Fairy Reward':                'Crater Fairy Fountain',
            'Mountain Summit Fairy Reward':       'Summit Fairy Fountain',
            'Biggoron':                           'Biggoron Sword',
            'GS Mountain Trail Bean Patch':              '(GS) Trail Bean Patch',
            'GS Mountain Trail Bomb Alcove':             '(GS) Trail Bomb Alcove',
            'GS Mountain Trail Path to Crater':          '(GS) Trail Path to Crater',
            'GS Mountain Trail Above Dodongo\'s Cavern': {allowquote:true, name:'(GS) Above Dodongo\'s Cavern'},
            'GS Death Mountain Crater Crate':            '(GS) Crater Crate',
            'GS Mountain Crater Bean Patch':             '(GS) Crater Bean Patch',
        },
    },
];

//define overworld chests
var chests = [
    {
        target: 'Kokiri Sword Chest',
        name: '',
        x: "76.0%",
        y: "63.5%",
    },
    {
        target: "Mido Chest Top Left",
        name: "Mido's House (4)",
        x: "78.5%",
        y: "58.0%",
    },
    {
        target: "Kokiri Forest Storms Grotto Chest",
        name: "Kokiri Song of Storms Grotto",
        x: "77.5%",
        y: "54.5%",
    },
    {
        target: "Song from Ocarina of Time",
        name: "Song of Time",
        x: "52.3%",
        y: "30.5%",
    },
    {
        target: "Field West Castle Town Grotto Chest",
        name: "Hyrule Field North Grotto",
        x: "50.0%",
        y: "28.0%",
    },
    {
        target: "Remote Southern Grotto Chest",
        name: "Hyrule Field Forest Grotto",
        x: "60.0%",
        y: "59.0%",
    },
    {
        target: "Field Near Lake Outside Fence Grotto Chest",
        name: "Hyrule Field South Grotto",
        x: "44.5%",
        y: "64.0%",
    },
    {
        target: "HF Grotto Deku Scrub Piece of Heart",
        name: "Hyrule Field Deku Salesman Grotto",
        x: "42.0%",
        y: "64.0%",
    },
    {
        target: "Tektite Grotto Freestanding PoH",
        name: "Diving Heart Piece Grotto",
        x: "44.0%",
        y: "32.0%",
    },
    {
        target: "Talons Chickens",
        name: "Talon's Chickens Minigame",
        x: "49.0%",
        y: "38.0%",
    },
    {
        target: "Song from Malon",
        name: "Epona's Song",
        x: "47.0%",
        y: "41.5%",
    },
    {
        target: "Lon Lon Tower Freestanding PoH",
        name: "Lon Lon Heart Piece",
        x: "44.0%",
        y: "43.5%",
    },
    {
        target: "Underwater Bottle",
        name: '',
        x: "38.6%",
        y: "80.0%",
    },
    {
        target: "Lake Hylia Sun",
        name: '',
        x: "41.5%",
        y: "91.0%",
    },
    {
        target: 'Diving in the Lab',
        name: '',
        x: "35.2%",
        y: "77.4%",
    },
    {
        target: "Lake Hylia Freestanding PoH",
        name: "Lab Roof Heart Piece",
        x: "35.2%",
        y: "74.0%",
    },
    {
        target: "Child Fishing",
        name: '',
        x: "45.0%",
        y: "78.0%",
    },
    {
        target: 'Adult Fishing',
        name: '',
        x: "46.9%",
        y: "78.0%",
    },
    {
        target: "Gerudo Valley Hammer Rocks Chest",
        name: "Gerudo Valley Hammer Rocks Chest",
        x: "22.0%",
        y: "38.0%",
    },
    {
        target: "Gerudo Valley Crate Freestanding PoH",
        name: "Gerudo Valley Crate Heart Piece",
        x: "24.0%",
        y: "41.5%",
    },
    {
        target: "Gerudo Valley Waterfall Freestanding PoH",
        name: "Gerudo Valley Waterfall Heart Piece",
        x: "25.5%",
        y: "32.0%",
    },
    {
        target: "Gerudo Fortress Rooftop Chest",
        name: "Gerudo Fortress Rooftop Chest",
        x: "18.8%",
        y: "23.0%",
    },
    {
        target: "Horseback Archery 1000 Points",
        name: "Horseback Archery Game 1000pts",
        x: "21.7%",
        y: "28.0%",
    },
    {
        target: "Horseback Archery 1500 Points",
        name: "Horseback Archery Game 1500pts",
        x: "23.5%",
        y: "28.0%",
    },
    {
        target: "Haunted Wasteland Structure Chest",
        name: "Haunted Wasteland Chest",
        x: "14.0%",
        y: "25.0%",
    },
    {
        target: "Sheik at Colossus",
        name: "Requiem of Spirit",
        x: "04.5%",
        y: "21.5%",
    },
    {
        target: "Desert Colossus Fairy Reward",
        name: "Desert Colossus Fairy",
        x: "08.0%",
        y: "19.0%",
    },
    {
        target: "Colossus Freestanding PoH",
        name: "Desert Colossus Heart Piece",
        x: "06.4%",
        y: "23.5%",
    },
    {
        target: "Frog Ocarina Game",
        name: '',
        x: "79.8%",
        y: "32.0%",
    },
    {
        target: "Frogs in the Rain",
        name: '',
        x: "78.0%",
        y: "32.0%",
    },
    {
        target: "Zora River Lower Freestanding PoH",
        name: "Zora River Heart Piece 1",
        x: "75.0%",
        y: "30.0%",
    },
    {
        target: "Zora River Upper Freestanding PoH",
        name: "Zora River Heart Piece 2",
        x: "86.0%",
        y: "29.2%",
    },
    {
        target: "Zora River Plateau Open Grotto Chest",
        name: "Zora River Grotto",
        x: "75.5%",
        y: "34.5%",
    },
    {
        target: "Gift from Saria",
        name: "Saria on the Bridge",
        x: "74.5%",
        y: "57.5%",
    },
	
	/* Gold Skulltulas */
	
    {
        target: "GS Kokiri Know It All House",
        name: "(GS) Know It All House",
        x: "74.0%",
        y: "61.0%",
    },
    {
        target: "GS Kokiri Bean Patch",
        name: "(GS) Bean Patch",
        x: "82.0%",
        y: "58.5%",
    },
    {
        target: "GS Kokiri House of Twins",
        name: "(GS) House of Twins",
        x: "81.5%",
        y: "64.0%",
    },
    {
        target: "GS Lake Hylia Bean Patch",
        name: '(GS) Bean Patch',
        x: "37.0%",
        y: "74.0%",
    },
	{
        target: "GS Lake Hylia Lab Wall",
        name: '(GS) Lab Wall',
        x: "35.0%",
        y: "80.5%",
    },
	{
        target: "GS Lake Hylia Small Island",
        name: '(GS) Small Island',
        x: "42.0%",
        y: "94.0%",
    },
	{
        target: "GS Lake Hylia Giant Tree",
        name: '(GS) Giant Tree',
        x: "36.5%",
        y: "95.5%",
    },
	{
        target: "GS Lab Underwater Crate",
        name: '(GS) Lab Underwater Crate',
        x: "37.0%",
        y: "77.4%",
    },
	
	{
        target: "GS Gerudo Valley Small Bridge",
        name: '(GS) Gerudo Valley Small Bridge',
        x: "29.5%",
        y: "36.4%",
    },
	{
        target: "GS Gerudo Valley Bean Patch",
        name: '(GS) Gerudo Valley Bean Patch',
        x: "25.0%",
        y: "29.4%",
    },
	{
        target: "GS Gerudo Valley Behind Tent",
        name: '(GS) Gerudo Valley Behind Tent',
        x: "22.5%",
        y: "34.4%",
    },
	{
        target: "GS Gerudo Valley Pillar",
        name: '(GS) Gerudo Valley Pillar',
        x: "20.0%",
        y: "39.4%",
    },
	{
        target: "GS Gerudo Fortress Archery Range",
        name: '(GS) Gerudo Fortress Archery Range',
        x: "22.5%",
        y: "25.0%",
    },
	{
        target: "GS Gerudo Fortress Top Floor",
        name: '(GS) Gerudo Fortress Top Floor',
        x: "20.5%",
        y: "22.4%",
    },
	{
        target: "GS Wasteland Ruins",
        name: '(GS) Wasteland Ruins',
        x: "14.5%",
        y: "22.4%",
    },
	{
        target: "GS Desert Colossus Bean Patch",
        name: '(GS) Desert Colossus Bean Patch',
        x: "2.5%",
        y: "21.4%",
    },
	{
        target: "GS Desert Colossus Tree",
        name: '(GS) Desert Colossus Tree',
        x: "6.5%",
        y: "27.4%",
    },
	{
        target: "GS Desert Colossus Hill",
        name: '(GS) Desert Colossus Hill',
        x: "10.5%",
        y: "20.4%",
    },
    {
        target: "GS Zora River Tree",
        name: "(GS) Zora River Tree",
        x: "70.5%",
        y: "34.5%",
    },
    {
        target: "GS Zora River Ladder",
        name: "(GS) Zora River Ladder",
        x: "86.0%",
        y: "26.5%",
    },
    {
        target: "GS Zora River Near Raised Grottos",
        name: "(GS) Zora River Near Raised Grottos",
        x: "77.5%",
        y: "34.6%",
    },
    {
        target: "GS Zora River Above Bridge",
        name: "(GS) Zora River Above Bridge",
        x: "83.5%",
        y: "29.5%",
    },
	
	{
        target: "GS Lon Lon Ranch Tree",
        name: '(GS) Lon Lon Ranch Tree',
        x: "50.0%",
        y: "40.4%",
    },
	{
        target: "GS Lon Lon Ranch Rain Shed",
        name: '(GS) Lon Lon Ranch Rain Shed',
        x: "48.5%",
        y: "44.0%",
    },
	{
        target: "GS Lon Lon Ranch House Window",
        name: '(GS) Lon Lon Ranch House Window',
        x: "50.8%",
        y: "37.6%",
    },
	{
        target: "GS Lon Lon Ranch Back Wall",
        name: '(GS) Lon Lon Ranch Back Wall',
        x: "44.5%",
        y: "39.5%",
    },
	{
        target: "GS Sacred Forest Meadow",
        name: '(GS) Sacred Forest Meadow',
        x: "80.5%",
        y: "43.4%",
    },
	{
        target: "GS Hyrule Field Near Gerudo Valley",
        name: '(GS) Hyrule Field Near Gerudo Valley',
        x: "35.5%",
        y: "42.4%",
    },
	{
        target: "GS Hyrule Field near Kakariko",
        name: '(GS) Hyrule Field near Kakariko',
        x: "56.5%",
        y: "25.4%",
    },
];

dungeons.forEach(d => {
	var newCL = {};
	for (var target in d.chestlist) {
		var chest = d.chestlist[target];
		chest = chestResolveData(d.name, target, chest);
		chest.id = chestMakeID(chest);
		newCL[chest.id] = chest;
	}
	d.chestlist = newCL;
});
chests.forEach(c => {
	var target = c.target;
	c.target = chestResolveTarget("Overworld", target, c);
	if (!c.name) //'' is falsey
		c.name = chestResolveName("Overworld", target, c);
	
	if (!c.hasOwnProperty('type') && (target.match(/^GS /g) || target.match(/!G /g)))
		c.type = 'skulltula';
	
	c.id = chestMakeID(c);
});


