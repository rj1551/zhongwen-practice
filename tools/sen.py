# Sentence parsing drill: one dense written-register sentence, one question about precise meaning.
# s uses the chunk markup (| chunk break, / word break inside a chunk). opts[0] is correct.
# Wrong options fit the topic and differ only in what the structure decides.
N = []
def sen(s, opts, frames, q="What does it say?"):
    N.append(dict(id="N%02d" % (len(N) + 1), s=s, q=q, opts=opts, frames=frames))

sen("据|海关/总署|统计|，|今年|前|十个/月|，|我国|进出口/总值|同比|增长|4.2%|，|其中|出口|增长|6.1%|。",
    ["Total trade rose 4.2% year on year in the first ten months, with exports up 6.1%", "Total trade rose 6.1% year on year in the first ten months, with exports up 4.2%", "In October, total trade rose 4.2% year on year, with exports up 6.1%", "Total trade rose 4.2% in the first ten months, and exports made up 6.1% of it"],
    [["据…统计", "according to … statistics"], ["前十个月", "the first ten months"], ["其中", "of which"]])
sen("截至|10月/底|，|全市|累计|建成|充电桩|12万个|，|较|年初|增加|近|三成|。",
    ["By the end of October the city had built 120,000 chargers in total, nearly 30% more than at the start of the year", "In October alone the city built 120,000 chargers, nearly 30% more than at the start of the year", "By the end of October the city had built 120,000 chargers in total, just over 30% more than at the start of the year", "By the end of October the city had built 120,000 chargers in total, nearly 30% fewer than planned"],
    [["截至…", "as of / up to (a time)"], ["累计", "cumulatively, in total"], ["较…增加", "up compared with …"], ["近三成", "nearly 30%"]])
sen("受|寒潮|影响|，|预计|未来|三天|我省|大部/地区|气温|将|下降|8至10℃|。",
    ["A cold wave will bring temperatures down by 8–10°C across most of the province over the next three days", "A cold wave brought temperatures down by 8–10°C across most of the province over the past three days", "A cold wave will bring temperatures down to 8–10°C across most of the province over the next three days", "A cold wave will bring temperatures down by 8–10°C in a few parts of the province over the next three days"],
    [["受…影响", "affected by …"], ["预计…将", "expected to … (future)"], ["大部地区", "most areas"], ["下降8至10℃", "drop BY 8–10° (下降到 = drop TO)"]])
sen("该|项目|总/投资|约|50亿元|，|预计|2028年|建成/投用|。",
    ["Total investment is about ¥5 billion; it's expected to be completed and in use by 2028", "Total investment is about ¥500 million; it's expected to be completed and in use by 2028", "Total investment is about ¥5 billion; construction is expected to start in 2028", "About ¥5 billion has been spent so far; it was completed in 2028"],
    [["该", "this / the said (formal)"], ["50亿元", "5 billion yuan (亿 = 100 million)"], ["建成投用", "completed and put into use"]])
sen("与|上年|相比|，|今年|报考/人数|减少|了|约|一成|，|但|录取/比例|基本|持平|。",
    ["Applicants fell about 10% from last year, but the admission rate stayed about the same", "Applicants fell about 1% from last year, but the admission rate stayed about the same", "Applicants fell about 10% from last year, and the admission rate fell too", "Applicants rose about 10% from last year, but the admission rate stayed about the same"],
    [["与…相比", "compared with …"], ["一成", "10%"], ["持平", "flat, unchanged"]])
sen("此次|降价|并非|个别/现象|，|而是|整个/行业|竞争|加剧|的|结果|。",
    ["This price cut isn't a one-off; it's the result of fiercer competition across the industry", "This price cut is a one-off, not the result of industry-wide competition", "This price cut has made competition across the whole industry fiercer", "This price cut isn't a one-off; it will make competition across the industry fiercer"],
    [["并非…而是…", "is not … but rather …"], ["个别现象", "an isolated case"], ["…的结果", "the result of …"]])
sen("有关/部门|表示|，|将|对|违规/企业|依法|予以|处罚|，|并|向|社会|公布|。",
    ["The authorities will penalize companies that broke the rules, according to law, and make it public", "The authorities have already penalized the companies and published a list", "The authorities will ask the public to report companies that break the rules", "The authorities will penalize the companies but won't make it public"],
    [["将对…予以处罚", "will impose penalties on …"], ["依法", "according to law"], ["向社会公布", "announce publicly"]])
sen("尽管|房价|连续|三个/月|下跌|，|成交量|却|不/降/反/升|。",
    ["Although home prices fell three months in a row, sales volume actually rose", "Because home prices fell three months in a row, sales volume fell too", "Although home prices rose three months in a row, sales volume fell", "Although home prices fell for three months, sales volume held steady"],
    [["尽管…却…", "although … (yet) …"], ["不降反升", "rose instead of falling"]])
sen("随着|气温|回升|，|景区|游客/数量|明显|增多|，|部分|热门/景点|已|实行|限流|。",
    ["As it warms up, visitor numbers have clearly risen, and some popular sights now limit entry", "As it cools down, visitor numbers have clearly fallen, and some sights have closed", "As it warms up, visitor numbers have risen slightly, and some popular sights plan to limit entry", "As it warms up, visitor numbers have clearly risen, and every popular sight now limits entry"],
    [["随着…", "as … (changes)"], ["回升", "rise again"], ["实行限流", "limit visitor numbers"]])
sen("业内/人士|预计|，|明年|该/行业|增速|或将|放缓|至|5%|左右|。",
    ["Insiders expect the industry's growth may slow to around 5% next year", "Insiders expect the industry's growth may slow by around 5 points next year", "Insiders say the industry grew around 5% this year and will speed up next year", "Insiders are sure the industry's growth will fall below 5% next year"],
    [["或将", "may, could (formal)"], ["放缓至", "slow TO (降低…: by)"], ["左右", "around"]])
sen("为|缓解|早/高峰|拥堵|，|地铁|将|加开|临时/列车|，|发车/间隔|缩短|至|两/分钟|。",
    ["To ease morning rush-hour crowding, the subway will add extra trains and cut the interval to two minutes", "Because of morning rush-hour crowding, the subway will cut trains and lengthen the interval to two minutes", "To ease morning rush-hour crowding, the subway will add extra trains and cut the interval by two minutes", "To ease evening crowding, the subway has added two extra trains"],
    [["为…", "in order to …"], ["早高峰", "morning rush hour"], ["加开", "run additional (trains)"], ["缩短至", "shorten TO"]])
sen("该/市|规定|，|自|明年|1月1日|起|，|餐饮/企业|不得|主动|提供|一次性/餐具|。",
    ["From Jan 1 next year, restaurants may not hand out disposable tableware unless asked", "From Jan 1 next year, restaurants must hand out disposable tableware", "Until Jan 1 next year, restaurants may still hand out disposable tableware freely", "From Jan 1 next year, restaurants may not use disposable tableware at all"],
    [["自…起", "starting from …"], ["不得", "must not (formal)"], ["主动提供", "offer unprompted"], ["一次性餐具", "disposable tableware"]])
sen("调查|显示|，|超过|七成|的|受访者|认为|，|工作/压力|是|影响|睡眠|的|主要/因素|。",
    ["Over 70% of respondents see work stress as the main factor affecting sleep", "About 70% of respondents sleep less because of work stress", "Over 70% of respondents say sleep affects their work performance", "Over 17% of respondents see work stress as the main factor affecting sleep"],
    [["调查显示", "a survey shows"], ["七成", "70%"], ["受访者", "respondents"], ["影响…的主要因素", "the main factor affecting …"]])
sen("该/款|手机|上市/首日|销量|突破|百万台|，|一度|导致|官网|崩溃|。",
    ["The phone sold over a million on launch day, at one point crashing the official site", "The phone sold almost a million on launch day, and the site kept crashing", "The phone sold over a million in its first week, crashing the official site", "The official site crashed on launch day, so it sold under a million"],
    [["上市首日", "launch day"], ["突破", "break through, exceed"], ["一度", "at one point"]])
sen("鉴于|近期|多起|事故|，|相关/部门|要求|所有|电动/自行车|必须|在|指定/区域|充电|。",
    ["In view of several recent accidents, all e-bikes must now be charged in designated areas", "Several recent accidents were caused by e-bikes charging in designated areas", "In view of several recent accidents, e-bikes are now banned from charging", "In view of one recent accident, e-bikes should be charged in designated areas where possible"],
    [["鉴于…", "in view of …"], ["多起", "several (incidents)"], ["指定区域", "designated areas"]])
sen("专家|建议|，|除非|必要|，|尽量|避免|在|高温/时段|外出|。",
    ["Experts advise avoiding going out in the hottest hours unless necessary", "Experts advise going out only in the hottest hours, if necessary", "Experts say going out in the hottest hours is necessary", "Experts advise staying in all day during heat waves"],
    [["除非必要", "unless necessary"], ["尽量避免", "try to avoid"], ["高温时段", "the hottest hours"]])
sen("这项|技术|一旦|成熟|，|有望|将|电池/成本|降低|一半/以上|。",
    ["Once mature, the technology could cut battery costs by more than half", "Once mature, the technology could cut battery costs to just over half", "The technology has matured and has cut battery costs by half", "Once mature, the technology could double battery life"],
    [["一旦…", "once …"], ["有望", "is expected to"], ["将…降低一半以上", "cut … by more than half (将 = 把)"]])
sen("由于|原材料|价格|上涨|，|多家|企业|不得不|上调|产品/价格|。",
    ["Because raw-material prices rose, several companies have had to raise prices", "Because several companies raised prices, raw-material costs rose", "Although raw-material prices rose, several companies refused to raise prices", "Because raw-material prices fell, several companies cut prices"],
    [["由于…", "due to …"], ["不得不", "have no choice but to"], ["上调", "raise (prices, rates)"]])
sen("他|在|接受/采访|时|坦言|，|公司|目前|仍|处于|亏损/状态|。",
    ["In an interview he admitted the company is still losing money", "In an interview he denied the company is losing money", "In an interview he said the company has just become profitable", "He turned down the interview because the company is losing money"],
    [["在接受采访时", "when interviewed"], ["坦言", "admit frankly"], ["处于…状态", "be in a state of …"]])
sen("本次|调整|仅|适用于|新/用户|，|老/用户|不受/影响|。",
    ["This change applies only to new users; existing users aren't affected", "This change applies to all users, especially new ones", "This change applies only to existing users; new users aren't affected", "This change will reach existing users later"],
    [["仅适用于", "applies only to"], ["不受影响", "not affected"]])
sen("据悉|，|该|展览|将|持续|至|明年|三月|，|门票|需|提前|预约|。",
    ["The exhibition reportedly runs until next March; tickets must be booked ahead", "The exhibition reportedly opens next March; tickets must be booked ahead", "The exhibition reportedly runs for three months; tickets are free on the day", "The exhibition ended in March; bookings have closed"],
    [["据悉", "reportedly"], ["持续至", "last until"], ["需提前预约", "must be booked ahead"]])
sen("目前|，|事故/原因|正在|进一步|调查|中|。",
    ["The cause of the accident is still being investigated", "The cause of the accident has been determined", "Investigators are looking for further accidents", "The investigation has been closed"],
    [["正在…中", "in the process of …"], ["进一步", "further"]])
sen("该/政策|出台|后|，|不少|年轻人|选择|回到|家乡|创业|。",
    ["After the policy came out, many young people chose to go back home and start businesses", "Before the policy came out, many young people left home to start businesses", "After the policy came out, few young people chose to go back home", "The policy requires young people to go back home to work"],
    [["出台", "be issued (a policy)"], ["不少", "quite a few, many"], ["创业", "start a business"]])
sen("截至|发稿|时|，|已有|超过|三千|名|志愿者|报名|参加|。",
    ["As of press time, over 3,000 volunteers had signed up", "As of press time, nearly 3,000 volunteers had signed up", "Over 3,000 volunteers are needed by the deadline", "Since publication, 3,000 more volunteers have signed up"],
    [["截至发稿时", "as of press time"], ["已有", "already (there are)"]])
sen("与其说|这|是|一次|失败|，|不如说|是|一次|宝贵|的|经验|。",
    ["It's less a failure than a valuable lesson", "It's both a failure and a valuable lesson", "It was a failure, not a valuable lesson", "Calling it a failure is better than calling it a lesson"],
    [["与其说…不如说…", "it's less … than …"]], q="What does the speaker mean?")
sen("这家|老字号|曾|一度|濒临|倒闭|，|后来|靠|网络/直播|重新|火|了|起来|。",
    ["This old brand was once on the verge of closing, then got popular again through livestreaming", "This old brand closed down and was later revived as a livestream channel", "This old brand was once very popular, then closed because of livestreaming", "This old brand has always been popular thanks to livestreaming"],
    [["老字号", "long-established brand"], ["曾一度", "at one time"], ["濒临倒闭", "on the verge of closing"], ["火了起来", "became popular"]])
sen("不管|天气|如何|，|比赛|都|将|按/原/计划|进行|。",
    ["Whatever the weather, the match will go ahead as planned", "Depending on the weather, the match may be rescheduled", "If the weather is bad, the match will be cancelled", "The match went ahead as planned despite the weather"],
    [["不管…都…", "no matter …, still …"], ["按原计划", "as originally planned"]])
sen("网友|纷纷|表示|，|这/波/操作|“|太|离谱|了|”|。",
    ["Netizens one after another called the move 'totally outrageous'", "Netizens one after another praised the move as 'brilliant'", "A few netizens called the move 'too risky'", "Netizens said the process was 'too slow'"],
    [["纷纷", "one after another"], ["这波操作", "this move (internet slang)"], ["离谱", "outrageous, ridiculous"]])
sen("他|宁可|多|花|点|钱|，|也|不|愿意|排|两个/小时|的|队|。",
    ["He'd rather spend a bit more than queue for two hours", "He'd rather queue for two hours than spend more", "He spent more and still had to queue for two hours", "He won't spend more, and he won't queue for two hours either"],
    [["宁可…也不…", "would rather … than …"], ["排…的队", "queue for … (排队 split open)"]], q="What does it say about him?")
sen("直到|看到|新闻|，|我|才|知道|那/条/路|已经|封|了|三天|了|。",
    ["Only when I saw the news did I learn the road had already been closed for three days", "When I saw the news, I learned the road would close in three days", "I knew the road had been closed for three days before the news came out", "The news said the road will be closed for three days"],
    [["直到…才…", "not until … did …"], ["封了三天了", "has been closed for three days (and still is)"]])
