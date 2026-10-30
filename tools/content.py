import json, re, sys

# ---------- Production ladder ----------
# zh: segments split by |, key chunk in [brackets]. alt: other accepted full answers.
# cx: wrong fillers for the key slot. bad: unnatural/wrong full sentences. why: teaching note.
L = []
def lad(en, zh, alt, cx, bad, why, tag):
    L.append(dict(id="L%02d" % (len(L) + 1), en=en, zh=zh, alt=alt, cx=cx, bad=bad, why=why, tag=tag))

lad("I was planning to go yesterday, but it ended up raining, so I just stayed home.",
    "我|本来|打算|昨天|去的|，|[结果]|下起雨来了|，|就|在家|待着了|。",
    ["我本来昨天打算去的，结果下雨了，就在家待着了。", "我本来打算昨天去的，结果下起雨来了，只好待在家里。", "我本来打算昨天去，结果下雨了，就待在家里了。", "我本来打算昨天去的，结果下雨了，就待在家里了。"],
    ["所以", "因此", "而且"],
    ["我昨天计划去，但是下雨开始了，所以我呆在家。", "我本来打算昨天去的，然后下雨了，所以我在家里待。"],
    "结果 = 'and as it turned out…' — the go-to word when a plan backfires. 下起雨来 = 'started raining' (起…来 wraps the object). 就 + 待着了 is lighter than 所以.", "result")
lad("The more I think about it, the less sense it makes.",
    "我|[越想越]|觉得|说不通|。",
    ["越想越不对劲。", "我越想越觉得不对劲。", "我越想越觉得没道理。", "越想越说不通。", "我越想越不明白。", "越想越觉得说不通。"],
    ["越思考越", "更想更", "越来越想"],
    ["这件事是越思考越不理解。", "我想得越多，越没有意义。"],
    "越 sits directly before each verb: 越想越… Speech uses 想, not 思考. 'Makes sense' → 说得通 / 有道理; negative: 说不通 / 没道理 / 不对劲.", "pattern")
lad("Can you recommend a place locals actually go to? Not a tourist trap.",
    "能|推荐|一家|[本地人]|常去的|店|吗|？|别是|那种|专坑游客的|。",
    ["能推荐一家本地人常去的店吗？别是那种坑游客的。", "能推荐一家本地人常去的店吗？不要那种专门坑游客的。", "有没有本地人常去的馆子推荐一下？不要网红店。", "能推荐一家本地人常去的店吗？不要那种坑游客的。"],
    ["游人", "外地人", "客人"],
    ["你可不可以推荐不是游人而是本地人实在去吃饭的饭店？", "你能推荐一个本地人真正吃的不是游客的饭店吗？"],
    "Chinese avoids one long modifier in front of a noun. Keep the request short (本地人常去的店), then add the 'not X' as its own sentence. 坑 = rip off.", "shape")
lad("Since you're already here, stay for dinner.",
    "[既然]|来了|，|就|吃了|饭|再走|吧|。",
    ["既然来了，就吃完饭再走吧。", "既然都来了，就吃了饭再走吧。", "来都来了，吃了饭再走吧。", "既然来了，就吃了饭再走吧。"],
    ["虽然", "尽管", "因为"],
    ["因为你已经在这里，所以留下吃晚饭。", "既然你已经这里了，留下来晚饭吧。"],
    "既然…就… = 'since (given that)…, then…'. 吃了饭再走 = eat first, then leave — 再 marks the later action. 来都来了 = 'well, you're here anyway'.", "pattern")
lad("I almost missed the train.",
    "我|[差点儿]|没|赶上|火车|。",
    ["我差点没赶上火车。", "我差一点儿没赶上火车。", "我差点错过火车。", "我差点儿错过了火车。", "我差点儿错过火车。"],
    ["几乎不", "快要", "刚好"],
    ["我几乎错失了火车。", "我差点儿赶上火车。"],
    "差点儿没赶上 and 差点儿错过 both mean 'almost missed' — for unwanted outcomes the 没 doesn't flip the meaning. 赶上 = make it in time. 错失 is for opportunities, not trains.", "pattern")
lad("After a lot of effort, I finally got a ticket.",
    "[好不容易]|才|买到|票|。",
    ["我好不容易才买到票。", "好容易才买到票。", "费了好大劲才买到票。", "费了好大的劲才买到票。", "好不容易才抢到票。", "我好不容易才抢到票。"],
    ["很容易", "不容易", "终于容易"],
    ["我用了很多努力最后得到一张票。", "花了很多力气终于拿票了。"],
    "好不容易才… = 'only after a struggle did…' (好容易 means the same here). 才 = 'only then'. 买到/抢到: 到 = managed to get.", "pattern")
lad("The bus is packed — let's just walk.",
    "公交车|上|挤满了|人|，|我们|[干脆]|走路|吧|。",
    ["公交车上挤满了人，我们干脆走过去吧。", "公交车太挤了，干脆走路吧。", "公交挤满了人，咱们干脆走着去吧。", "公交车上挤满了人，干脆走路吧。"],
    ["简直", "居然", "果然"],
    ["公交车是满的人，我们只走吧。", "巴士有很多人，我们走路就好。"],
    "干脆 = 'just (cut to the chase and)…' for a decisive fallback. 挤满了人 = crammed with people. 走过去 / 走着去 = go on foot.", "word")
lad("It's not that I'm busy — I just can't be bothered to cook.",
    "我|[倒]|不是|很忙|，|就是|懒得|做饭|。",
    ["我倒不是忙，就是懒得做饭。", "其实我不是很忙，就是懒得做饭。", "我倒也不忙，就是懒得做饭。", "我倒不是很忙，就是懒得做饭。"],
    ["却", "还", "都"],
    ["我不是那么忙，只是我是太懒做饭。", "我没有那么忙，就是我懒做饭。"],
    "倒不是…就是… = 'it's not so much…, it's just…'. 懒得 + verb = can't be bothered to. 'Too lazy to' is not 太懒….", "pattern")
lad("He can't even boil an egg.",
    "他|[连]|鸡蛋|都|不会|煮|。",
    ["他连个鸡蛋都不会煮。", "他连煮鸡蛋都不会。", "他连煮鸡蛋也不会。", "他连鸡蛋也不会煮。"],
    ["就", "才", "而"],
    ["他不知道甚至煮鸡蛋。", "他都不会煮连鸡蛋。"],
    "连 X 都/也 V puts the extreme example before the verb. 'Doesn't know how to' → 不会.", "pattern")
lad("Rather than waiting around here, we might as well take a taxi.",
    "[与其]|在这儿|干等|，|不如|打车|。",
    ["与其在这儿干等，不如打个车。", "与其在这儿等，还不如打车。", "与其在这里等着，不如直接打车。", "与其在这儿等，不如打车。"],
    ["宁可", "虽然", "不管"],
    ["代替在这里等，我们可以打的。", "不是等在这里，我们最好坐出租。"],
    "与其 A，不如 B = 'rather than A, better to B'. 干等 = wait around doing nothing. 打车 = grab a taxi / ride-hail.", "pattern")
lad("No wonder it's so cheap — it isn't fresh.",
    "[难怪]|这么|便宜|，|原来|不新鲜|。",
    ["怪不得这么便宜，原来不新鲜啊。", "难怪这么便宜，原来是不新鲜的。", "怪不得这么便宜，原来不新鲜。", "难怪这么便宜，原来不新鲜啊。"],
    ["怪", "果然", "竟然"],
    ["没有惊奇它很便宜，它不新鲜。", "不奇怪那么便宜，因为不新鲜。"],
    "难怪/怪不得…，原来… = 'no wonder…, so that's why…'. 原来 marks the reason you just discovered.", "pattern")
lad("If it doesn't work, forget it. Don't force it.",
    "不行|就|[算了]|，|别|勉强|。",
    ["实在不行就算了，别勉强自己。", "不行的话就算了，别硬来。", "不行就算了，别勉强自己。"],
    ["好了", "完了", "忘了"],
    ["如果它不工作，忘记它，不要强迫。", "如果不成功就忘了吧，别逼。"],
    "不行就算了 = 'if it doesn't work, forget it' — 算了 is the idiomatic 'forget it'; 忘了 means literally forgot. 勉强 = force (yourself or someone).", "chunk")
lad("What was his name again?",
    "他|叫|什么|[来着]|？",
    ["他叫什么名字来着？", "他名字叫什么来着？"],
    ["了", "过", "的"],
    ["他的名字是什么再？", "他又叫什么？"],
    "来着 at the end = 'again?' when you're trying to recall something you once knew.", "chunk")
lad("He loses his temper at the slightest thing.",
    "他|[动不动]|就|发脾气|。",
    ["他动不动就生气。", "他一点小事就发脾气。", "他动不动就发火。"],
    ["动一动", "时不时", "一会儿"],
    ["他最小的事情就生气。", "他为最少的东西发火。"],
    "动不动就… = 'at the drop of a hat'. 时不时 = from time to time, without the 'over nothing' sense.", "chunk")
lad("Maybe he's already left.",
    "他|[说不定]|已经|走了|。",
    ["说不定他已经走了。", "他可能已经走了。", "他也许已经走了。", "他没准儿已经走了。"],
    ["不一定", "一定", "肯定"],
    ["可能是他已经离开过了。", "他不一定已经走了。"],
    "说不定 / 没准儿 = 'maybe, you never know'. 不一定 = 'not necessarily' — it leans the other way. 走了 is more natural than 离开了 in speech.", "word")
lad("Passengers for Shanghai, please go to gate 5 to board.",
    "[前往]|上海|的|旅客|，|请|到|5号|检票口|检票|上车|。",
    ["前往上海的旅客请到5号检票口检票上车。", "前往上海的旅客，请到五号检票口检票上车。", "前往上海的旅客，请到5号检票口上车。"],
    ["来往", "前来", "往来"],
    ["去上海的乘客，请上车在5号门。", "到上海的旅客，请在5号门登机。"],
    "前往 = 'heading to' (formal) — you'll hear it in every Chinese station. 检票口 = ticket gate; 检票上车 = have your ticket checked and board.", "leech")
lad("What line of work are you in?",
    "您|[从事]|什么|行业|？",
    ["你从事什么行业？", "你从事什么工作？", "您是做哪一行的？", "你是做什么工作的？", "你是做哪行的？"],
    ["从来", "事业", "处理"],
    ["你的工作的领域是什么？", "你在什么行业工作在？"],
    "从事 + field = 'work in' (formal). Casual: 你是做什么的？/ 做哪一行的？", "leech")
lad("The heavy rain caused serious traffic jams.",
    "大雨|[造成]|了|严重的|交通|堵塞|。",
    ["暴雨造成了严重的交通堵塞。", "大雨导致交通严重堵塞。", "大雨造成交通严重拥堵。", "大雨造成了严重的交通拥堵。"],
    ["制造", "使得", "构成"],
    ["大雨使得严重的交通堵塞。", "大雨做了很严重的堵车。"],
    "造成 + bad result (formal); 导致 is a close synonym. 使得 needs a full clause after it (使得交通严重堵塞).", "leech")
lad("I took the medicine, but instead of getting better I got worse.",
    "吃了|药|，|不但|没|好|，|[反而]|更|严重了|。",
    ["吃了药以后不但没好转，反而更严重了。", "吃了药反而更严重了。", "吃了药不但没好，反而更严重了。"],
    ["而且", "然而", "并且"],
    ["我吃药了但是不是更好，是更坏。", "吃了药，没有好，相反更坏了。"],
    "不但没…反而… = 'far from…, it actually…'. 反而 marks the opposite of what you'd expect.", "leech")
lad("The moon is especially bright tonight.",
    "今晚|的|月亮|[格外]|亮|。",
    ["今晚的月亮特别亮。", "今天晚上的月亮格外明亮。", "今晚月亮格外亮。"],
    ["格式", "另外", "意外"],
    ["今晚的月亮看特别亮。", "今晚月亮是格外亮的看。"],
    "格外 = 'exceptionally (compared with usual)'. 特别 also works. English 'looks' often just disappears in Chinese.", "leech")
lad("Only once the report was done could I sleep easy.",
    "把|报告|写完|，|我|才|睡得|[踏实]|。",
    ["报告写完了，我才睡得踏实。", "写完报告我才睡得踏实。", "把报告写完我才睡得踏实。"],
    ["实在", "结实", "老实"],
    ["只在完成报告之后我可以好好地睡觉。", "完成报告以后我才可以睡安心。"],
    "踏实 = 'at ease, settled' (also 'down-to-earth'). 才 = 'only then'. 睡得踏实 uses a 得 complement for how you sleep.", "leech")
lad("We went to Xi'an and then Chengdu, one after the other.",
    "我们|[先后]|去了|西安|和|成都|。",
    ["我们先去了西安，后去了成都。", "我们先去了西安，又去了成都。", "我们先去了西安，然后去了成都。"],
    ["前后", "先前", "以后"],
    ["我们一个又一个地访问了西安和成都。", "我们访问西安和成都一个之后另一个。"],
    "先后 = 'successively' — the compact written way to list a sequence. Spoken: 先去了A，又去了B.", "leech")
lad("Given the current situation, it's best to postpone the trip.",
    "按|[当前]|的|情况|，|最好|把|行程|推迟|。",
    ["按目前的情况，最好推迟行程。", "就目前的情况来看，最好把行程推迟。", "照现在的情况，最好把行程推迟一下。", "按目前的情况，最好把行程推迟。"],
    ["当时", "当初", "前面"],
    ["给当前的情况，最好推迟旅行。", "因为现在的情况，最好的是推迟旅游。"],
    "当前/目前 = 'at present' (written); 当时 = 'at that time'. 'Given…' → 按/照/就…来看. 把行程推迟 moves the trip before the verb.", "leech")
lad("Living near the subway makes getting around really convenient.",
    "住在|地铁站|附近|，|出行|很|[便利]|。",
    ["住在地铁站附近很方便。", "住在地铁附近，出门很方便。", "住在地铁站附近，出行很方便。"],
    ["便宜", "利益", "顺便"],
    ["生活靠近地铁是真方便。", "住地铁附近是很便利的生活。"],
    "便利 ≈ 方便, a bit more formal (便利店 = convenience store). 出行 = getting around.", "leech")
lad("The exhibition runs for three months.",
    "展览|[为期]|三个月|。",
    ["这个展览为期三个月。", "展览持续三个月。", "展览会办三个月。"],
    ["期间", "周期", "时期"],
    ["展览跑三个月。", "展览是为三个月。"],
    "为期 + duration = 'lasting…' — formal, common in notices and news. English 'runs for' can't be translated literally.", "leech")
lad("I'm dying to go home right now.",
    "我|[巴不得]|马上|回家|。",
    ["我恨不得马上回家。", "我恨不得现在就回家。", "我巴不得现在就回家。", "我等不及要回家了。"],
    ["舍不得", "不得不", "免不了"],
    ["我不能等回家。", "我等不了去回家。"],
    "巴不得 / 恨不得 = 'dying to'. 舍不得 = can't bear to part with; 不得不 = have no choice but to.", "leech")
lad("It was expensive, but worth it.",
    "[尽管]|很|贵|，|但是|值得|。",
    ["尽管很贵，但很值。", "虽然贵，但是很值。", "虽然很贵，但是值得。", "虽然贵了点，但挺值的。"],
    ["不管", "即使", "既然"],
    ["即使它是贵的，它是值得。", "虽然很贵，可是它值得这个钱的。"],
    "尽管/虽然 + fact, 但(是)… 不管 = 'no matter', 即使 = 'even if' (hypothetical). Drop the 'it' — 它 isn't needed.", "leech")
lad("I'd count myself a regular here.",
    "我|[算是]|这儿|的|老顾客|了|。",
    ["我也算是这里的常客了。", "我算是这里的老客人了。", "我在这儿算是常客了。", "我算是这里的常客了。"],
    ["算了", "算数", "打算"],
    ["我考虑我自己是这里的常客。", "我认为我是一个这里的老顾客。"],
    "算是 = 'can be counted as / more or less'. 'Consider myself' → 算是, not 考虑 (= think something over).", "leech")
lad("We finally reached an agreement.",
    "我们|终于|达成了|[一致]|。",
    ["我们终于达成一致了。", "我们终于达成了共识。", "我们最后达成了一致意见。"],
    ["一起", "一样", "一律"],
    ["我们最后到了一个同意。", "我们终于同意了一致。"],
    "达成一致 / 达成共识 = reach agreement. Verb–object pairs like 达成 + 一致 are the backbone of natural written Chinese.", "leech")
lad("Exercise can play a big role in relieving stress.",
    "运动|对|缓解|压力|能|[起到]|很大的|作用|。",
    ["运动对缓解压力起着重要作用。", "运动对缓解压力有很大的帮助。", "运动对缓解压力很有帮助。", "运动对缓解压力能起到很大作用。"],
    ["起来", "达到", "得到"],
    ["运动玩一个重要的角色在缓解压力。", "运动扮演重要的作用缓解压力。"],
    "对 X 起(到)…作用 = 'play a … role in X'. The 对 X frame goes before the verb. 扮演角色 is for roles in stories, not this.", "leech")
lad("He didn't reveal any details.",
    "他|没有|[透露]|任何|细节|。",
    ["他没透露任何细节。", "他一点细节都没透露。", "他什么细节都没说。"],
    ["透明", "发布", "显露"],
    ["他不揭示任何细节。", "他不说了任何的细节。"],
    "透露 = disclose / let slip (information). Past non-events take 没(有), not 不. 'Any' → 任何…, or 一点…都没….", "leech")
lad("We can learn from other cities' experience.",
    "我们|可以|[借鉴]|其他|城市|的|经验|。",
    ["我们可以借鉴别的城市的经验。", "我们可以向其他城市学习经验。", "我们可以学习其他城市的经验。"],
    ["借口", "鉴定", "参加"],
    ["我们可以从其他城市的经验学。", "我们能学从别的城市的经验。"],
    "借鉴 = 'draw on (others' experience)'. 'Learn from X' → 向 X 学习 or 借鉴 X; 从…学 is English-shaped.", "leech")
lad("Is there a window seat?",
    "有没有|[靠窗]|的|座位|？",
    ["有靠窗的座位吗？", "还有靠窗的位置吗？", "有没有靠窗的位子？", "有靠窗的位置吗？"],
    ["在窗", "窗边上", "近窗"],
    ["有一个座位在窗边吗？", "有座位靠近窗户的吗？"],
    "靠窗的座位 (window) / 靠过道的 (aisle). The description goes before 的 + noun; English 'a seat by the window' order doesn't carry over.", "travel")
lad("Could you make it less spicy?",
    "能|[少放点]|辣|吗|？",
    ["能不能少放点辣？", "少放点辣椒可以吗？", "可以做微辣吗？", "能少放点辣椒吗？"],
    ["放少", "少一点的", "不太"],
    ["你可以使它少辣吗？", "能做得少辣吗？"],
    "少放点辣 = 'put in less chili'. Useful: 微辣 (mild), 不要辣 (no spice). 使 + adjective sounds bookish.", "travel")
lad("Can I pay with WeChat?",
    "可以|用|微信|[付款]|吗|？",
    ["可以微信支付吗？", "能用微信付吗？", "能用微信付款吗？", "可以用微信支付吗？"],
    ["付钱的", "买", "给钱"],
    ["我可以付款用微信吗？", "我能付通过微信吗？"],
    "The method comes before the verb: 用微信付款. English 'pay with X' puts X after — Chinese doesn't.", "travel")
lad("How long does it take to walk there from here?",
    "从|这儿|走|过去|[要]|多久|？",
    ["从这里走过去要多长时间？", "从这儿走过去得多久？", "走路过去要多长时间？", "从这儿走过去要多长时间？"],
    ["是", "有", "会"],
    ["它多长时间走路到那里从这里？", "从这里走到那儿需要多少时间吗？"],
    "Order: 从 here + verb + 过去 + 要多久. 'How long does it take' → 要/得多久 at the end; no 它.", "travel")
lad("To be honest, I don't really like it.",
    "[说实话]|，|我|不|太|喜欢|。",
    ["说实话，我不怎么喜欢。", "老实说，我不太喜欢。", "说真的，我不太喜欢。"],
    ["实在说", "说真话的", "诚实地"],
    ["诚实地说，我真的不喜欢它。", "为了诚实，我不是很喜欢它。"],
    "说实话 / 老实说 = 'to be honest'. 'Don't really like' → 不太/不怎么喜欢 (真的不喜欢 = truly dislike). Drop 它.", "express")
lad("It's not that I don't want to help — I really can't.",
    "[不是]|我|不想|帮|，|是|我|真的|帮不了|。",
    ["不是我不想帮你，而是我真的帮不上忙。", "我不是不想帮，是实在帮不了。", "不是不想帮，是真的帮不上。", "不是我不想帮，而是我真的帮不了。"],
    ["没有", "不过", "不用"],
    ["它不是我不想帮助，我真的不能。", "我没有不想帮你，我真的不可以。"],
    "不是 A，(而)是 B = 'it's not A, it's B'. 帮不了 / 帮不上忙 = unable to help — more natural than 不能.", "express")
lad("I don't necessarily agree with him.",
    "我|[未必]|同意|他的|看法|。",
    ["我不一定同意他的看法。", "我不见得同意他的看法。", "我不一定同意他的观点。"],
    ["不必", "必须", "未来"],
    ["我不必要同意他。", "我没有必然同意他的意见。"],
    "未必 / 不一定 / 不见得 = 'not necessarily'. 不必 = 'needn't' — a classic mix-up.", "express")
lad("After all, he's still a kid.",
    "[毕竟]|他|还是|个|孩子|。",
    ["他毕竟还是个孩子。", "他毕竟还小。", "毕竟他还是个小孩。"],
    ["究竟", "终于", "竟然"],
    ["在所有之后，他还是一个孩子。", "最后他仍然是个孩子。"],
    "毕竟 = 'after all' (giving a reason). 究竟 = 'exactly / on earth' in questions.", "express")
lad("I'm used to getting up early now.",
    "我|现在|[习惯]|早起|了|。",
    ["我已经习惯早起了。", "我现在已经习惯早起了。"],
    ["惯用", "平时", "常常"],
    ["我现在被用到早起了。", "我现在用于起床早。"],
    "习惯 + verb = be used to doing. The final 了 marks the change ('now').", "express")
lad("I've been so busy lately I don't even have time to eat.",
    "最近|忙得|[连]|吃饭的|时间|都|没有|。",
    ["最近忙得连饭都顾不上吃。", "我最近忙得连吃饭的时间都没有。"],
    ["就", "才", "也"],
    ["我最近很忙，所以我甚至不能找时间吃。", "最近太忙我不能找吃饭时间。"],
    "V得 + result: 忙得连…都没有 = 'so busy that not even…'. 忙得/累得/笑得 is how Chinese says 'so … that …'.", "express")
lad("Please put your phone away.",
    "请|[把]|手机|收起来|。",
    ["请把手机收好。", "把手机收起来吧。"],
    ["被", "给", "让"],
    ["请放走你的手机。", "请收你的手机起来。"],
    "把 + object + verb + result: 把手机收起来 = put the phone away (收起来 = put away).", "pattern")
lad("Suddenly it started pouring.",
    "突然|[下起]|大雨|来了|。",
    ["突然下起了大雨。", "突然下起大雨来。", "忽然下起大雨来了。", "突然下起大雨了。"],
    ["下来", "下去", "下出"],
    ["突然开始倒雨了。", "突然大雨开始下了。"],
    "V起 + object + 来 = 'start V-ing' — the object sits inside 起…来. 'Pouring' → 大雨; 倒 is for pouring a liquid yourself.", "pattern")
lad("Keep going, don't stop.",
    "继续|说|[下去]|，|别|停|。",
    ["接着说，别停。", "你接着说下去，别停。", "继续说下去，别停下来。"],
    ["起来", "出来", "过来"],
    ["保持说，不要停。", "一直说去，不要停止。"],
    "V + 下去 = keep on V-ing. V + 起来 = start; V + 出来 = come out. 'Keep going' is not 保持.", "pattern")
lad("Tourism has driven the local economy.",
    "旅游业|[带动]|了|当地|经济|的|发展|。",
    ["旅游业带动了当地的经济发展。", "旅游业推动了当地经济发展。", "旅游业带动了当地经济发展。"],
    ["带领", "动员", "拉开"],
    ["旅游业驾驶了当地经济。", "旅游业把当地经济开动了。"],
    "带动 / 推动 + 发展 = 'drive development'. 'Drive' ≠ 驾驶 (driving a car). Chinese often adds 的发展 where English just says 'the economy'.", "leech")
lad("Smoking is not allowed in public places.",
    "公共|[场所]|禁止|吸烟|。",
    ["公共场所不准吸烟。", "公共场所不允许抽烟。", "公共场所禁止抽烟。"],
    ["场面", "广场", "地点"],
    ["吸烟在公共地方是不允许的。", "在公共地方不允许抽。"],
    "公共场所 = public places (it's on every sign). Notices put the place first: [place] 禁止 [action].", "leech")
lad("The project doesn't have enough funding.",
    "这个|项目|的|[经费]|不够|。",
    ["这个项目经费不足。", "这个项目缺经费。", "这个项目资金不够。", "这个项目的资金不够。"],
    ["费用", "经济", "消费"],
    ["项目没有足够的钱资助。", "这个项目没有够的经费。"],
    "经费 = allocated funding; 费用 = cost or expense. 不够/不足 come after the noun.", "leech")

# ---------- Segmentation (chunking) ----------
# Two-level answer key.
#   |  = chunk boundary (a reader should feel a break here) -> must cut
#   /  = word boundary inside a chunk                        -> cut or not, both fine
#   no mark between two characters = inside one word        -> cutting here is a mistake (碑|附)
S = []
def seg(s, en, reg, note=""):
    S.append(dict(id="S%02d" % (len(S) + 1), s=s, en=en, reg=reg, note=note))
# news
seg("据|气象/部门|预测|，|未来/三天|本市|将/迎来|大范围/降雨|。", "According to the weather service's forecast, the city will see widespread rain over the next three days.", "news", "据 … 预测 is a frame: 'according to …'s forecast'.")
seg("业内/人士|认为|，|这一/政策|有望/带动|新能源/汽车/的/消费|。", "Industry insiders believe the policy is expected to drive consumption of new-energy vehicles.", "news", "有望 + verb = 'is expected to'.")
seg("受/台风/影响|，|部分/航班|被迫/取消|。", "Affected by the typhoon, some flights had to be cancelled.", "news", "受 … 影响 wraps the cause: 'affected by …'.")
seg("随着/生活/水平/的/提高|，|人们|对/健康|越来越/重视|。", "As living standards rise, people pay more and more attention to health.", "news", "随着 … 的提高 = 'as … rises'. 对 X 重视 = value X.")
seg("该/市|计划|在/年底/前|建成|三条/地铁/线路|。", "The city plans to finish three subway lines before the end of the year.", "news", "该 = 'this / the said' in formal writing.")
seg("专家|指出|，|目前/市场/需求|偏弱|，|预期|不稳|。", "Experts point out that market demand is currently weak and expectations are unstable.", "news", "偏弱 = 'on the weak side' — the verb of its clause.")
seg("这次/活动|为期/两周|，|共/吸引/了|上万/名/游客|。", "The event runs for two weeks and drew tens of thousands of visitors in total.", "news", "为期 + duration; 上万名 = 'tens of thousands of'.")
seg("相关/部门|表示|，|将/进一步/加强|对/食品/安全/的/监管|。", "The relevant authorities said they will further strengthen oversight of food safety.", "news", "加强 对 X 的监管 = strengthen oversight of X.")
seg("与/去年/同期/相比|，|出境/游/人数|增长/了/三成|。", "Compared with the same period last year, the number of outbound tourists rose 30%.", "news", "与 … 相比 wraps the comparison; 三成 = 30%.")
seg("该/公司|先后/在/北京|、|上海/等/地|开设/了/门店|。", "The company has opened stores one after another in Beijing, Shanghai and elsewhere.", "news", "等地 closes the list of places.")
# xhs
seg("救命|，|这家/火锅|也/太/好吃/了/吧|！", "Help, this hotpot place is way too good!", "xhs")
seg("姐妹们|千万/别/踩雷|，|这家/店|纯纯/智商/税|。", "Sisters, don't fall for this one — this shop is a pure 'IQ tax' (a rip-off for suckers).", "xhs", "踩雷 = step on a landmine (buy a dud).")
seg("本/打工人|周末|只/想/躺平|，|谁/也/别/叫/我|。", "This wage slave just wants to lie flat this weekend — nobody call me.", "xhs")
seg("拍照|超/出片|，|随手/一/拍|就是/大片|。", "Super photogenic — even a casual snap looks like a movie still.", "xhs")
seg("排队/排/了/两个/小时|，|结果|味道|一般般|。", "Queued for two hours, and the taste turned out to be so-so.", "xhs")
seg("人均/八十/左右|，|性价比|还/挺/高/的|。", "About 80 per person — pretty good value for money.", "xhs")
seg("地铁站/出来|右转|，|步行/五/分钟|就/到|。", "Come out of the subway station, turn right, and it's a five-minute walk.", "xhs")
seg("建议|提前/在/小程序/上/预约|，|不然|根本/进不去|。", "Book ahead on the mini-program — otherwise you basically can't get in.", "xhs")
# book
seg("他|望着|窗外|，|久久|没有/说话|。", "He gazed out the window and said nothing for a long while.", "book")
seg("尽管|困难/重重|，|他们|仍然/按时/完成/了|任务|。", "Despite many difficulties, they still finished the task on time.", "book")
# traps: a wrong cut changes the words you see
seg("解放碑|附近|那家/小面|真的/绝|。", "The noodle place near Liberation Monument is seriously amazing.", "trap", "Trap: 解放碑 (the monument) + 附近 (nearby) — not 碑附.")
seg("南京/市|长江/大桥|今天|封闭/维修|。", "Nanjing's Yangtze River Bridge is closed for repairs today.", "trap", "Trap: 南京市 | 长江大桥 — not 南京市长 (the mayor of Nanjing) | 江大桥.")
seg("结婚/的|和|尚未/结婚/的|都/来/了|。", "Both the married and the not-yet-married came.", "trap", "Trap: 和 | 尚未 (not yet) — not 和尚 (monk).")
seg("科学家们|一直/在/研究|生命/的/起源|。", "Scientists have long been studying the origin of life.", "trap", "Trap: 研究 | 生命 — not 研究生 (grad student) | 命.")
seg("很多|发展中/国家|都/面临|这个/问题|。", "Many developing countries face this problem.", "trap", "Trap: 发展中 + 国家 (developing countries) — the 中国 in the middle isn't China.")
seg("美/国会|通过/了|这项/法案|。", "The US Congress passed this bill.", "trap", "Trap: 美 (US) + 国会 (Congress) — not 美国 | 会 ('America will').")
seg("他/说/的|确实|在理|。", "What he said really makes sense.", "trap", "Trap: 说的 | 确实 | 在理 — 的确 is a word too, but not here.")


# ---------- Words in context (leeches) ----------
C = []
def ctx(w, s, opts, en):
    C.append(dict(id="C%02d" % (len(C) + 1), w=w, s=s, opts=opts, en=en))
ctx("经费", "学校今年的科研经费增加了不少。", ["funding", "expenses", "economy", "experience"], "The school's research funding went up quite a bit this year.")
ctx("那会儿", "那会儿我刚到北京，谁也不认识。", ["back then", "in a moment", "over there", "just now"], "Back then I'd just arrived in Beijing and didn't know anyone.")
ctx("场所", "图书馆是安静的学习场所，请勿大声喧哗。", ["place, venue", "occasion", "plaza", "schedule"], "The library is a quiet place for study — please don't make noise.")
ctx("发动", "他们发动全村的人一起修路。", ["mobilize", "sponsor", "dispatch", "persuade"], "They mobilized the whole village to build the road together.")
ctx("前往", "代表团明天将前往上海参加会议。", ["head for", "return from", "move forward", "pass through"], "The delegation will head to Shanghai tomorrow for a conference.")
ctx("特征", "这种鸟最大的特征是红色的尾巴。", ["distinguishing feature", "special offer", "omen", "personality"], "This bird's most distinctive feature is its red tail.")
ctx("当前", "当前最重要的任务是保证安全。", ["at present", "at that time", "in front", "ahead of schedule"], "The most important task right now is ensuring safety.")
ctx("泼", "她一生气，把一杯水泼在了他身上。", ["splash, throw (liquid)", "pour (tea)", "drip", "spray"], "In a fit of anger she threw a glass of water on him.")
ctx("为期", "这次培训为期一周。", ["lasting (a period)", "for the purpose of", "deadline", "periodically"], "This training lasts one week.")
ctx("先后", "他先后在三家公司工作过。", ["one after another", "back and forth", "first of all", "in advance"], "He worked at three companies, one after another.")
ctx("先前", "这里比先前热闹多了。", ["before, previously", "first", "up front", "ahead"], "It's much livelier here than it used to be.")
ctx("创办", "这所学校是他爷爷创办的。", ["found, establish", "manage", "attend", "fund"], "This school was founded by his grandfather.")
ctx("来往", "毕业以后我们就没什么来往了。", ["contact, dealings", "quarrels", "news", "resemblance"], "After graduating we didn't have much contact.")
ctx("踏实", "工作找到了，心里终于踏实了。", ["at ease, settled", "exhausted", "excited", "proud"], "Having found a job, I finally feel at ease.")
ctx("带动", "一个人的热情可以带动整个团队。", ["energize, drive", "manage", "bring along (an item)", "replace"], "One person's enthusiasm can energize a whole team.")
ctx("反而", "雨没停，反而越下越大了。", ["instead, on the contrary", "as a result", "moreover", "after all"], "The rain didn't stop — on the contrary, it got heavier and heavier.")
ctx("格外", "过节的时候，街上格外热闹。", ["especially, unusually", "outside", "in addition", "occasionally"], "During the holidays the streets are especially lively.")
ctx("便利", "新开的地铁给市民出行带来了很大便利。", ["convenience", "cheapness", "profit", "speed"], "The new subway has made getting around much more convenient for residents.")
ctx("化解", "他一句玩笑就化解了尴尬。", ["defuse, resolve", "melt", "explain", "create"], "One joke from him defused the awkwardness.")
ctx("从事", "她大学毕业后一直从事教育工作。", ["work in, be engaged in", "follow", "handle (a matter)", "start a business"], "Since graduating she has worked in education.")
ctx("公布", "考试成绩下周公布。", ["announce, publish", "distribute", "calculate", "review"], "Exam results will be announced next week.")
ctx("承办", "这次比赛由我们学校承办。", ["host, organize (an event)", "pay for", "initiate", "attend"], "Our school is hosting this competition.")
ctx("大致", "我大致明白你的意思了。", ["roughly, more or less", "completely", "finally", "suddenly"], "I more or less understand what you mean.")
ctx("幅度", "今年房价上涨的幅度不大。", ["extent (of change)", "speed", "trend", "price"], "Housing prices didn't rise by much this year.")
ctx("齐全", "这家超市商品很齐全。", ["complete, well-stocked", "neat, tidy", "cheap", "fresh"], "This supermarket has everything.")
ctx("启发", "这本书给了我很大的启发。", ["inspiration, insight", "shock", "encouragement", "entertainment"], "This book gave me a lot of insight.")
ctx("主导", "这个项目由年轻人主导。", ["lead, drive", "sponsor", "oppose", "assist"], "This project is led by young people.")
ctx("恰当", "这个词用在这里不太恰当。", ["appropriate", "polite", "clear", "formal"], "This word isn't quite appropriate here.")
ctx("并非", "事情并非你想的那样。", ["is not (actually)", "is just", "must be", "has never been"], "Things are not how you think.")
ctx("适用", "这个方法不适用于所有人。", ["be applicable", "be comfortable", "be affordable", "be available"], "This method doesn't work for everyone.")
ctx("手续", "办签证的手续很麻烦。", ["procedures, paperwork", "fees", "skills", "handwriting"], "The paperwork for a visa is a hassle.")
ctx("既然", "既然你不想去，那就别去了。", ["since (given that)", "although", "even if", "unless"], "Since you don't want to go, then don't.")
ctx("困扰", "失眠一直困扰着他。", ["trouble, plague", "surround", "delay", "relieve"], "Insomnia has been plaguing him.")
ctx("以往", "今年的夏天比以往更热。", ["previously, in the past", "from now on", "on average", "by contrast"], "This summer is hotter than in past years.")
ctx("心态", "关键是要保持好的心态。", ["mindset, attitude", "figure (body)", "habit", "pace"], "The key is to keep a good mindset.")
ctx("巴不得", "孩子们巴不得天天放假。", ["eagerly wish", "can't afford", "are forced to", "are reluctant to"], "The kids wish every day were a holiday.")
ctx("依次", "请大家依次排队上车。", ["in order, one by one", "quickly", "together", "at once"], "Everyone please line up and board in order.")
ctx("透露", "他向记者透露了一些内幕。", ["reveal, disclose", "deny", "explain", "hide"], "He revealed some inside information to reporters.")
ctx("借鉴", "我们可以借鉴国外的做法。", ["draw on, learn from", "borrow money", "criticize", "copy illegally"], "We can draw on how things are done abroad.")
ctx("费用", "旅行的费用一共是三千块。", ["cost, expenses", "funding", "fare (only bus)", "income"], "The trip cost three thousand yuan in total.")

# ---------- Passages ----------
P = []
def psg(pid, title, reg, paras, gl, en, qs):
    P.append(dict(id=pid, title=title, reg=reg, paras=paras, gl=gl, en=en, qs=qs))

psg("P1", "成都两天一夜｜吃到扶墙出", "xhs", [
 "姐妹们|，|成都|真的|是|美食|天堂|！|第一站|直奔|建设路|，|一条街|从|头|吃到|尾|，|人均|五十|就能|吃撑|。",
 "强烈|推荐|那家|排队|最|长|的|冒菜|，|麻辣|鲜香|。|但是|怕|辣|的|一定|要|说|微辣|，|不然|第二天|你|会|回来|骂|我|的|。",
 "晚上|去|九眼桥|，|酒吧|一条街|，|氛围感|拉满|。|最后|提醒|：|熊猫/基地|一定|要|早上|去|，|中午|熊猫|都|在|睡觉|，|只能|看到|一团|黑白|毛球|🐼"],
 {"扶墙出": ["fú qiáng chū", "come out clinging to the wall (from overeating)"], "直奔": ["zhíbèn", "head straight for"], "建设路": ["Jiànshè Lù", "Jianshe Road (food street)"], "吃撑": ["chī chēng", "eat until stuffed"], "冒菜": ["màocài", "maocai (single-serving Sichuan hotpot)"], "鲜香": ["xiānxiāng", "fresh and fragrant"], "微辣": ["wēilà", "mildly spicy"], "九眼桥": ["Jiǔyǎn Qiáo", "Jiuyan Bridge (bar district)"], "氛围感": ["fēnwéigǎn", "vibe, atmosphere"], "拉满": ["lāmǎn", "maxed out (slang)"], "熊猫基地": ["xióngmāo jīdì", "the Panda Base"], "一团": ["yì tuán", "a ball / lump of"], "毛球": ["máoqiú", "fluffball"], "美食": ["měishí", "good food"], "第一站": ["dì yī zhàn", "first stop"], "一条街": ["yì tiáo jiē", "a (whole) street"], "两天一夜": ["liǎng tiān yí yè", "two days, one night"], "就能": ["jiù néng", "can (already)"], "看到": ["kàndào", "see"]},
 "Chengdu in 2 days, 1 night | Ate until I had to hold the wall\n\nSisters, Chengdu really is a food paradise! First stop, head straight to Jianshe Road and eat your way from one end of the street to the other — about ¥50 a head and you're stuffed.\n\nI strongly recommend the maocai place with the longest queue — numbing, spicy, fresh and fragrant. But if you can't take spice, make sure to say 'mild', or you'll come back the next day to curse me.\n\nAt night go to Jiuyan Bridge, a whole street of bars, the vibe is maxed out. Last tip: you must go to the Panda Base in the morning — at midday the pandas are all asleep and you'll only see black-and-white fluffballs 🐼",
 [{"q": "Why go to the Panda Base in the morning?", "opts": ["The pandas are asleep by midday", "Tickets sell out by noon", "It closes at noon", "It's too hot at noon"]},
  {"q": "What should you do if you can't handle spice?", "opts": ["Ask for 微辣 (mild)", "Skip the 冒菜 place", "Go to 九眼桥 instead", "Eat before the queue starts"]},
  {"q": "Roughly how much per person on 建设路?", "opts": ["About ¥50", "About ¥15", "About ¥200", "About ¥500"]}])

psg("P2", "第一次来上海｜citywalk路线分享", "xhs", [
 "武康路|→|安福路|→|巨鹿路|，|全程|步行|大概|两个/小时|。|梧桐树|下|随便|一拍|都|很|出片|，|难怪|周末|全是|拍照|的|人|。",
 "安福路|上|咖啡店|一家|挨着|一家|，|价格|不|便宜|，|一杯|拿铁|要|四十|多|，|但|坐在|外面|看|路人|也|算是|一种|享受|吧|。",
 "避雷|：|武康/大楼|对面|的|网红|甜品店|，|颜值|在线|，|味道|拉胯|，|别|去|。|交通|：|地铁|10号线|交通/大学|站|出来|走|五/分钟|就|到|。"],
 {"citywalk": ["", "city walk (borrowed English)"], "武康路": ["Wǔkāng Lù", "Wukang Road"], "安福路": ["Ānfú Lù", "Anfu Road"], "巨鹿路": ["Jùlù Lù", "Julu Road"], "全程": ["quánchéng", "the whole route"], "梧桐树": ["wútóngshù", "plane tree"], "出片": ["chūpiàn", "turn out great in photos"], "挨着": ["āizhe", "next to each other"], "拿铁": ["nátiě", "latte"], "坐在": ["zuò zài", "sit at"], "路人": ["lùrén", "passers-by"], "避雷": ["bìléi", "avoid (lit. 'dodge lightning'): a warning"], "武康大楼": ["Wǔkāng Dàlóu", "Wukang Mansion"], "网红": ["wǎnghóng", "internet-famous"], "甜品店": ["tiánpǐndiàn", "dessert shop"], "颜值": ["yánzhí", "looks"], "在线": ["zàixiàn", "on point (slang)"], "拉胯": ["lākuà", "lousy (slang)"], "10号线": ["shí hào xiàn", "Line 10"], "交通大学": ["Jiāotōng Dàxué", "Jiaotong University"], "一拍": ["yì pāi", "one snap"], "全是": ["quán shì", "all, full of"]},
 "First time in Shanghai | Sharing my citywalk route\n\nWukang Rd → Anfu Rd → Julu Rd, about two hours on foot. Any snap under the plane trees looks great — no wonder it's full of people taking photos on weekends.\n\nAnfu Road has one café after another. Not cheap — a latte is over ¥40 — but sitting outside watching passers-by is a kind of treat.\n\nAvoid: the internet-famous dessert shop opposite Wukang Mansion. Looks on point, tastes lousy, don't go. Getting there: Line 10, Jiaotong University station, five-minute walk.",
 [{"q": "What does she say about the dessert shop?", "opts": ["Looks great, tastes bad", "Cheap but crowded", "Tasty but expensive", "Closed on weekends"]},
  {"q": "How much is a latte on 安福路?", "opts": ["Over ¥40", "About ¥14", "Under ¥30", "About ¥100"]},
  {"q": "Why is it crowded on weekends?", "opts": ["It's very photogenic", "The cafés give free coffee", "There are street concerts", "There's a market"]}])

psg("P3", "打工人的周末", "xhs", [
 "说|真的|，|上班|以后|才|明白|，|周末|最|奢侈|的|事|就是|睡到|自然醒|。",
 "以前|总|觉得|躺平|是|浪费|时间|，|现在|反而|觉得|不|内耗|才|是|对|自己|最|好|的|。",
 "朋友|约|我|出去|，|我|嘴上|说|“|好呀|”|，|心里|想|的|是|“|能不能|改天|”|😂|有|同感|的|评论区|扣|1|。"],
 {"打工人": ["dǎgōngrén", "wage slave (self-mocking)"], "奢侈": ["shēchǐ", "luxurious"], "睡到": ["shuì dào", "sleep until"], "自然醒": ["zìrán xǐng", "wake up naturally"], "躺平": ["tǎngpíng", "lie flat (opt out of the rat race)"], "内耗": ["nèihào", "inner drain (overthinking, self-stress)"], "嘴上": ["zuǐ shang", "out loud (lit. on the lips)"], "好呀": ["hǎo ya", "sure!"], "改天": ["gǎitiān", "another day"], "同感": ["tónggǎn", "the same feeling"], "评论区": ["pínglùnqū", "comments section"], "扣": ["kòu", "type (in comments)"]},
 "A wage slave's weekend\n\nHonestly, only after starting work did I realize that the most luxurious thing on a weekend is sleeping until you wake up naturally.\n\nI used to think lying flat was a waste of time. Now I actually think not draining myself is the best thing I can do for myself.\n\nWhen friends ask me out I say 'sure!' out loud, while thinking 'can we do another day?' 😂 If you feel the same, type 1 in the comments.",
 [{"q": "What is the most luxurious weekend activity for her?", "opts": ["Sleeping until she wakes naturally", "Going out with friends", "Shopping", "Working overtime"]},
  {"q": "How has her view of 躺平 changed?", "opts": ["She used to see it as wasted time; now she values it", "She used to like it; now she hates it", "She has never liked it", "Her friends talked her into it"]},
  {"q": "What does she really think when friends invite her out?", "opts": ["Can we do another day?", "Great, let's go!", "Who else is coming?", "Where are we going?"]}])

psg("P4", "国庆假期铁路客流创新高", "news", [
 "据|国家/铁路局|消息|，|今年|国庆/假期|期间|，|全国|铁路|累计|发送|旅客|超过|一亿|人次|，|同比|增长|8%|。|其中|，|高铁|出行|占比|进一步|提高|。",
 "业内/人士|分析|，|随着|高铁|网络|不断|完善|，|“|周末|游|”|和|“|跨省|游|”|日益|受到|年轻人|的|青睐|。",
 "但|与此同时|，|热门|线路|“|一票难求|”|的|问题|依然|存在|。"],
 {"铁路局": ["tiělùjú", "railway administration"], "国家铁路局": ["Guójiā Tiělùjú", "National Railway Administration"], "国庆假期": ["Guóqìng jiàqī", "National Day holiday"], "累计": ["lěijì", "cumulatively"], "发送": ["fāsòng", "carry, dispatch (passengers)"], "人次": ["réncì", "person-trips"], "同比": ["tóngbǐ", "year on year"], "占比": ["zhànbǐ", "share, proportion"], "业内人士": ["yènèi rénshì", "industry insiders"], "跨省": ["kuàshěng", "cross-province"], "日益": ["rìyì", "increasingly"], "青睐": ["qīnglài", "favor"], "与此同时": ["yǔ cǐ tóngshí", "at the same time"], "一票难求": ["yí piào nán qiú", "a ticket is hard to come by"], "一亿": ["yí yì", "100 million"], "高铁": ["gāotiě", "high-speed rail"]},
 "Rail passenger numbers hit a new high over the National Day holiday\n\nAccording to the National Railway Administration, during this year's National Day holiday the national railways carried more than 100 million passenger trips in total, up 8% year on year. Of these, the share of high-speed rail travel rose further.\n\nIndustry insiders say that as the high-speed network keeps improving, 'weekend trips' and 'cross-province trips' are increasingly popular with young people.\n\nAt the same time, the problem of tickets on popular routes being 'impossible to get' remains.\n\n(Practice text — figures are illustrative.)",
 [{"q": "What changed compared with last year?", "opts": ["Passenger trips rose 8%", "Ticket prices rose 8%", "High-speed rail use fell", "Trips fell below 100 million"]},
  {"q": "What is increasingly popular with young people?", "opts": ["Weekend and cross-province trips", "Overnight sleeper trains", "Driving holidays", "Trips abroad"]},
  {"q": "What problem remains?", "opts": ["Tickets on popular routes are hard to get", "Trains are often delayed", "Stations are too far from cities", "Fares are too high"]}])

psg("P5", "服务消费成新增长点", "news", [
 "商务部|数据|显示|，|前|三|季度|，|全国|服务/零售额|同比|增长|6.5%|，|增速|快于|商品/零售额|。",
 "专家|表示|，|文旅|、|餐饮|和|体育|等|领域|的|消费|潜力|正在|释放|，|服务|消费|有望|成为|拉动|内需|的|新|引擎|。",
 "不过|，|也|有|分析|认为|，|部分|居民|收入|预期|偏弱|，|消费|意愿|仍|有待|提升|。"],
 {"商务部": ["Shāngwùbù", "Ministry of Commerce"], "零售额": ["língshòu'é", "retail sales"], "服务零售额": ["fúwù língshòu'é", "services retail sales"], "商品零售额": ["shāngpǐn língshòu'é", "goods retail sales"], "增速": ["zēngsù", "growth rate"], "快于": ["kuài yú", "faster than"], "文旅": ["wénlǚ", "culture and tourism"], "释放": ["shìfàng", "release"], "有望": ["yǒuwàng", "is expected to, looks set to"], "拉动": ["lādòng", "pull, drive"], "内需": ["nèixū", "domestic demand"], "引擎": ["yǐnqíng", "engine"], "意愿": ["yìyuàn", "willingness"], "有待": ["yǒudài", "remains to be (done)"], "偏弱": ["piānruò", "on the weak side"], "季度": ["jìdù", "quarter"]},
 "Service consumption becomes a new growth driver\n\nMinistry of Commerce data show that in the first three quarters, national services retail sales grew 6.5% year on year, faster than goods retail sales.\n\nExperts say consumption potential in culture & tourism, food & beverage, sports and other areas is being released, and service consumption is expected to become a new engine driving domestic demand.\n\nHowever, some analysts believe that some residents' income expectations are weak, and willingness to spend still needs to improve.\n\n(Practice text — figures are illustrative.)",
 [{"q": "Which grew faster?", "opts": ["Services retail sales", "Goods retail sales", "They grew equally", "Neither grew"]},
  {"q": "What may become a new engine of domestic demand?", "opts": ["Service consumption", "Exports", "Real estate", "Manufacturing"]},
  {"q": "What concern is raised?", "opts": ["Some residents' income expectations are weak", "Prices are rising too fast", "Too many people are travelling", "Sports facilities are lacking"]}])

psg("P6", "第一次出远门", "book", [
 "那年|夏天|，|我|第一次|一个人|坐|火车|去|外地|。|车厢|里|很|挤|，|空气|里|混着|泡面|和|汗水|的|味道|。",
 "对面|坐着|一位|老人|，|一路上|一句话|也|没|说|，|只是|望着|窗外|。",
 "快|到站|的|时候|，|他|忽然|转过头来|，|笑着|问|我|：|“|第一次|出远门|吧|？|”|我|愣|了|一下|，|不知道|他|是|怎么|看出来|的|。"],
 {"外地": ["wàidì", "another part of the country"], "车厢": ["chēxiāng", "train carriage"], "混着": ["hùnzhe", "mixed with"], "泡面": ["pàomiàn", "instant noodles"], "汗水": ["hànshuǐ", "sweat"], "坐着": ["zuòzhe", "sitting"], "一路上": ["yílù shang", "the whole way"], "一句话": ["yí jù huà", "a single word"], "望着": ["wàngzhe", "gazing at"], "到站": ["dàozhàn", "arrive at the station"], "转过头来": ["zhuǎn guò tóu lái", "turn one's head (toward me)"], "出远门": ["chū yuǎnmén", "travel far from home"], "愣": ["lèng", "be taken aback"], "看出来": ["kàn chūlái", "tell (by looking)"], "笑着": ["xiàozhe", "smiling"]},
 "My first long trip\n\nThat summer I took a train on my own to another part of the country for the first time. The carriage was packed, the air a mix of instant noodles and sweat.\n\nAn old man sat across from me. He didn't say a word the whole way, just gazed out the window.\n\nAs we were about to arrive, he suddenly turned his head, smiled and asked me, 'First time travelling far from home, huh?' I was taken aback for a moment, not knowing how he could tell.",
 [{"q": "What did the old man do for most of the trip?", "opts": ["Gazed out the window in silence", "Chatted with the narrator", "Slept", "Ate instant noodles"]},
  {"q": "What did he ask near the end?", "opts": ["Whether it was the narrator's first time far from home", "Where the narrator was going", "Whether the narrator was hungry", "What time it was"]},
  {"q": "How did the narrator react?", "opts": ["Was taken aback, wondering how he could tell", "Laughed it off", "Ignored him", "Changed seats"]}])

# ---------- Placement (adaptive: each section is a list of levels, easiest first) ----------
def cx(w, s, opts, en): return dict(w=w, s=s, opts=opts, en=en)
def nw(s, q, opts): return dict(s=s, q=q, opts=opts)
def pk(en, opts, why): return dict(en=en, opts=opts, why=why)
PL = dict(
 ctx=[
  [cx("涉及", "这起案件涉及多名官员。", ["involve", "accuse", "protect", "investigate"], "This case involves several officials."),
   cx("被迫", "由于大雪，比赛被迫推迟。", ["was forced to", "was planned to", "was glad to", "was about to"], "Because of heavy snow, the match had to be postponed."),
   cx("开设", "学校今年新开设了三门课程。", ["offer, set up", "cancel", "complete", "postpone"], "The school added three new courses this year.")],
  [cx("显著", "治疗三个月后，病情有了显著改善。", ["marked, notable", "slight", "gradual", "unexpected"], "After three months of treatment there was a marked improvement."),
   cx("截至", "截至上周五，报名人数已超过两千。", ["as of (up to)", "starting from", "with a deadline of", "compared with"], "As of last Friday, more than 2,000 people had signed up."),
   cx("意愿", "双方都表达了合作的意愿。", ["willingness", "ability", "conditions", "agreement"], "Both sides expressed willingness to cooperate.")],
  [cx("不慎", "他下楼时不慎摔倒，扭伤了脚。", ["accidentally, carelessly", "unwillingly", "deliberately", "hurriedly"], "He slipped going downstairs and sprained his ankle."),
   cx("波及", "这场风暴波及了周边五个省份。", ["spread to, affect", "bypass", "originate in", "warn"], "The storm affected five neighbouring provinces."),
   cx("不惜", "为了赢得比赛，他们不惜一切代价。", ["be willing to (spend)", "cannot afford", "refuse to pay", "regret"], "They'd pay any price to win."),
   cx("趁着", "趁着周末天气好，我们去爬了山。", ["taking advantage of", "in spite of", "because of", "right after"], "We made the most of the good weekend weather and went hiking.")],
  [cx("以免", "请保管好随身物品，以免丢失。", ["so as to avoid", "in order to", "in case of", "because of"], "Keep your belongings with you so they don't get lost."),
   cx("有所", "今年的销量比去年有所下降。", ["somewhat", "sharply", "not at all", "finally"], "Sales this year fell somewhat compared with last year."),
   cx("一度", "这家店一度非常火，后来慢慢没人了。", ["at one time", "once a year", "by one degree", "for a moment"], "This shop was hugely popular at one point, then slowly emptied out."),
   cx("鉴于", "鉴于天气原因，航班延误两小时。", ["in view of", "despite", "regardless of", "apart from"], "Owing to the weather, the flight is delayed two hours.")],
  [cx("不禁", "看到这张老照片，她不禁流下了眼泪。", ["couldn't help but", "was forbidden to", "refused to", "pretended to"], "Seeing the old photo, she couldn't hold back tears."),
   cx("未免", "为这点小事生气，未免太小气了吧。", ["rather, a bit too", "not necessarily", "definitely not", "unless"], "Getting angry over something so small is a bit petty."),
   cx("无从", "资料都丢了，现在无从查起。", ["have no way to", "have no reason to", "have no need to", "not yet able to"], "The records are all lost; there's no way to look into it now."),
   cx("势必", "价格上涨势必影响销量。", ["is bound to", "might possibly", "is unlikely to", "is meant to"], "Rising prices are bound to hurt sales.")]],
 news=[
  [nw("受强降雨影响，多条高速公路临时封闭，预计明日恢复通行。", "What is expected to happen tomorrow?", ["The highways reopen", "More heavy rain falls", "More highways close", "Repairs begin"]),
   nw("该市将对年收入低于五万元的家庭给予住房补贴。", "Who gets the housing subsidy?", ["Families earning under ¥50k a year", "Families of five or more", "Every family in the city", "Families who bought a home this year"])],
  [nw("据统计，截至九月底，全市共有新能源汽车四十余万辆。", "What does the sentence report?", ["By the end of September the city had over 400,000 new-energy vehicles", "400,000 new-energy vehicles were sold in September", "The city plans to have 400,000 new-energy vehicles by September", "New-energy vehicles fell by 400,000"]),
   nw("受访者中，近六成表示今年不打算出国旅游。", "What did nearly 60% of respondents say?", ["They don't plan to travel abroad this year", "They plan to travel abroad this year", "They travelled abroad last year", "They haven't decided yet"])],
  [nw("该政策实施以来，城镇新增就业人数较去年同期有所增加。", "What has happened since the policy took effect?", ["New urban jobs rose somewhat compared with the same period last year", "Urban employment fell slightly", "New urban jobs doubled", "Rural employment rose"]),
   nw("专家提醒，近期气温波动较大，老人和儿童应注意防寒保暖，以免感冒。", "Why should the elderly and children keep warm?", ["To avoid catching colds while temperatures swing", "A cold wave arrives tomorrow", "Heating will be cut off", "To save energy"])],
  [nw("尽管出口增速有所放缓，但贸易顺差仍创下历史新高。", "Which statement matches?", ["Export growth slowed, yet the trade surplus hit a record high", "Exports fell and the surplus shrank", "Exports grew faster and the surplus hit a record", "The surplus fell to a historic low"]),
   nw("此次调整并非意味着政策方向发生改变，而是对现有措施的进一步完善。", "What does the adjustment mean?", ["It refines existing measures; the direction hasn't changed", "It reverses the policy's direction", "It ends the current measures", "Its purpose hasn't been announced"])],
  [nw("鉴于部分地区仍存在安全隐患，有关部门决定暂缓开放，具体时间另行通知。", "What was decided?", ["Reopening is postponed; the date will be announced later", "The areas reopen immediately", "The areas are closed permanently", "The reopening date has been announced"]),
   nw("业内普遍认为，在需求疲软、成本高企的双重压力下，行业洗牌恐难避免。", "What do insiders broadly believe?", ["A shake-up of the industry is probably unavoidable", "The industry will recover soon", "Costs are about to fall", "Demand remains strong"])]],
 pick=[
  [pk("I almost missed the train.", ["我差点儿没赶上火车。", "我几乎错失了火车。", "我差不多错过火车了。"], "差点儿没赶上 is the everyday way; 错失 is for opportunities."),
   pk("Is there a window seat?", ["有靠窗的座位吗？", "有一个座位在窗边吗？", "有座位靠近窗户的吗？"], "Description before 的 + noun: 靠窗的座位.")],
  [pk("It took me ages to find this place.", ["我找了半天才找到这儿。", "我花了很长时间找到这个地方。", "找到这个地方花了我很久。"], "找了半天才找到 = searched forever before finally finding. The others mirror English structure."),
   pk("Don't worry, I'll handle it.", ["别担心，交给我吧。", "不要担心，我会处理它。", "别担心，我将处理。"], "交给我吧 = 'leave it to me'. 处理它 is English-shaped; 将 is bookish."),
   pk("He's not as tall as his brother.", ["他没有他哥哥高。", "他比他哥哥不高。", "他不比他哥哥那么高。"], "A 没有 B 高 = A isn't as tall as B. 比…不高 is ungrammatical.")],
  [pk("What do you think of this plan?", ["你觉得这个方案怎么样？", "你怎么想这个方案？", "你对这个方案怎么认为？"], "觉得…怎么样 is the natural frame; 怎么想 X is English-shaped."),
   pk("I'm full, I can't eat any more.", ["我吃饱了，吃不下了。", "我饱了，我不能吃更多了。", "我很饱，吃不了更多了。"], "吃不下 = can't fit any more in. 更多 for 'any more' is English-shaped."),
   pk("I've been learning Chinese for three years.", ["我学中文学了三年了。", "我已经学习了中文三年。", "我学习中文有三年。"], "Verb repeated before the duration: 学中文学了三年了.")],
  [pk("It's not worth getting angry over such a small thing.", ["为这点小事生气，不值得。", "因为这么小的事生气是不值得的。", "生气关于这么小的事情不值。"], "为这点小事 is the natural chunk; the second is grammatical but wordy."),
   pk("He's always been like that — don't take it personally.", ["他一向这样，你别往心里去。", "他总是那样，不要个人地接受它。", "他一直都是这样，别个人化。"], "别往心里去 = don't take it to heart."),
   pk("I only realized after I got home that I'd left my phone behind.", ["到家才发现手机落下了。", "我回到家以后我意识到我留下了手机。", "我到家之后才意识到我把手机忘了在那里。"], "才发现 + 落下了 (left behind). Chinese drops the repeated 我.")],
  [pk("Since we're here anyway, we may as well take a look.", ["来都来了，不如进去看看。", "既然我们已经在这里了，我们可以看一下。", "我们已经到了，所以看看吧。"], "来都来了 + 不如 = 'we're here anyway, might as well'. The second is grammatical but stiff."),
   pk("That's easier said than done.", ["说起来容易，做起来难。", "说比做容易。", "这个说起来比做起来更容易。"], "The set phrase: 说起来容易，做起来难."),
   pk("I couldn't get a word in.", ["我根本插不上话。", "我不能说一个字。", "我没有办法说进去一句话。"], "插不上话 = couldn't get a word in.")]],
 seg=[["S13", "S16", "S15"], ["S02", "S08", "S09"], ["S21", "S23", "S24", "S26", "S27"]],
 write=["L01", "L03", "L08", "L42", "L30"],
 read="P1")


exec(open('v3content.py').read())
exec(open('sen.py').read())
for x in N:
    assert len(x['opts']) == 4 and x['frames'], x['id']

# ---------- Validation ----------
ids = {x["id"] for x in L}
for x in L:
    assert x["zh"].count("[") == 1, x["id"]
    assert len(x["cx"]) == 3 and len(x["bad"]) >= 2, x["id"]
for k in PL["write"]:
    assert k in ids, k
sids = {x["id"] for x in S}
for lv in PL["seg"]:
    for k in lv: assert k in sids, k
for lv in PL["ctx"]:
    for x in lv: assert x["w"] in x["s"], x["w"]
for x in S:
    assert "[" not in x["s"]
for x in C:
    assert x["w"] in x["s"], x["w"]
for p in P:
    assert len(p["qs"]) == 3, p["id"]
    for q in p["qs"]: assert len(q["opts"]) == 4, (p["id"], q["q"])
    for para in p["paras"]: assert "||" not in para, p["id"]
assert len({p["id"] for p in P}) == len(P)
for pid in PL["read"]: assert pid in {p["id"] for p in P}
for lv in PL["news"]:
    for x in lv: assert len(x["opts"]) == 4, x["s"]
for x in C: assert len(x["opts"]) == 4, x["w"]
out = dict(version=1, ladder=L, seg=S, ctx=C, sen=N, passages=P, placement=PL)
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, separators=(",", ":"))
print(len(L), "ladder", len(S), "seg", len(C), "ctx", len(P), "passages")
