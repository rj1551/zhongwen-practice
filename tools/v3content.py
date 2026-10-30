# v3 content patch: harder (plausible) distractors + 10 more passages.
# Applied after content.py builds its lists: exec'd with L, S, C, P, PL in scope.

# --- words-in-context (sessions): every option fits the sentence; only knowing the word decides ---
CTX_OPTS = {
 "经费": ["funding", "staff", "projects", "expenses (spending)"],
 "那会儿": ["back then", "these days", "for a while", "just now"],
 "场所": ["place, venue", "atmosphere", "occasion", "resource"],
 "发动": ["mobilized", "paid", "ordered", "persuaded"],
 "前往": ["head to", "depart from", "arrive in", "pass through"],
 "特征": ["distinguishing feature", "attraction", "advantage", "weakness"],
 "当前": ["at present", "from the start", "in the long run", "above all else"],
 "泼": ["threw (a liquid)", "spilled (by accident)", "poured (slowly)", "sprayed"],
 "为期": ["lasts", "starts in", "is postponed by", "is held every"],
 "先后": ["one after another", "at the same time", "briefly", "for a long time"],
 "先前": ["before", "I expected", "other places", "on weekdays"],
 "创办": ["founded", "ran", "attended", "designed"],
 "来往": ["contact", "conflict", "common ground", "news of each other"],
 "踏实": ["at ease, settled", "satisfied", "excited", "proud"],
 "带动": ["energize", "exhaust", "annoy", "replace"],
 "反而": ["instead", "and then", "still", "eventually"],
 "格外": ["especially", "always", "a bit", "suddenly"],
 "便利": ["convenience", "savings", "pressure", "choice"],
 "化解": ["defused", "caused", "noticed", "made worse"],
 "从事": ["worked in", "studied", "researched", "supported"],
 "公布": ["will be announced", "will be graded", "will be mailed out", "will be reviewed"],
 "承办": ["hosted (organized)", "sponsored", "won", "judged"],
 "大致": ["roughly", "finally", "completely", "suddenly"],
 "幅度": ["extent (size of the change)", "speed", "chance", "trend"],
 "齐全": ["well-stocked (has everything)", "cheap", "high-quality", "neatly arranged"],
 "启发": ["insight, inspiration", "comfort", "pressure", "entertainment"],
 "主导": ["led", "funded", "staffed", "designed"],
 "恰当": ["appropriate", "common", "polite", "clear"],
 "并非": ["is not", "is exactly", "is worse than", "is only"],
 "适用": ["applicable to", "available to", "known to", "affordable for"],
 "手续": ["procedures, paperwork", "fees", "waiting time", "interview"],
 "既然": ["since (given that)", "if", "although", "even if"],
 "困扰": ["troubling", "threatening", "following", "exhausting"],
 "以往": ["in the past", "forecast", "in other places", "last month"],
 "心态": ["mindset", "health", "habits", "relationships"],
 "巴不得": ["wish they could", "are allowed to", "are used to", "are afraid to"],
 "依次": ["in order, one by one", "quickly", "quietly", "together"],
 "透露": ["revealed", "denied", "explained", "confirmed"],
 "借鉴": ["draw on, learn from", "compare with", "avoid", "criticize"],
 "费用": ["cost", "budget", "income", "deposit"],
}
for x in C:
    if x["w"] in CTX_OPTS: x["opts"] = CTX_OPTS[x["w"]]

# --- placement: words in context ---
PCTX_OPTS = {
 "涉及": ["involves", "accuses", "protects", "investigates"],
 "被迫": ["had to be (was forced to be)", "was planned to be", "was expected to be", "was decided to be"],
 "开设": ["added (started offering)", "cancelled", "completed", "updated"],
 "显著": ["marked", "slight", "gradual", "temporary"],
 "截至": ["as of (up to)", "starting from", "with a deadline of", "since"],
 "意愿": ["willingness", "ability", "conditions", "plans"],
 "不慎": ["accidentally", "nearly", "suddenly", "once again"],
 "波及": ["spread to", "passed by", "originated in", "was forecast for"],
 "不惜": ["would pay (spared no)", "couldn't afford", "weren't willing to pay", "counted"],
 "趁着": ["taking advantage of", "despite", "because of", "right after"],
 "以免": ["to avoid (losing them)", "in case you've (lost them)", "so that you (lose them)", "because you might have (lost them)"],
 "有所": ["somewhat", "sharply", "barely", "steadily"],
 "一度": ["at one point", "every year", "always", "nearly"],
 "鉴于": ["in view of (because of)", "despite", "regardless of", "apart from"],
 "不禁": ["couldn't help but", "tried not to", "pretended to", "was about to"],
 "未免": ["is a bit too (rather)", "is truly, really", "is after all", "is obviously"],
 "无从": ["have no way to", "have no need to", "have no time to", "have no right to"],
 "势必": ["is bound to", "might", "is unlikely to", "is meant to"],
}
for lv in PL["ctx"]:
    for x in lv:
        if x["w"] in PCTX_OPTS: x["opts"] = PCTX_OPTS[x["w"]]

# --- placement: news (all options are plausible readings; details decide) ---
NEWS_OPTS = {
 "受强降雨": ["The highways reopen to traffic", "The heavy rain stops", "More highways will close", "Repairs on the highways begin"],
 "该市将对": ["Families earning under ¥50k a year", "Families earning over ¥50k a year", "Families with under ¥50k in savings", "Families who spent under ¥50k on housing"],
 "据统计，": ["As of the end of September, the city had over 400,000 new-energy vehicles in total", "In September the city added over 400,000 new-energy vehicles", "By the end of September the city had just under 400,000 new-energy vehicles", "Since September the number of new-energy vehicles rose by over 400,000"],
 "受访者中": ["Nearly 60% of respondents don't plan to travel abroad this year", "Nearly 60% of respondents plan to travel abroad this year", "Over 60% of respondents don't plan to travel abroad this year", "Nearly 60% of respondents have never travelled abroad"],
 "该政策实": ["New urban jobs are up somewhat on the same period last year", "New urban jobs are up sharply on last year", "Urban employment is roughly unchanged from last year", "New urban jobs are up somewhat on the previous quarter"],
 "专家提醒": ["Temperatures are swinging, so the elderly and children should keep warm to avoid colds", "A cold wave is coming, so the elderly and children should stay indoors", "Temperatures are dropping, so everyone should get a flu shot", "The elderly and children should avoid crowds to avoid catching colds"],
 "尽管出口": ["Export growth slowed somewhat, but the trade surplus still hit a record high", "Exports fell somewhat, but the trade surplus still hit a record high", "Export growth slowed, and the trade surplus fell from its record high", "Export growth picked up, and the trade surplus hit a record high"],
 "此次调整": ["It refines the current measures; the policy's direction hasn't changed", "It shifts the policy's direction instead of refining the measures", "It is temporary and will be reversed later", "It doesn't affect the current measures at all"],
 "鉴于部分": ["Because some areas still have safety hazards, reopening is postponed; the date will be announced later", "Some areas will reopen once hazards are cleared; the date has been set", "Areas with hazards stay closed while the others reopen now", "Reopening is postponed until a safety inspection scheduled for next week"],
 "业内普遍": ["Under weak demand and high costs, an industry shake-up is probably unavoidable", "Weak demand and high costs will probably be avoided through an industry shake-up", "Insiders are divided on whether a shake-up will happen", "Weak demand will push costs down, so a shake-up can be avoided"],
}
for lv in PL["news"]:
    for x in lv:
        k = x["s"][:4]
        if k in NEWS_OPTS: x["opts"] = NEWS_OPTS[k]

# --- 10 more passages ---
note = "\n\n(Practice text written for you — names, events and figures are illustrative.)"
psg("P7", "西安三日游｜不踩雷版", "xhs", [
 "第一天|直接|去|兵马俑|，|建议|请|个|讲解|，|不然|就|只是|在|看|一堆|泥人|。|门票|要|提前|在|官方|小程序|上|买|，|现场|基本|买不到|。",
 "晚上|去|大唐不夜城|，|人|多|到|挤不动|，|但是|灯光|真的|震撼|，|随手|一拍|都是|大片|。",
 "吃|的|方面|，|回民街|游客|太|多|，|味道|一般|，|本地人|更|推荐|洒金桥|。|肉夹馍|、|凉皮|、|羊肉泡馍|，|人均|三十|就能|吃饱|。"],
 {"兵马俑": ["Bīngmǎyǒng", "the Terracotta Warriors"], "讲解": ["jiǎngjiě", "guided commentary"], "一堆": ["yì duī", "a pile of"], "泥人": ["nírén", "clay figures"], "小程序": ["xiǎochéngxù", "mini-program (app inside WeChat/Alipay)"], "现场": ["xiànchǎng", "on site"], "买不到": ["mǎi bu dào", "can't get (tickets)"], "大唐不夜城": ["Dàtáng Bùyèchéng", "Great Tang All-Night City (night street)"], "挤不动": ["jǐ bu dòng", "too packed to move"], "震撼": ["zhènhàn", "stunning"], "一拍": ["yì pāi", "one snap"], "大片": ["dàpiàn", "blockbuster (shot)"], "回民街": ["Huímín Jiē", "the Muslim Quarter"], "洒金桥": ["Sǎjīnqiáo", "Sajinqiao (food street)"], "肉夹馍": ["ròujiāmó", "roujiamo (meat in flatbread)"], "凉皮": ["liángpí", "liangpi (cold noodles)"], "羊肉泡馍": ["yángròu pàomó", "mutton soup with bread"], "就能": ["jiù néng", "can (already)"]},
 "Xi'an in three days | The no-dud version\n\nDay one, go straight to the Terracotta Warriors. Get a guide, or you're just looking at a pile of clay figures. Buy tickets ahead on the official mini-program; you basically can't get them on site.\n\nIn the evening go to Great Tang All-Night City. It's so packed you can't move, but the lights are stunning and any casual snap looks like a movie still.\n\nFood: the Muslim Quarter has too many tourists and the taste is average; locals recommend Sajinqiao instead. Roujiamo, liangpi, mutton soup with bread: about ¥30 a head fills you up." + note,
 [{"q": "Why get a guide at the Terracotta Warriors?", "opts": ["Otherwise you're just looking at a pile of clay figures", "A guide gets you in without a ticket", "The site is too big to find your way alone", "Guides can take photos for you"]},
  {"q": "Where do locals recommend eating?", "opts": ["洒金桥", "回民街", "大唐不夜城", "Near the Terracotta Warriors"]},
  {"q": "How do you get Terracotta Warrior tickets?", "opts": ["Book ahead on the official mini-program", "Buy them at the gate early in the morning", "Through a guide", "They come with a hotel booking"]}])

psg("P8", "打车避坑指南｜第一次来中国必看", "xhs", [
 "在|国内|打车|基本|都|用|滴滴|，|外国|手机号|也|能|注册|，|绑定|支付宝|或者|微信|就|行|。",
 "上车|前|一定|要|核对|车牌号|，|别|上错|车|。|司机|一般|会|问|你|手机|尾号|，|这|是|正常|的|，|不是|诈骗|。",
 "机场|和|火车站|门口|经常|有人|拉客|，|问|“|打车|吗|？|”|，|千万|别|跟|他们|走|，|价格|可能|是|正常的|好几倍|。"],
 {"滴滴": ["Dīdī", "Didi (ride-hailing app)"], "手机号": ["shǒujī hào", "phone number"], "注册": ["zhùcè", "sign up"], "绑定": ["bǎngdìng", "link (an account)"], "支付宝": ["Zhīfùbǎo", "Alipay"], "核对": ["héduì", "check, verify"], "车牌号": ["chēpái hào", "licence plate number"], "上错": ["shàng cuò", "get into the wrong (car)"], "尾号": ["wěihào", "last digits"], "诈骗": ["zhàpiàn", "scam"], "拉客": ["lākè", "tout for customers"], "正常的": ["zhèngcháng de", "the normal (price)"], "好几倍": ["hǎo jǐ bèi", "several times"]},
 "Taxi survival guide | Must-read for your first time in China\n\nIn China almost everyone uses Didi to get a ride. Foreign phone numbers can sign up too; just link Alipay or WeChat.\n\nBefore you get in, always check the licence plate so you don't get into the wrong car. The driver will usually ask the last digits of your phone number. That's normal, not a scam.\n\nAt airports and train stations people often tout rides, asking 'Taxi?'. Don't go with them; the price can be several times the normal fare." + note,
 [{"q": "Why might the driver ask for your phone's last digits?", "opts": ["It's a normal check that you're the right passenger", "It's a common scam", "To add you on WeChat", "To charge your account"]},
  {"q": "What should you check before getting in?", "opts": ["The licence plate number", "The driver's ID", "The price on the meter", "That it's an official taxi"]},
  {"q": "What's the advice about people asking 'Taxi?' at stations?", "opts": ["Don't go with them; they may charge several times the normal fare", "Agree on a price before getting in", "They're official station staff", "Only use them late at night"]}])

psg("P9", "台风“海燕”预计明日登陆", "news", [
 "据|气象台|消息|，|今年|第18号|台风|“|海燕|”|预计|将于|明天|上午|在|广东|沿海|登陆|，|登陆|时|中心|附近|最大|风力|可达|14级|。",
 "受|其|影响|，|广州|、|深圳|等|地|部分|航班|和|高铁|已|停运|，|中小学|明天|停课|一天|。",
 "气象/部门|提醒|市民|尽量|减少|外出|，|远离|广告牌|和|大树|，|以免|发生|危险|。"],
 {"气象台": ["qìxiàngtái", "weather observatory"], "第18号": ["dì shíbā hào", "No. 18"], "台风": ["táifēng", "typhoon"], "海燕": ["Hǎiyàn", "'Petrel' (typhoon name)"], "将于": ["jiāng yú", "will (on/at)"], "沿海": ["yánhǎi", "coast"], "登陆": ["dēnglù", "make landfall"], "风力": ["fēnglì", "wind force"], "可达": ["kě dá", "may reach"], "14级": ["shísì jí", "force 14"], "受其影响": ["shòu qí yǐngxiǎng", "affected by it"], "停运": ["tíngyùn", "suspend service"], "中小学": ["zhōng-xiǎoxué", "primary and secondary schools"], "停课": ["tíngkè", "cancel classes"], "外出": ["wàichū", "go out"], "广告牌": ["guǎnggàopái", "billboard"], "以免": ["yǐmiǎn", "so as to avoid"]},
 "Typhoon 'Petrel' expected to make landfall tomorrow\n\nAccording to the weather observatory, this year's 18th typhoon, 'Petrel', is expected to make landfall on the Guangdong coast tomorrow morning, with maximum winds near the centre reaching force 14.\n\nBecause of it, some flights and high-speed trains in Guangzhou, Shenzhen and elsewhere have been suspended, and primary and secondary schools will close for one day tomorrow.\n\nThe weather service reminds residents to go out as little as possible and keep away from billboards and large trees to avoid danger." + note,
 [{"q": "When is the typhoon expected to make landfall?", "opts": ["Tomorrow morning", "Tonight", "In two days", "It already has"]},
  {"q": "What has already happened?", "opts": ["Some flights and high-speed trains have been suspended", "Schools have closed for the week", "All Guangdong airports have closed", "Coastal residents have been evacuated"]},
  {"q": "What are residents told to keep away from?", "opts": ["Billboards and big trees", "The coast and rivers", "Train stations", "Tall buildings"]}])

psg("P10", "新能源汽车销量再创新高", "news", [
 "中国/汽车/工业/协会|数据|显示|，|10月|新能源/汽车|销量|达到|150万辆|，|同比|增长|三成|，|占|新车|总|销量|的|一半|以上|。",
 "分析/人士|指出|，|价格|下降|和|充电/设施|的|完善|是|销量|增长|的|主要|原因|。",
 "不过|，|随着|市场|竞争|日益|激烈|，|部分|中小|品牌|已|出现|亏损|，|行业|整合|或|将|加速|。"],
 {"协会": ["xiéhuì", "association"], "新能源汽车": ["xīn néngyuán qìchē", "new-energy vehicles (EVs, hybrids)"], "150万辆": ["yìbǎi wǔshí wàn liàng", "1.5 million vehicles"], "同比": ["tóngbǐ", "year on year"], "三成": ["sān chéng", "30%"], "分析人士": ["fēnxī rénshì", "analysts"], "充电": ["chōngdiàn", "charging"], "设施": ["shèshī", "facilities"], "日益": ["rìyì", "increasingly"], "激烈": ["jīliè", "fierce"], "品牌": ["pǐnpái", "brand"], "亏损": ["kuīsǔn", "losses"], "整合": ["zhěnghé", "consolidation"], "或": ["huò", "may (formal)"], "加速": ["jiāsù", "speed up"]},
 "New-energy vehicle sales hit another record\n\nData from the China Association of Automobile Manufacturers show October new-energy vehicle sales reached 1.5 million, up 30% year on year, more than half of all new-car sales.\n\nAnalysts point out that falling prices and better charging facilities are the main reasons for the growth.\n\nHowever, as competition grows fiercer, some small and mid-sized brands are already losing money, and consolidation in the industry may accelerate." + note,
 [{"q": "What share of new-car sales were new-energy vehicles?", "opts": ["More than half", "About 30%", "About 15%", "Exactly half"]},
  {"q": "What are the main reasons for the growth?", "opts": ["Falling prices and better charging facilities", "Government subsidies and new brands", "Rising petrol prices and exports", "Fiercer competition and lower costs"]},
  {"q": "What may speed up?", "opts": ["Consolidation of the industry", "Price increases", "Growth of small brands", "Construction of charging stations"]}])

psg("P11", "外婆的厨房", "book", [
 "小时候|，|我|最|喜欢|待|在|外婆|的|厨房|里|。|那|是|一间|很|小|的|屋子|，|墙|被|油烟|熏|得|发黄|，|灶台|上|总|放着|一锅|还|冒着|热气|的|汤|。",
 "外婆|做饭|从来|不|看|菜谱|，|盐|放|多少|全|凭|感觉|。|我|问|她|怎么|知道|的|，|她|只是|笑笑|说|：|“|做|多了|，|手|自己|就|知道|了|。|”",
 "后来|我|也|学着|做|她|的|拿手菜|，|可|无论|怎么|做|，|总|觉得|少了|点|什么|。"],
 {"外婆": ["wàipó", "grandma (mother's mother)"], "屋子": ["wūzi", "room"], "油烟": ["yóuyān", "cooking fumes"], "熏": ["xūn", "stain with smoke"], "发黄": ["fāhuáng", "turn yellow"], "灶台": ["zàotái", "stove"], "放着": ["fàngzhe", "there sat"], "一锅": ["yì guō", "a pot of"], "冒着": ["màozhe", "giving off"], "热气": ["rèqì", "steam"], "菜谱": ["càipǔ", "recipe"], "凭": ["píng", "go by"], "笑笑": ["xiàoxiao", "smile"], "做多了": ["zuò duō le", "after doing it a lot"], "学着": ["xuézhe", "try to learn to"], "拿手菜": ["náshǒucài", "signature dish"], "少了点什么": ["shǎo le diǎn shénme", "something's missing"]},
 "Grandma's kitchen\n\nAs a child I loved being in Grandma's kitchen most of all. It was a tiny room, the walls stained yellow by cooking fumes, and on the stove there was always a pot of soup still giving off steam.\n\nGrandma never cooked from a recipe; how much salt went in was all by feel. When I asked how she knew, she just smiled and said, 'Do it enough and your hands know on their own.'\n\nLater I tried to make her signature dishes too, but no matter how I made them, something always seemed to be missing.",
 [{"q": "How did Grandma decide how much salt to add?", "opts": ["By feel, from experience", "From an old recipe book", "By tasting several times", "By asking the narrator"]},
  {"q": "Why were the kitchen walls yellow?", "opts": ["Stained by cooking fumes", "They were painted yellow", "Old wallpaper", "Afternoon sunlight"]},
  {"q": "How does the narrator feel about making her dishes now?", "opts": ["Something always seems missing", "They taste just the same", "They're better than Grandma's", "The narrator has never tried"]}])

psg("P12", "在饭馆点菜", "talk", [
 "服务员|：|您好|，|几位|？|有|预订|吗|？",
 "我|：|两位|，|没有|预订|。|靠窗|的|位子|还有|吗|？",
 "服务员|：|有|的|，|这边|请|。|扫|桌上|的|二维码|就|可以|点餐|。",
 "我|：|我们|第一次|来|，|你们|家|的|招牌菜|是|什么|？",
 "服务员|：|水煮鱼|和|宫保鸡丁|点|的|人|最多|。|水煮鱼|比较|辣|，|可以|做|微辣|。",
 "我|：|那|就|来|一份|微辣|的|水煮鱼|，|再|来|个|清淡|点|的|青菜|。|米饭|是|免费|的|吗|？",
 "服务员|：|米饭|三块|一碗|，|茶水|免费|。"],
 {"几位": ["jǐ wèi", "how many people?"], "预订": ["yùdìng", "reservation"], "位子": ["wèizi", "seat"], "这边请": ["zhèbiān qǐng", "this way please"], "扫": ["sǎo", "scan"], "二维码": ["èrwéimǎ", "QR code"], "点餐": ["diǎncān", "order food"], "你们家": ["nǐmen jiā", "your restaurant"], "招牌菜": ["zhāopáicài", "signature dish"], "水煮鱼": ["shuǐzhǔyú", "Sichuan boiled fish in chili oil"], "宫保鸡丁": ["gōngbǎo jīdīng", "kung pao chicken"], "微辣": ["wēilà", "mildly spicy"], "来一份": ["lái yí fèn", "we'll have one (order)"], "清淡": ["qīngdàn", "light, not oily or spicy"], "青菜": ["qīngcài", "green vegetables"], "茶水": ["cháshuǐ", "tea"]},
 "Ordering at a restaurant\n\nWaiter: Hello, how many? Do you have a reservation?\nMe: Two, no reservation. Any window seats left?\nWaiter: Yes, this way please. Scan the QR code on the table to order.\nMe: It's our first time here. What's your signature dish?\nWaiter: Boiled fish and kung pao chicken are the most ordered. The boiled fish is fairly spicy; we can make it mild.\nMe: Then one mild boiled fish, and some lighter greens. Is the rice free?\nWaiter: Rice is ¥3 a bowl; tea is free.",
 [{"q": "How do they order?", "opts": ["Scan the QR code on the table", "Tell the waiter", "At the counter", "From a paper menu"]},
  {"q": "What's said about the boiled fish?", "opts": ["It's fairly spicy but can be made mild", "It's the mildest dish", "It's sold out today", "It comes with free rice"]},
  {"q": "What's free?", "opts": ["Tea", "Rice", "Greens", "Nothing"]}])

psg("P13", "火车站改签", "talk", [
 "我|：|你好|，|我|这张|票|是|下午|三点|的|，|想|改签|到|早|一点|的|车次|，|可以|吗|？",
 "工作人员|：|可以|。|今天|还有|一点|十五|的|，|二等座|只|剩|几张|了|，|要|吗|？",
 "我|：|要|。|改签|要|加钱|吗|？",
 "工作人员|：|票价|一样|，|不用|补|差价|。|不过|改签|以后|如果|再|退票|，|要|收|一定|的|手续费|。",
 "我|：|明白|了|。|那|在|哪个|检票口|进站|？",
 "工作人员|：|看|大屏幕|。|一般|开车|前|十五/分钟|停止|检票|，|别|来|晚|了|。"],
 {"改签": ["gǎiqiān", "change (a ticket)"], "车次": ["chēcì", "train (service)"], "工作人员": ["gōngzuò rényuán", "staff member"], "一点十五": ["yì diǎn shíwǔ", "1:15"], "二等座": ["èrděngzuò", "second-class seat"], "剩": ["shèng", "be left"], "加钱": ["jiā qián", "pay extra"], "补": ["bǔ", "make up, pay"], "差价": ["chājià", "price difference"], "退票": ["tuìpiào", "refund a ticket"], "手续费": ["shǒuxùfèi", "handling fee"], "检票口": ["jiǎnpiàokǒu", "ticket gate"], "进站": ["jìnzhàn", "enter the station (platform)"], "大屏幕": ["dà píngmù", "big screen"], "开车": ["kāichē", "(train) departs"], "停止检票": ["tíngzhǐ jiǎnpiào", "boarding closes"]},
 "Changing a ticket at the station\n\nMe: Hi, my ticket is for 3 p.m. Can I change it to an earlier train?\nStaff: Yes. There's still one at 1:15 today; only a few second-class seats are left. Want it?\nMe: Yes. Does changing cost extra?\nStaff: Same fare, no difference to pay. But if you refund after changing, there's a handling fee.\nMe: Got it. Which gate do I go through?\nStaff: Check the big screen. Boarding usually closes 15 minutes before departure, so don't be late.",
 [{"q": "Does the change cost extra?", "opts": ["No, the fare is the same", "Yes, a handling fee", "Yes, the price difference", "Only for second class"]},
  {"q": "What happens if they refund after changing?", "opts": ["They pay a handling fee", "They get a full refund", "They can't refund at all", "They must change again first"]},
  {"q": "When does boarding usually close?", "opts": ["15 minutes before departure", "5 minutes before departure", "At 1:15", "When the train arrives"]}])

psg("P14", "奶茶测评｜这杯到底值不值", "xhs", [
 "最近|很|火|的|那家|新|奶茶店|终于|被|我|喝到|了|！|排|了|四十/分钟|，|一杯|二十八|，|说实话|不|便宜|。",
 "口感|：|茶味|挺|浓|的|，|不会|太|甜|，|奶盖|也|很|绵密|。|但是|小料|给|得|有点|少|，|喝到|一半|珍珠|就|没|了|😅",
 "总结|：|好喝|是|好喝|，|但|值不值得|排|这么|久|就|见仁见智|了|。|我|个人|觉得|，|不|排队|的话|可以|试试|。"],
 {"测评": ["cèpíng", "review"], "火": ["huǒ", "popular, hot"], "奶茶店": ["nǎichá diàn", "milk-tea shop"], "喝到": ["hē dào", "get to drink"], "口感": ["kǒugǎn", "mouthfeel"], "茶味": ["chá wèi", "tea flavour"], "浓": ["nóng", "strong"], "奶盖": ["nǎigài", "cream cap (milk foam)"], "绵密": ["miánmì", "dense and smooth"], "小料": ["xiǎoliào", "toppings"], "珍珠": ["zhēnzhū", "tapioca pearls"], "好喝是好喝": ["hǎohē shì hǎohē", "it IS tasty, but…"], "值不值得": ["zhí bu zhíde", "whether it's worth it"], "见仁见智": ["jiàn rén jiàn zhì", "a matter of opinion"], "个人": ["gèrén", "personally"]},
 "Milk tea review | Is this cup actually worth it?\n\nI finally got to try that hot new milk-tea shop! Queued 40 minutes, ¥28 a cup. Honestly, not cheap.\n\nTaste: the tea flavour is strong, not too sweet, and the cream cap is dense and smooth. But they're stingy with the toppings; halfway through, the pearls were gone 😅\n\nVerdict: it IS good, but whether it's worth queuing that long is a matter of opinion. Personally I'd say try it if there's no line." + note,
 [{"q": "What's her main complaint?", "opts": ["Too few toppings", "Too sweet", "Too small for the price", "The tea was weak"]},
  {"q": "Is it worth the queue, in her view?", "opts": ["A matter of opinion; try it if there's no line", "Definitely worth it", "Never worth it", "Only on weekdays"]},
  {"q": "How long did she queue?", "opts": ["40 minutes", "28 minutes", "4 hours", "She didn't queue"]}])

psg("P15", "年轻人爱上“特种兵式旅游”", "news", [
 "最近|，|一种|被|称为|“|特种兵式/旅游|”|的|出行|方式|在|年轻人|中|流行|起来|。|所谓|“|特种兵式/旅游|”|，|就是|利用|周末|或|短假|，|在|极短|的|时间|内|打卡|尽可能|多|的|景点|。",
 "有|大学生|表示|，|自己|两天|走|了|七万|步|，|去|了|十几个|景点|，|“|虽然|累|，|但是|省钱|又|有|成就感|”|。",
 "也|有|专家|认为|，|这种|旅游|方式|节奏|过快|，|难以|真正|了解|当地|文化|，|还|可能|带来|安全|隐患|。"],
 {"特种兵式": ["tèzhǒngbīng shì", "special-forces-style"], "特种兵式旅游": ["tèzhǒngbīng shì lǚyóu", "cramming as many sights as possible into a short trip"], "称为": ["chēngwéi", "be called"], "流行起来": ["liúxíng qǐlái", "become popular"], "所谓": ["suǒwèi", "so-called"], "短假": ["duǎn jià", "short holiday"], "极短": ["jí duǎn", "extremely short"], "打卡": ["dǎkǎ", "check in (visit and post)"], "尽可能": ["jǐn kěnéng", "as … as possible"], "七万": ["qī wàn", "70,000"], "十几个": ["shí jǐ gè", "a dozen or so"], "成就感": ["chéngjiùgǎn", "sense of achievement"], "节奏": ["jiézòu", "pace"], "过快": ["guò kuài", "too fast"], "难以": ["nányǐ", "hard to"], "隐患": ["yǐnhuàn", "hidden danger"]},
 "Young people fall for 'special-forces-style travel'\n\nRecently a way of travelling called 'special-forces-style travel' has caught on among young people. It means using a weekend or short holiday to check off as many sights as possible in an extremely short time.\n\nOne university student said they walked 70,000 steps in two days and visited a dozen or so sights: 'Tiring, but it saves money and feels like an achievement.'\n\nSome experts, though, think the pace is too fast to really understand the local culture, and that it may also bring safety risks." + note,
 [{"q": "What is 特种兵式旅游?", "opts": ["Cramming as many sights as possible into a short trip", "Travelling with a military-style tour group", "Long-distance hiking in the wilderness", "Travelling for free by volunteering"]},
  {"q": "What did the student say?", "opts": ["It's tiring but cheap and satisfying", "It's too tiring to do again", "It's expensive but worth it", "They only managed a few sights"]},
  {"q": "What concern do experts raise?", "opts": ["The pace is too fast to understand local culture, and it may be unsafe", "It costs too much", "It harms the environment", "It crowds out local residents"]}])

psg("P16", "为什么年轻人越来越不爱打电话？", "zhihu", [
 "谢邀|。|我|觉得|主要|有|三个|原因|。",
 "第一|，|打电话|太|突然|了|。|消息|可以|想好|了|再|回|，|电话|一|响|就|得|马上|反应|，|很多|人|会|紧张|。",
 "第二|，|现在|大部分|事情|发|消息|就|能|解决|，|还|能|留下|记录|，|不|容易|出错|。",
 "第三|，|也是|最|现实|的|：|一般|会|打|电话|给|你|的|，|除了|快递|就是|推销|，|久而久之|，|大家|看到|陌生|号码|第一|反应|就是|挂掉|。"],
 {"谢邀": ["xiè yāo", "'thanks for the invite' (Zhihu opener)"], "想好": ["xiǎng hǎo", "think through"], "响": ["xiǎng", "ring"], "反应": ["fǎnyìng", "react"], "发消息": ["fā xiāoxi", "send a message"], "留下": ["liúxià", "leave (behind)"], "记录": ["jìlù", "record"], "出错": ["chūcuò", "make mistakes"], "现实": ["xiànshí", "down-to-earth, practical"], "快递": ["kuàidì", "delivery courier"], "推销": ["tuīxiāo", "sales pitch"], "久而久之": ["jiǔ ér jiǔ zhī", "over time"], "陌生": ["mòshēng", "unfamiliar"], "号码": ["hàomǎ", "number"], "挂掉": ["guàdiào", "hang up"]},
 "Why are young people less and less willing to make phone calls?\n\nThanks for the invite. I think there are three main reasons.\n\nFirst, calls are too sudden. You can think a message through before replying, but when the phone rings you have to react right away, and many people get nervous.\n\nSecond, most things can now be sorted out by message, which also leaves a record, so mistakes are less likely.\n\nThird, and most practically: the people who usually call you are either couriers or salespeople. Over time, everyone's first reaction to an unknown number is to hang up.",
 [{"q": "Why do calls make people nervous (first reason)?", "opts": ["You have to react at once, with no time to think", "Calls are expensive", "The reception is often bad", "Other people might overhear"]},
  {"q": "What advantage of messages is mentioned?", "opts": ["They leave a record, so fewer mistakes", "They're free", "They're faster to type", "They can be deleted"]},
  {"q": "Who usually calls, according to the third reason?", "opts": ["Couriers and salespeople", "Family members", "Bosses", "Old friends"]}])

PL["read"] = ["P14", "P7", "P8", "P2", "P1", "P3"]

# In-context readings for words with several pronunciations (the dictionary lists all; this marks the one used here)
for p in P:
    if p["id"] == "P1": p["gl"]["长"] = ["cháng", "long (最长 = the longest)"]
    if p["id"] == "P11": p["gl"]["待"] = ["dāi", "stay (待在 = stay in)"]
for p in P:
    if p["id"] == "P16": p["gl"]["得"] = ["děi", "have to (就得 = then you have to)"]
