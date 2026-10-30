import json,re,sys
d=json.load(open(sys.argv[1]))
POS=r'\b(noun|verb|adjective|adverb|conjunction|preposition|pronoun|measure word|numeral|number|idiom|particle|auxiliary word|auxiliary|interjection|onomatopoeia|suffix|prefix|colloquial|literary|dialect|formal|informal|MET|LIT|classifier|abbreviation|phrase|often|pejorative|derogatory|dated|figurative|humorous|commendatory|euphemism)\b'
def short(en):
  s=re.sub(r'\([^)]*//[^)]*\)','',en)
  s=re.sub(POS,' ',s)
  s=re.sub(r'\(opp\.[^)]*\)','',s)
  s=re.sub(r'\[[^\]]*(\]|$)','',s)
  s=re.sub(r'\(\s*\)|（\s*）','',s)
  parts=re.split(r'\s+\d+\s+|;|\s{2,}',s)
  out=[]
  for p in parts:
    p=re.sub(r'^\d+\s*','',p.strip(' ,.;—-')).strip()
    if not p or p in out: continue
    if len(', '.join(out+[p]))>46 and out: break
    out.append(p)
  return ', '.join(out)[:60]
LV={'HSK1':1,'HSK2':2,'HSK3':3,'HSK4':4,'HSK5':5,'HSK6':6,'HSK7-9':7,'duplicate':0,'reading':0}
T={'solid':'s','fading':'f','shaky':'k','leech':'l','unseen':'u'}
seen=set(); out=[]
for o in d:
  if o['lv'] not in LV or o['w'] in seen: continue
  seen.add(o['w'])
  py=o['py'].replace('//','').replace('-',' ')
  t=T[o['tier']]
  if t=='u' and LV[o['lv']]<=4 and LV[o['lv']]>0: t='s'
  out.append([o['w'],py,short(o['en']),LV[o['lv']],t,o['lapses']])
OV={'了':'(particle: completed action / change of state)','的':'(particle: possessive, modifier)','得':'(particle linking a verb to its complement)','着':'(particle: ongoing action or state)','地':'(particle: adverbial, -ly)','过':'(particle: past experience); pass, cross','吗':'(question particle)','吧':'(particle: suggestion, assumption)','呢':'(particle: and what about…?, ongoing)','啊':'(particle: softening, exclamation)','行':'OK, capable; to walk, go','把':'(object marker); handle; classifier for things with handles'}
out=[[r[0],r[1],OV.get(r[0],r[2]) or r[2],r[3],r[4],r[5]] for r in out]
for r in out:
  if not r[2].strip(' ,.'): r[2]='—'
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,separators=(',',':'))
print(len(out))
for r in out[::900]: print(r)
