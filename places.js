/* Map places and facts, adapted from the approved prototype (page numbers are PDF pages). */
(function(){
const MW = 895, MH = 740;
const P = (lon, lat) => [(lon - 7.6) * 0.5592 * 200, (58.0 - lat) * 200];
const CITIES = [
  {n:'København',lon:12.568,lat:55.676,r:14,k:'1. største by',d:'Hovedstaden og landets største by, på Sjælland. Cirka <b>2 millioner</b> mennesker (en tredjedel af befolkningen) bor i hovedstadsområdet.',pg:106,dx:14,dy:-8},
  {n:'Aarhus',lon:10.211,lat:56.157,r:11,k:'2. største by',d:'<b>Næststørste</b> by, i Østjylland, med ca. <b>300.000</b> indbyggere.',pg:106,dx:14,dy:5},
  {n:'Odense',lon:10.39,lat:55.40,r:9,k:'3. største by',d:'<b>Tredjestørste</b> by, på Fyn, med ca. <b>200.000</b> indbyggere.',pg:106,dx:14,dy:6},
  {n:'Aalborg',lon:9.919,lat:57.048,r:8,k:'4. største by',d:'<b>Fjerdestørste</b> by, i Nordjylland, med ca. <b>125.000</b> indbyggere.',pg:106,dx:13,dy:5},
  {n:'Esbjerg',lon:8.459,lat:55.476,r:7,k:'5. største by',d:'<b>Femtestørste</b> by, i Vestjylland, med ca. <b>75.000</b> indbyggere.',pg:106,dx:-12,dy:5,anchor:'end'}
];
const WATERS = [
  {n:'Nordsøen (Vesterhavet)',lon:7.62,lat:56.3,d:'Det <b>største farvand</b> omkring Danmark. Kaldes også <b>Vesterhavet</b>, fordi det ligger vest for Danmark.',pg:105,dx:0,dy:0,anchor:'start',lines:['Nordsøen','(Vesterhavet)']},
  {n:'Skagerrak',lon:9.0,lat:57.88,d:'Ligger <b>nord for Danmark</b>. Ved Grenen mødes Skagerrak og Kattegat.',pg:105,dx:0,dy:0},
  {n:'Kattegat',lon:11.55,lat:56.75,d:'Ligger sydøst for Skagerrak og <b>nord for Sjælland og Fyn</b>.',pg:105,dx:0,dy:0},
  {n:'Lillebælt',lon:9.8,lat:55.45,d:'Farvandet <b>mellem Jylland og Fyn</b>. Lillebæltsbroerne forbinder dem.',pg:105,leader:[-92,-40],dx:0,dy:0},
  {n:'Storebælt',lon:10.95,lat:55.36,d:'Farvandet <b>mellem Fyn og Sjælland</b>. Storebæltsforbindelsen forbinder dem.',pg:105,leader:[-10,62],dx:0,dy:0},
  {n:'Øresund',lon:12.68,lat:56.0,d:'Farvandet <b>mellem Sjælland og Sverige</b>. Øresundsforbindelsen forbinder Danmark og Sverige.',pg:105,leader:[-70,-36],dx:0,dy:0},
  {n:'Østersøen',lon:14.1,lat:54.75,d:'Farvandet mod øst. <b>Gedser Odde</b> og <b>Ertholmene</b> ligger ud til Østersøen.',pg:105,dx:0,dy:0}
];
const POINTS = [
  {n:'Grenen',k:'Nordligste punkt',lon:10.631,lat:57.745,d:'Danmarks <b>nordligste punkt</b>, nordøst for Skagen i Nordjylland. Her mødes <b>Skagerrak</b> og <b>Kattegat</b>.',pg:105,dx:-12,dy:-6,anchor:'end'},
  {n:'Gedser Odde',k:'Sydligste punkt',lon:11.97,lat:54.57,d:'Danmarks <b>sydligste punkt</b>, på øen <b>Falster</b>, ud til Østersøen.',pg:105,dx:-12,dy:18,anchor:'end'},
  {n:'Blåvands Huk',k:'Vestligste punkt',lon:8.082,lat:55.557,d:'Danmarks <b>vestligste punkt</b>, i Vestjylland, ud til Nordsøen (Vesterhavet).',pg:106,dx:-20,dy:-20},
  {n:'Ertholmene',k:'Østligste punkt',lon:15.19,lat:55.32,d:'Danmarks <b>østligste punkt</b>: øgruppen øst for Bornholm i Østersøen.',pg:106,dx:-12,dy:-8,anchor:'end'},
  {n:'Møllehøj',k:'Højeste punkt',lon:9.79,lat:55.98,d:'Det <b>højeste naturlige punkt</b>, i Østjylland, ca. <b>170 meter</b> over havet. Danmark er et fladt land uden bjerge.',pg:106,dx:-12,dy:-6,anchor:'end'},
  {n:'Bornholm',k:'Klipper',lon:14.9,lat:55.12,d:'Et af de få steder i Danmark med <b>klipper</b>.',pg:106,dx:-14,dy:20,anchor:'end'}
];
const BRIDGES = [
  {n:'Lillebæltsbroerne',a:[9.70,55.54],b:[9.80,55.51],d:'Forbinder <b>Jylland og Fyn</b> over Lillebælt.',pg:105,dx:16,dy:-10},
  {n:'Storebæltsforbindelsen',a:[10.79,55.31],b:[11.12,55.34],d:'Forbinder <b>Fyn og Sjælland</b> over Storebælt.',pg:105,dx:0,dy:24,anchor:'middle'},
  {n:'Øresundsforbindelsen',a:[12.66,55.60],b:[12.93,55.58],d:'Forbinder <b>Danmark og Sverige</b> over Øresund.',pg:105,dx:6,dy:24}
];
const HIST = [
  {n:'Ribe',era:'old',lon:8.762,lat:55.328,d:'Ca. 700: en af de første <b>rigtige byer</b> i Danmark.',pg:108,dx:-12,dy:5,anchor:'end'},
  {n:'Jelling',era:'vik',lon:9.419,lat:55.756,d:'<b>987</b>: Jellingestenen, <b>Danmarks dåbsattest</b>. Harald Blåtand samlede Danmark og gjorde danskerne kristne.',pg:108,dx:-12,dy:-6,anchor:'end'},
  {n:'Trelleborg',era:'vik',lon:11.265,lat:55.396,d:'Vikingeborg fra <b>vikingetiden</b> (ca. 750–1050).',pg:109,dx:-4,dy:-14,anchor:'middle'},
  {n:'Fyrkat',era:'vik',lon:9.809,lat:56.636,d:'Vikingeborg fra <b>vikingetiden</b> (ca. 750–1050).',pg:109,dx:-12,dy:-6,anchor:'end'},
  {n:'Skåne, Halland og Blekinge',era:'ene',lon:13.4,lat:55.95,d:'Tabt til Sverige i <b>1658</b> efter mange nederlag.',pg:111,dx:0,dy:-14,anchor:'middle'},
  {n:'Slesvig og Holsten',era:'mod',lon:9.6,lat:54.5,d:'Tabt i <b>1864</b> efter krigen mod Det Tyske Forbund. Danmark blev meget mindre.',pg:113,dx:0,dy:-14,anchor:'middle'}
];
const MAPHINT = `<div class="p-meta">Danmarks geografi</div><h2>Tryk på kortet</h2><p>Tryk på en by, et farvand eller et punkt for at læse om det.</p>`;
const MAPFACTS = `<h2>Danmark i tal</h2><ul>
  <li>Areal: godt <b>43.000 km²</b> (uden Grønland og Færøerne)</li>
  <li><b>Jylland</b> og over <b>400 øer</b>. Største ø: <b>Sjælland</b></li>
  <li>Kystlinje: ca. <b>7.300 km</b> &middot; ca. <b>6 millioner</b> indbyggere</li>
  <li><b>Færøerne og Grønland</b> er med i rigsfællesskabet og vælger hver to medlemmer til Folketinget (de ligger uden for kortet)</li></ul>
  <p class="p-src">Kilde: s. 105–106</p>`;

window.PLACES={MW,MH,P,CITIES,WATERS,POINTS,BRIDGES,HIST,MAPHINT,MAPFACTS};
})();
