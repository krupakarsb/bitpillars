import json
gen=json.load(open('tools/generated-levels.json'))
names=["First Fall","Out the Bottom","Two Lights","Undertow","Hallway Echo","Small Infinity","Mirror Rain","Fold","The Stone Sleeps","Heavy Thought","Counterweight","Anchor","Thornfield","Glass Garden","Needle Rain","Briar Loop","Tint","Two Skies","Amber Hour","Sideways Blue","Confluence","Orrery","Paradox Room","Recursion","Event Horizon","Ouroboros","Mobius Hymn","The Last Loop"]
hints={0:"Swipe to shift gravity. Everything falls until something stops it.",
1:"The world repeats forever. Fall out one side, fall in the other.",
2:"Gather every shard to wake the gate.",
8:"Stones fall too. Stack them. Stand on them.",
12:"Thorns shatter you. Mind the whole path of your fall.",
16:"Blue blocks hold only under up/down gravity. Amber only sideways.",
20:"Everything, everywhere, all at once.",
24:"No more hints. Fall well."}
camp=[{"rows":["#####","#P..#","#...#","#*..#","#..E#","#####"],"par":2,"stage":"hand","sol":"DR"},
      {"rows":["#.###","#.*E#","###.#","#.#.#","#P#.#","#.###"],"par":2,"stage":"hand","sol":"DR"}]
camp+= [{"rows":l["rows"],"par":l["par"],"stage":l["stage"],"sol":l["sol"]} for l in gen]
for i,c in enumerate(camp):
    c["name"]=names[i]
    if i in hints: c["hint"]=hints[i]
s=open('src/game.template.html').read()
s=s.replace('/*__ENGINE__*/',open('src/engine.js').read())
s=s.replace('/*__LEVELS__*/','const CAMPAIGN = '+json.dumps(camp,separators=(',',':'))+';')
open('index.html','w').write(s)
print(len(camp),'levels', len(s),'bytes')
