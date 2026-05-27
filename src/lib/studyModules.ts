import { masterlifeDailyDays } from './generated/masterlifeDailyDays';

export interface StudyModuleDay {
  day: number;
  dayInWeek?: number;
  phase: string;
  week: number;
  title: string;
  scripture: string;
  focus: string;
  stillnessPrompt: string;
  storyPrompt: string;
  stepsPrompts: string[];
  actsPrayer: string[];
  accountability: string;
  leaderNote: string;
  partnerNote: string;
  sourceBook?: string;
  sourceWeekTitle?: string;
  memoryVerse?: string;
  dailyReading?: string;
  sourceSection?: string;
  sourceExcerpt?: string;
}

export interface StudyModule {
  id: string;
  title: string;
  shortTitle: string;
  tradition: string;
  cadence: string;
  totalDays: number;
  daysPerWeek?: number;
  summary: string;
  sourceSummary: string;
  phases: Array<{
    label: string;
    weeks: number[];
    emphasis: string;
  }>;
  days: StudyModuleDay[];
}

interface WeekTheme {
  phase: string;
  title: string;
  scripture: string;
  focus: string;
  stillnessPrompt: string;
  storyPrompt: string;
  stepsPrompts: string[];
  actsPrayer: string[];
  accountability: string;
  leaderNote: string;
  partnerNote: string;
}

const BIBLE_STUDY_THEMES: WeekTheme[] = [
  {
    phase: 'Week 1 · Observation in the Gospels',
    title: 'See What the Passage Actually Says',
    scripture: 'Mark 2:1-12',
    focus: 'Before we rush to application, we slow down and observe the text carefully, letting the passage set the agenda.',
    stillnessPrompt: 'Ask, “Lord, help me notice what is really here instead of only what I expect to find.”',
    storyPrompt: 'Walk through the scene in Mark. Who is present, what is happening, and where do you feel the tension building?',
    stepsPrompts: [
      'Scripture truth: What repeated words, actions, or surprises stand out?',
      'Truth for me: What do I usually skip over when I read too quickly?',
      'Examination: Where do assumptions keep me from seeing the text clearly?',
      'Prayer response: Ask for patience and attentiveness in reading.',
      'Step today: Write down three observations before you write one interpretation.',
    ],
    actsPrayer: ['Adoration for God who speaks clearly', 'Confession of hurried reading', 'Thanksgiving for the text before us', 'Supplication for eyes to see'],
    accountability: 'What three observations will you insist on making before moving to meaning?',
    leaderNote: 'Train the habit of observation first. Good interpretation usually begins with better noticing.',
    partnerNote: 'I want to stop skipping over details that actually carry the weight of the passage.',
  },
  {
    phase: 'Week 2 · Interpretation in the Psalms',
    title: 'Understand the Author’s Burden',
    scripture: 'Psalm 27:1-8',
    focus: 'Interpretation asks what the inspired author is saying and why that emphasis matters in context.',
    stillnessPrompt: 'Pray, “Lord, help me hear the heart of this psalm, not just the words on the page.”',
    storyPrompt: 'Listen to David move between confidence and longing. What is he clinging to, and what is he asking for?',
    stepsPrompts: [
      'Scripture truth: What central claim is this passage making about God?',
      'Truth for me: How does the passage move from fear toward trust?',
      'Examination: Where am I flattening poetry into slogans?',
      'Prayer response: What line from the psalm becomes prayer for me today?',
      'Step today: Summarize the passage’s main idea in one sentence.',
    ],
    actsPrayer: ['Adoration for God our light', 'Confession of shallow reading', 'Thanksgiving for biblical honesty', 'Supplication for understanding'],
    accountability: 'How would you explain the main idea of this psalm in one sentence?',
    leaderNote: 'Push toward authorial intent and literary sensitivity. Poetry needs both reverence and patience.',
    partnerNote: 'I want to hear the pulse of the passage, not just collect familiar lines.',
  },
  {
    phase: 'Week 3 · Christ at the Center',
    title: 'Trace the Passage to Jesus',
    scripture: 'Luke 24:25-32',
    focus: 'Christian Bible study is not complete until we ask how the text finds its fulfillment and clarity in Christ.',
    stillnessPrompt: 'Pray, “Jesus, open the Scriptures to me and open me to You.”',
    storyPrompt: 'Walk the Emmaus road. What changes when Jesus starts connecting the Scriptures to Himself?',
    stepsPrompts: [
      'Scripture truth: What does this passage teach about reading the Bible through Christ?',
      'Truth for me: Where do I settle for moral lessons instead of meeting Jesus?',
      'Examination: How might this passage be pointing beyond itself?',
      'Prayer response: Ask Christ to make your heart burn with holy clarity.',
      'Step today: Name one way the passage reveals Jesus’ character or work.',
    ],
    actsPrayer: ['Adoration for Christ revealed in Scripture', 'Confession of Christless reading', 'Thanksgiving for the gospel', 'Supplication for burning hearts'],
    accountability: 'How did today’s passage bring you to Jesus rather than only to yourself?',
    leaderNote: 'Keep Christ-centered reading disciplined, not fanciful. Let the text lead the connection.',
    partnerNote: 'I want my study to end in worship, not just better notes.',
  },
  {
    phase: 'Week 4 · Doctrine in the Epistles',
    title: 'Hold the Truth Firmly',
    scripture: 'Ephesians 2:1-10',
    focus: 'Bible study should strengthen doctrinal clarity so grace becomes more than a feeling; it becomes understood truth.',
    stillnessPrompt: 'Ask, “Lord, steady my mind under Your grace and truth.”',
    storyPrompt: 'Follow Paul’s movement from death to mercy to new creation. Where does the gospel turn the corner?',
    stepsPrompts: [
      'Scripture truth: What doctrines are central in this passage?',
      'Truth for me: Where does the gospel confront my instincts to earn?',
      'Examination: Which part of the passage do I resist or minimize?',
      'Prayer response: Thank God specifically for His mercy and workmanship.',
      'Step today: Write one doctrinal truth from the text and why it matters.',
    ],
    actsPrayer: ['Adoration for rich mercy', 'Confession of self-salvation instincts', 'Thanksgiving for grace', 'Supplication for rootedness in truth'],
    accountability: 'What gospel truth from this text do you need to preach back to yourself today?',
    leaderNote: 'Doctrine is part of discipleship. Let it become sturdy, warm, and usable.',
    partnerNote: 'I need truth that can carry weight when my feelings wobble.',
  },
  {
    phase: 'Week 5 · Application and Obedience',
    title: 'Move from Insight to Practice',
    scripture: 'James 1:19-25',
    focus: 'Bible study is incomplete if it ends in admiration without obedience.',
    stillnessPrompt: 'Pray, “Lord, do not let me walk away unchanged from what You show me.”',
    storyPrompt: 'Look at James’ mirror image. What does it expose about hearing versus doing?',
    stepsPrompts: [
      'Scripture truth: What does obedience look like in this passage?',
      'Truth for me: What specific response is this text asking from me?',
      'Examination: Where do I enjoy conviction more than change?',
      'Prayer response: Ask for courage to obey promptly and concretely.',
      'Step today: Define one action you will take because of this passage.',
    ],
    actsPrayer: ['Adoration for God’s perfect law', 'Confession of passive hearing', 'Thanksgiving for conviction', 'Supplication for obedient action'],
    accountability: 'What will you do today so this passage becomes obedience instead of just insight?',
    leaderNote: 'Keep application specific, measurable, and tied tightly to the text.',
    partnerNote: 'I want the Bible to change my calendar, not only my thoughts.',
  },
  {
    phase: 'Week 6 · Whole-Bible Mission',
    title: 'Read with a Sent Life',
    scripture: 'Isaiah 6:1-8',
    focus: 'Serious Bible study should widen our lives toward holiness, worship, and the mission of God.',
    stillnessPrompt: 'Pray, “Lord, let Your holiness reorder my heart and my availability.”',
    storyPrompt: 'Stand in Isaiah’s vision. What happens from revelation, to cleansing, to sending?',
    stepsPrompts: [
      'Scripture truth: What pattern of worship and mission does this passage reveal?',
      'Truth for me: Where is God asking for surrender, cleansing, or availability?',
      'Examination: What keeps me from saying, “Here am I. Send me.”?',
      'Prayer response: Offer yourself afresh to God’s purposes.',
      'Step today: Identify one way today’s study should shape how you live sent.',
    ],
    actsPrayer: ['Adoration for God’s holiness', 'Confession of reluctance', 'Thanksgiving for cleansing grace', 'Supplication for readiness and mission'],
    accountability: 'What would availability to God look like in one concrete act this week?',
    leaderNote: 'Good study should end in worship and availability, not self-containment.',
    partnerNote: 'I want Scripture to enlarge my life toward God’s mission.',
  },
];

export const WEEK_THEMES: WeekTheme[] = [
  {
    phase: "Book 1 · The Disciple's Cross · Spend Time with the Master",
    title: 'Abide Before You Perform',
    scripture: 'John 15:1-11',
    focus: 'Life with Jesus begins in abiding, not in proving yourself.',
    stillnessPrompt: 'Sit quietly for two minutes and ask, “Jesus, where have I been doing for You instead of being with You?”',
    storyPrompt: 'In the vineyard scene, where do you see life flowing from the Vine, and where do you feel the temptation to live as a disconnected branch?',
    stepsPrompts: [
      'Scripture truth: What does this passage say about remaining in Christ?',
      'Truth for me: What does abiding look like in my actual schedule today?',
      'Examination: Where am I running on spiritual fumes?',
      'Prayer response: What do I need to receive before I try to produce anything?',
      'Step today: What is one concrete way I will spend time with Jesus today?',
    ],
    actsPrayer: ['Adoration for Jesus the true Vine', 'Confession of self-reliance', 'Thanksgiving for His nearness', 'Supplication for a daily abiding rhythm'],
    accountability: 'What time will you meet with Jesus today, and what will make it difficult to keep that appointment?',
    leaderNote: 'Keep the focus on relationship before duty. MasterLife begins with communion, not spiritual pressure.',
    partnerNote: 'I need the reminder too: fruit is downstream from fellowship.',
  },
  {
    phase: "Book 1 · The Disciple's Cross · Live in the Word",
    title: 'Let the Word Read You',
    scripture: 'Psalm 119:9-16',
    focus: 'Scripture is not only information to master but truth that searches and shapes us.',
    stillnessPrompt: 'Breathe slowly and ask, “Lord, make me teachable under Your Word.”',
    storyPrompt: 'Picture the psalmist treasuring God’s words. What does delight look like here, and what keeps you from that kind of attentiveness?',
    stepsPrompts: [
      'Scripture truth: What does the passage say the Word does in a person?',
      'Truth for me: Where do I treat Bible reading as a task instead of a meeting place?',
      'Examination: What competing voices are louder than Scripture right now?',
      'Prayer response: What verse from today do I need to carry with me?',
      'Step today: How will I return to this passage later today?',
    ],
    actsPrayer: ['Adoration for God who speaks', 'Confession of distracted reading', 'Thanksgiving for truth that endures', 'Supplication for hunger and retention'],
    accountability: 'What verse are you carrying today, and how will you come back to it before bedtime?',
    leaderNote: 'Press toward meditation and obedience, not just completion.',
    partnerNote: 'I want the Word to move from the page into reflex and memory.',
  },
  {
    phase: "Book 1 · The Disciple's Cross · Pray in Faith",
    title: 'Pray Like God Hears',
    scripture: 'Matthew 6:5-13',
    focus: 'Prayer is honest communion with the Father, not performance for an audience.',
    stillnessPrompt: 'Settle your heart with the words, “Father, I am here with You.”',
    storyPrompt: 'Stand inside the room Jesus describes. What changes when prayer is directed toward the Father instead of toward appearances?',
    stepsPrompts: [
      'Scripture truth: What kind of prayer does Jesus commend?',
      'Truth for me: What anxieties or needs am I actually bringing to the Father?',
      'Examination: Where has my prayer life become thin or performative?',
      'Prayer response: Which line of the Lord’s Prayer do I most need today?',
      'Step today: What specific prayer appointment will I keep today?',
    ],
    actsPrayer: ['Adoration of the Father', 'Confession of prayerlessness', 'Thanksgiving for access through Christ', 'Supplication for daily bread, forgiveness, and guidance'],
    accountability: 'What will faithful prayer look like for the next ten minutes, not just in theory but in practice?',
    leaderNote: 'Keep prayer concrete and personal; move them toward actual time with God.',
    partnerNote: 'I know how easy it is to talk about prayer instead of praying.',
  },
  {
    phase: "Book 1 · The Disciple's Cross · Fellowship with Believers",
    title: 'Grow in Company',
    scripture: 'Acts 2:42-47',
    focus: 'Discipleship matures in shared life, not in private spirituality alone.',
    stillnessPrompt: 'Ask, “Lord, where do I need to receive or offer fellowship instead of isolating?”',
    storyPrompt: 'Imagine the early church gathering with gladness and sincerity. What practices make that community alive?',
    stepsPrompts: [
      'Scripture truth: What rhythms shaped the early believers?',
      'Truth for me: Where do I need people more than I admit?',
      'Examination: How have hurt, pride, or busyness pushed me toward isolation?',
      'Prayer response: Who might God be calling me to encourage today?',
      'Step today: What is one concrete relational move I can make today?',
    ],
    actsPrayer: ['Adoration for Christ’s body', 'Confession of isolation and guardedness', 'Thanksgiving for the church', 'Supplication for unity, courage, and mutual care'],
    accountability: 'Who is one believer you will actually reach out to today?',
    leaderNote: 'Fellowship is more than attendance. Draw them toward shared life and mutual responsibility.',
    partnerNote: 'I need others to know me well enough to help me keep following Jesus.',
  },
  {
    phase: "Book 1 · The Disciple's Cross · Witness to the World",
    title: 'Speak of Jesus Naturally',
    scripture: 'Acts 1:8',
    focus: 'Witnessing grows out of Spirit-filled nearness to Jesus, not out of pressure to impress.',
    stillnessPrompt: 'Pray, “Holy Spirit, make me available to You today.”',
    storyPrompt: 'Stand with the disciples hearing Jesus promise power. What kind of boldness is He describing?',
    stepsPrompts: [
      'Scripture truth: Who gives power for witness?',
      'Truth for me: Where do fear and self-consciousness keep me silent?',
      'Examination: Who around me may already be more open than I assume?',
      'Prayer response: How can I pray for one person by name today?',
      'Step today: What one faithful witness step can I take today?',
    ],
    actsPrayer: ['Adoration for Jesus the risen Lord', 'Confession of fear', 'Thanksgiving for the Spirit’s help', 'Supplication for open doors and holy courage'],
    accountability: 'Who is your one person today, and what will you do if the moment opens?',
    leaderNote: 'Encourage simple faithfulness over salesmanship.',
    partnerNote: 'I want witness to feel like overflow, not theatre.',
  },
  {
    phase: "Book 1 · The Disciple's Cross · Minister to Others",
    title: 'Love That Gets Practical',
    scripture: 'Mark 10:42-45',
    focus: 'Following Jesus means moving toward people in service, not jockeying for status.',
    stillnessPrompt: 'Offer your availability: “Jesus, show me where love needs hands today.”',
    storyPrompt: 'Watch Jesus redefine greatness. What does His model expose about our usual instincts?',
    stepsPrompts: [
      'Scripture truth: How does Jesus describe greatness?',
      'Truth for me: Where am I tempted to be seen rather than to serve?',
      'Examination: Who near me needs practical love this week?',
      'Prayer response: What attitude needs to soften in me?',
      'Step today: What act of service will I offer today?',
    ],
    actsPrayer: ['Adoration for Christ the Servant King', 'Confession of selfish ambition', 'Thanksgiving for being served by grace', 'Supplication for humble love in action'],
    accountability: 'What specific act of service will you complete today, and who will know you did it?',
    leaderNote: 'Move service out of abstraction and into calendar-level obedience.',
    partnerNote: 'I need love to become visible in my schedule, not just in my intentions.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Live in the Spirit",
    title: 'Walk by the Spirit',
    scripture: 'Galatians 5:16-26',
    focus: 'Christian character is Spirit-grown, not self-manufactured.',
    stillnessPrompt: 'Pray, “Holy Spirit, show me where flesh is loud and where You are inviting surrender.”',
    storyPrompt: 'Notice the contrast between flesh and Spirit. Which fruit feels most alive, and which battle feels nearest today?',
    stepsPrompts: [
      'Scripture truth: What does walking by the Spirit produce?',
      'Truth for me: Which desire most needs the Spirit’s governance today?',
      'Examination: Where have I relied on personality instead of transformation?',
      'Prayer response: What fruit am I asking God to grow in me this week?',
      'Step today: What response would show dependence on the Spirit today?',
    ],
    actsPrayer: ['Adoration for the Spirit’s presence', 'Confession of fleshly reactions', 'Thanksgiving for inner renewal', 'Supplication for fruit and surrender'],
    accountability: 'Which fruit of the Spirit are you watching for today?',
    leaderNote: 'Character formation is gradual but real. Keep them attentive to fruit and dependence.',
    partnerNote: 'I need more than behavior management. I need transformation.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Discern God’s Will",
    title: 'Choose the Spirit’s Way',
    scripture: 'Romans 12:1-2',
    focus: 'Discernment grows where minds are renewed and bodies are yielded.',
    stillnessPrompt: 'Pray, “Lord, renew my mind where I have been shaped by the world.”',
    storyPrompt: 'Picture yourself on the altar Paul describes. What gets offered, and what resists being offered?',
    stepsPrompts: [
      'Scripture truth: How does discernment develop?',
      'Truth for me: What pattern of this world has been discipling me?',
      'Examination: Where do I need to stop conforming and start yielding?',
      'Prayer response: What decision needs renewed thinking today?',
      'Step today: What change would reflect a renewed mind today?',
    ],
    actsPrayer: ['Adoration for God’s will', 'Confession of conformity', 'Thanksgiving for transformation', 'Supplication for renewed thinking'],
    accountability: 'What worldly pattern are you resisting this week?',
    leaderNote: 'Keep discernment practical and embodied.',
    partnerNote: 'I want my thought life to become more surrendered and more awake.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Renew the Mind",
    title: 'Tell Yourself the Truth',
    scripture: 'Philippians 4:4-9',
    focus: 'A disciplined mind is not empty but filled with what is true, noble, and worthy of praise.',
    stillnessPrompt: 'Ask, “Lord, what thought patterns need to come under Your peace today?”',
    storyPrompt: 'Watch Paul move from anxiety toward prayer and disciplined thought. Where does the shift happen?',
    stepsPrompts: [
      'Scripture truth: What practices guard the heart and mind?',
      'Truth for me: What recurring thought most needs replacement today?',
      'Examination: Where have worry and untruth become normal?',
      'Prayer response: What truth from Scripture will I rehearse today?',
      'Step today: How will I interrupt one anxious pattern today?',
    ],
    actsPrayer: ['Adoration for God’s peace', 'Confession of anxious rumination', 'Thanksgiving for truth', 'Supplication for guarded thoughts'],
    accountability: 'What lie are you replacing today, and with what truth?',
    leaderNote: 'Show that mind renewal is both spiritual and practical.',
    partnerNote: 'I need my thought life shepherded by Scripture.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Master the Emotions",
    title: 'Bring Feelings Under Lordship',
    scripture: 'Psalm 42:1-11',
    focus: 'Faith neither worships emotions nor denies them; it brings them honestly before God.',
    stillnessPrompt: 'Say, “Lord, I bring You what I am actually feeling, not what I wish I felt.”',
    storyPrompt: 'Listen to the psalmist talk to his own soul. What is honest here, and what is hopeful?',
    stepsPrompts: [
      'Scripture truth: How does the psalmist handle emotional heaviness?',
      'Truth for me: What emotion needs to be named before God today?',
      'Examination: Where am I being ruled by mood or numbness?',
      'Prayer response: What hope am I preaching back to my own soul?',
      'Step today: What healthy, holy response will I practice today?',
    ],
    actsPrayer: ['Adoration for God who receives honesty', 'Confession of emotional avoidance', 'Thanksgiving for steady love', 'Supplication for anchored hope'],
    accountability: 'What feeling are you bringing into the light today instead of managing alone?',
    leaderNote: 'Model honest emotional discipleship without reducing everything to feelings.',
    partnerNote: 'I need help being honest without being governed by every wave.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Present Your Body",
    title: 'Offer Your Whole Self',
    scripture: '1 Corinthians 6:19-20',
    focus: 'Discipleship includes the body, habits, desires, and limits we often treat as separate from spirituality.',
    stillnessPrompt: 'Pray, “Lord, teach me to honor You with my body today.”',
    storyPrompt: 'Consider Paul’s language of belonging and price. What changes when your body is seen as God’s dwelling place?',
    stepsPrompts: [
      'Scripture truth: What claim does God make on our bodies?',
      'Truth for me: What habit needs to come under Christ’s lordship?',
      'Examination: Where do I separate spirituality from embodied obedience?',
      'Prayer response: What area of appetite or fatigue needs grace today?',
      'Step today: What embodied act of obedience will I practice today?',
    ],
    actsPrayer: ['Adoration for God who dwells with us', 'Confession of careless habits', 'Thanksgiving for redemption', 'Supplication for holy stewardship'],
    accountability: 'What bodily habit are you placing before the Lord today?',
    leaderNote: 'Embodied obedience is part of formation, not a side issue.',
    partnerNote: 'I need grace in the ordinary habits that shape my days.',
  },
  {
    phase: "Book 2 · The Disciple's Personality · Break from the World, Cling to Christ",
    title: 'Belong to Jesus More Than the World',
    scripture: '1 John 2:15-17',
    focus: 'Worldliness is not merely bad behavior; it is disordered love.',
    stillnessPrompt: 'Pray, “Jesus, reorder what I love and what I fear losing.”',
    storyPrompt: 'Stand inside John’s warning. What is passing away, and what remains?',
    stepsPrompts: [
      'Scripture truth: What does John warn against?',
      'Truth for me: What rival affection most competes with devotion to Christ?',
      'Examination: What am I chasing that cannot last?',
      'Prayer response: What deeper affection for Christ do I need?',
      'Step today: What is one small renunciation I can make today?',
    ],
    actsPrayer: ['Adoration for Christ our treasure', 'Confession of rival loves', 'Thanksgiving for what lasts', 'Supplication for ordered affection'],
    accountability: 'What desire needs to loosen its grip on you this week?',
    leaderNote: 'Keep worldliness tied to worship and desire, not mere rule-keeping.',
    partnerNote: 'I want my loves to be trained toward Jesus, not toward whatever sparkles.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Know the Battle",
    title: 'Take the Battle Seriously',
    scripture: 'Ephesians 6:10-13',
    focus: 'Spiritual warfare is real, but Christ’s strength is greater and steadier than our fear.',
    stillnessPrompt: 'Pray, “Lord, make me sober and steady, not fearful and dramatic.”',
    storyPrompt: 'Hear Paul’s call to stand. What kind of battle is he describing, and where do you feel it?',
    stepsPrompts: [
      'Scripture truth: What is the nature of the struggle?',
      'Truth for me: Where have I been casual about spiritual resistance?',
      'Examination: Where do temptation, accusation, or fatigue tend to hit?',
      'Prayer response: What would standing firm look like today?',
      'Step today: What posture of vigilance will I adopt today?',
    ],
    actsPrayer: ['Adoration for Christ the Victor', 'Confession of passivity', 'Thanksgiving for strength in the Lord', 'Supplication for discernment and steadiness'],
    accountability: 'Where are you most vulnerable to drift or temptation this week?',
    leaderNote: 'Keep warfare biblical, calm, and Christ-centered.',
    partnerNote: 'I need courage without drama and vigilance without fear.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Expose the Footholds",
    title: 'Close the Open Doors',
    scripture: 'Ephesians 4:25-32',
    focus: 'Victory grows where sin is exposed and surrendered, not excused.',
    stillnessPrompt: 'Ask, “Lord, where have I given ground that needs to be reclaimed?”',
    storyPrompt: 'Watch Paul move from old patterns to new life. Where do you feel resistance to this change?',
    stepsPrompts: [
      'Scripture truth: What behaviors give the enemy opportunity?',
      'Truth for me: What pattern needs immediate honesty?',
      'Examination: Where have bitterness, pride, lust, greed, or careless words settled in?',
      'Prayer response: What repentance is needed today?',
      'Step today: What concrete break with sin will I make today?',
    ],
    actsPrayer: ['Adoration for God’s cleansing grace', 'Confession of specific sin', 'Thanksgiving for forgiveness', 'Supplication for repentance and freedom'],
    accountability: 'What foothold needs to be named clearly today?',
    leaderNote: 'Push toward concrete repentance without shame theatrics.',
    partnerNote: 'Grace is not avoidance. Grace helps me tell the truth.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Fasten the Belt of Truth",
    title: 'Stand in What Is True',
    scripture: 'John 8:31-32',
    focus: 'Truth is not only doctrinal accuracy; it is the atmosphere in which freedom grows.',
    stillnessPrompt: 'Pray, “Lord, expose falsehood and anchor me in Your truth.”',
    storyPrompt: 'Listen to Jesus tie abiding, truth, and freedom together. How does that sequence work?',
    stepsPrompts: [
      'Scripture truth: How does truth set us free?',
      'Truth for me: What falsehood keeps reappearing in my inner life?',
      'Examination: Where do I distort reality to protect myself?',
      'Prayer response: What truth from Jesus do I need to cling to today?',
      'Step today: How will I rehearse truth when the lie returns?',
    ],
    actsPrayer: ['Adoration for Jesus the Truth', 'Confession of deception', 'Thanksgiving for freedom', 'Supplication for clarity and integrity'],
    accountability: 'What truth are you fastening around your mind and heart today?',
    leaderNote: 'Victory is nourished by truth remembered and obeyed.',
    partnerNote: 'I need truth to become reflex, not just content I admire.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Lift the Shield of Faith",
    title: 'Trust Under Fire',
    scripture: 'Hebrews 11:1-6',
    focus: 'Faith is active reliance on God when outcomes are not yet visible.',
    stillnessPrompt: 'Pray, “Lord, strengthen my trust where I feel exposed.”',
    storyPrompt: 'Watch faith move ordinary people toward obedience. What kind of confidence is shaping them?',
    stepsPrompts: [
      'Scripture truth: What is faith according to this passage?',
      'Truth for me: Where do fear and uncertainty make trust feel costly?',
      'Examination: What am I tempted to call wisdom that is really avoidance?',
      'Prayer response: What promise of God do I need to believe today?',
      'Step today: What faithful act will I take today?',
    ],
    actsPrayer: ['Adoration for God’s faithfulness', 'Confession of unbelief', 'Thanksgiving for promises', 'Supplication for courageous trust'],
    accountability: 'What act of trust will put shoes on your faith today?',
    leaderNote: 'Keep faith tethered to God’s character and promises.',
    partnerNote: 'I do not need perfect feelings to take a faithful step.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Wield the Word",
    title: 'Answer Temptation with Scripture',
    scripture: 'Matthew 4:1-11',
    focus: 'Jesus meets temptation with the Word, teaching us how truth confronts distortion.',
    stillnessPrompt: 'Pray, “Jesus, train my instincts to answer with Your Word.”',
    storyPrompt: 'Walk through the wilderness temptation. Where is the enemy twisting what is good, and how does Jesus respond?',
    stepsPrompts: [
      'Scripture truth: How does Jesus use Scripture in battle?',
      'Truth for me: Where is temptation twisting desire, fear, or identity today?',
      'Examination: What passage do I need ready at hand?',
      'Prayer response: How can I invite the Word into this specific struggle?',
      'Step today: What verse will I memorize or repeat today?',
    ],
    actsPrayer: ['Adoration for Christ’s obedience', 'Confession of weak resistance', 'Thanksgiving for Scripture', 'Supplication for alertness and courage'],
    accountability: 'What verse will you keep ready for the battle you know is coming?',
    leaderNote: 'Move from vague respect for Scripture to active use of it.',
    partnerNote: 'I want the Word close enough to answer temptation in real time.',
  },
  {
    phase: "Book 3 · The Disciple's Victory · Watch in Prayer",
    title: 'Pray While You Stand',
    scripture: 'Ephesians 6:18',
    focus: 'Prayer is not an appendix to battle but the atmosphere in which steadfastness is sustained.',
    stillnessPrompt: 'Whisper, “Lord, keep me watchful and dependent.”',
    storyPrompt: 'Picture a disciple standing in armor and praying. Why does Paul attach watchfulness and perseverance to prayer?',
    stepsPrompts: [
      'Scripture truth: What does Paul say about prayer in battle?',
      'Truth for me: Where do I tend to fight in my own strength?',
      'Examination: Who else needs intercession from me this week?',
      'Prayer response: What burden should I carry before the Lord today?',
      'Step today: What prayer watch will I keep today?',
    ],
    actsPrayer: ['Adoration for God who hears', 'Confession of self-sufficiency', 'Thanksgiving for access', 'Supplication for vigilance and perseverance'],
    accountability: 'When will you stop today and pray on purpose rather than only reacting?',
    leaderNote: 'Prayer sustains discernment, endurance, and love in battle.',
    partnerNote: 'I need prayer to become my reflex instead of my afterthought.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Seek Reconciliation",
    title: 'Mission Begins with Integrity',
    scripture: 'Matthew 5:23-24',
    focus: 'A life on mission cannot ignore broken relationships that God is calling us to address.',
    stillnessPrompt: 'Ask, “Lord, where do I need humility, forgiveness, or a hard conversation?”',
    storyPrompt: 'Stand at the altar with Jesus’ instruction ringing in your ears. Why does reconciliation matter here?',
    stepsPrompts: [
      'Scripture truth: What priority does Jesus give reconciliation?',
      'Truth for me: Which relationship needs prayerful attention?',
      'Examination: What keeps me from moving toward peace?',
      'Prayer response: What kind of heart do I need for this?',
      'Step today: What reconciling action can I take today?',
    ],
    actsPrayer: ['Adoration for God the reconciler', 'Confession of pride or avoidance', 'Thanksgiving for peace through Christ', 'Supplication for courage and humility'],
    accountability: 'What relational step is obedience asking of you this week?',
    leaderNote: 'Mission carries the scent of repentance and repaired relationships.',
    partnerNote: 'I want my witness to be backed by integrity and peace.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Witness Relationally",
    title: 'Carry the Gospel into Real Relationships',
    scripture: 'Colossians 4:2-6',
    focus: 'Witnessing is often patient, relational, prayerful, and marked by grace.',
    stillnessPrompt: 'Pray, “Lord, make me attentive to people, not just opportunities.”',
    storyPrompt: 'Listen to Paul combine prayer, open doors, clarity, and grace. What kind of witness does that form?',
    stepsPrompts: [
      'Scripture truth: What qualities shape gospel conversations?',
      'Truth for me: Which relationship might be a field God is already tending?',
      'Examination: Where do I need more prayer and less pressure?',
      'Prayer response: What words am I asking God to help me speak?',
      'Step today: What relational investment can I make today?',
    ],
    actsPrayer: ['Adoration for the God who saves', 'Confession of fear or impatience', 'Thanksgiving for grace', 'Supplication for open doors and fitting words'],
    accountability: 'Who is one person you will carry prayerfully this week?',
    leaderNote: 'Teach witness as prayerful presence and faithful clarity.',
    partnerNote: 'I want to be brave and gentle at the same time.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Make Disciples",
    title: 'Go Beyond Decisions',
    scripture: 'Matthew 28:18-20',
    focus: 'The mission is not merely to collect moments but to form disciples who obey Jesus.',
    stillnessPrompt: 'Pray, “Jesus, make me available for the work of disciple-making.”',
    storyPrompt: 'Hear the Great Commission with the promise of Jesus’ presence. What kind of life does this commission require?',
    stepsPrompts: [
      'Scripture truth: What does Jesus actually command here?',
      'Truth for me: Where can I move from inspiration to intentional investment?',
      'Examination: Who might God be prompting me to help follow Jesus?',
      'Prayer response: What fear or inadequacy needs to be surrendered?',
      'Step today: What disciple-making move can I make today?',
    ],
    actsPrayer: ['Adoration for Christ’s authority', 'Confession of passivity', 'Thanksgiving for His presence', 'Supplication for courage and faithfulness'],
    accountability: 'Who are you helping follow Jesus right now, even in a small way?',
    leaderNote: 'Keep disciple-making relational, obedient, and reproducible.',
    partnerNote: 'I want mission to become part of my actual life, not just my ideals.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Discover Spiritual Gifts",
    title: 'Offer What Grace Has Given',
    scripture: '1 Peter 4:10-11',
    focus: 'Grace is given not merely for private assurance but for service to others.',
    stillnessPrompt: 'Pray, “Lord, show me how You have shaped me to serve.”',
    storyPrompt: 'Listen to Peter describe stewardship of grace. What would it mean to serve from what God has entrusted?',
    stepsPrompts: [
      'Scripture truth: How does Peter describe spiritual gifts?',
      'Truth for me: What patterns of usefulness or burden do I notice?',
      'Examination: Where do insecurity or comparison keep me from serving?',
      'Prayer response: How can I ask God for clarity about my role?',
      'Step today: What small act of stewardship can I offer today?',
    ],
    actsPrayer: ['Adoration for God’s varied grace', 'Confession of comparison and hiding', 'Thanksgiving for calling', 'Supplication for clarity and faithful service'],
    accountability: 'Where do you sense God may be inviting you to serve more intentionally?',
    leaderNote: 'Emphasize stewardship and service over self-discovery as an end in itself.',
    partnerNote: 'I want to serve from grace instead of from insecurity.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Discern Your Assignment",
    title: 'Say Yes to the Work in Front of You',
    scripture: 'Ephesians 2:10',
    focus: 'Calling is often clarified through faithful obedience in the work God has already set before us.',
    stillnessPrompt: 'Pray, “Lord, help me notice the good works You have prepared for me today.”',
    storyPrompt: 'Read Paul’s language of workmanship and prepared works. What does this say about purpose?',
    stepsPrompts: [
      'Scripture truth: What does God prepare for His people?',
      'Truth for me: Where do I overcomplicate calling because I want certainty?',
      'Examination: What assignment may already be sitting in front of me?',
      'Prayer response: What willingness do I need from God today?',
      'Step today: What act of obedience is right in front of me?',
    ],
    actsPrayer: ['Adoration for God the designer', 'Confession of hesitation', 'Thanksgiving for purpose', 'Supplication for discernment and obedience'],
    accountability: 'What good work is already in front of you today?',
    leaderNote: 'Calling often grows through faithfulness, not drama.',
    partnerNote: 'I need courage for the assignment already on my doorstep.',
  },
  {
    phase: "Book 4 · The Disciple's Mission · Live Sent",
    title: 'Carry Jesus into Ordinary Life',
    scripture: '2 Corinthians 5:17-20',
    focus: 'Mission is not a side project; it is the overflow of being reconciled and sent by Christ.',
    stillnessPrompt: 'Pray, “Jesus, let me carry Your reconciling presence where I already live today.”',
    storyPrompt: 'Hear Paul name us ambassadors. What dignity and responsibility come with that identity?',
    stepsPrompts: [
      'Scripture truth: What identity and task does Paul give believers?',
      'Truth for me: Where have I treated mission as someone else’s job?',
      'Examination: What ordinary setting becomes a mission field today?',
      'Prayer response: How do I need God to shape my posture today?',
      'Step today: What one sent-life action will I take today?',
    ],
    actsPrayer: ['Adoration for Christ the reconciler', 'Confession of small vision', 'Thanksgiving for new creation', 'Supplication for faithful witness and love'],
    accountability: 'What ordinary place will you enter today as someone sent by Jesus?',
    leaderNote: 'Help mission feel immediate, relational, and sustainable.',
    partnerNote: 'I want to carry Jesus into the ordinary rhythms I already inhabit.',
  },
];

function buildMasterlifeDays() {
  return masterlifeDailyDays.map((sourceDay, index) => {
    const source = sourceDay as {
      absoluteWeek: number;
      bookTitle: string;
      dailyReading?: string;
      dayInWeek: number;
      memoryVerse?: string;
      memoryVerseReference?: string;
      title: string;
      weekGoal: string;
      weekInBook: number;
      weekTitle: string;
    };
    const scripture = source.dailyReading || source.memoryVerseReference || 'Follow today’s MasterLife source passage';
    const memoryVerse = source.memoryVerseReference
      ? `${source.memoryVerseReference}${source.memoryVerse ? ` · ${source.memoryVerse}` : ''}`
      : source.memoryVerse;

    return {
      day: index + 1,
      dayInWeek: source.dayInWeek,
      week: source.absoluteWeek,
      phase: `${source.bookTitle} · ${source.weekTitle}`,
      title: source.title,
      scripture,
      focus: `${source.weekGoal} Today’s source section is “${source.title},” with ${source.dailyReading ? `${source.dailyReading} as the daily reading` : 'the week’s memory passage as the Scripture anchor'}.`,
      stillnessPrompt: `Begin Day ${source.dayInWeek} by asking God to meet you in ${source.weekTitle}. Read ${scripture} slowly before writing anything.`,
      storyPrompt: `Summarize the movement of today’s MasterLife section, “${source.title}.” What is the source asking you to notice, practice, or surrender?`,
      stepsPrompts: [
        `Scripture truth: What does ${scripture} reveal that supports today’s section?`,
        `Truth for me: Where does “${source.title}” press on your actual obedience today?`,
        `Examination: What resistance, excuse, or misplaced priority does this day expose?`,
        `Prayer response: Turn today’s reading and source assignment into direct prayer.`,
        `Step today: Complete the source assignment for Day ${source.dayInWeek} and name one concrete action.`,
      ],
      actsPrayer: [
        `Adoration: praise God for the truth highlighted in ${scripture}.`,
        `Confession: name anything today’s MasterLife section exposes.`,
        `Thanksgiving: thank God for one grace in today’s reading.`,
        `Supplication: ask for help to practice today’s assignment faithfully.`,
      ],
      accountability: `What will show by tonight that Day ${source.dayInWeek}, “${source.title},” became obedience and not just reading?`,
      leaderNote: `Keep the user on the source cadence: ${source.bookTitle}, Week ${source.weekInBook}, Day ${source.dayInWeek}.`,
      partnerNote: 'Stay honest and specific. The win today is faithfulness with the assigned source material.',
      sourceBook: source.bookTitle,
      sourceWeekTitle: source.weekTitle,
      memoryVerse,
      dailyReading: source.dailyReading,
    } satisfies StudyModuleDay;
  });
}

function buildBibleStudyDays() {
  return BIBLE_STUDY_THEMES.flatMap((theme, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const day = weekIndex * 7 + dayIndex + 1;
      return {
        day,
        week: weekIndex + 1,
        phase: theme.phase,
        title: `${theme.title} · Day ${dayIndex + 1}`,
        scripture: theme.scripture,
        focus: theme.focus,
        stillnessPrompt: theme.stillnessPrompt,
        storyPrompt: theme.storyPrompt,
        stepsPrompts: theme.stepsPrompts,
        actsPrayer: theme.actsPrayer,
        accountability: theme.accountability,
        leaderNote: theme.leaderNote,
        partnerNote: theme.partnerNote,
      } satisfies StudyModuleDay;
    })
  );
}

export const BIBLE_STUDY_MODULE: StudyModule = {
  id: 'bible-study',
  title: 'Bible Study',
  shortTitle: 'Bible Study',
  tradition: 'Protestant text-centered study',
  cadence: 'Daily · passage by passage',
  totalDays: 42,
  summary:
    'A Scripture-first study track focused on observation, interpretation, Christ-centered reading, doctrine, and obedient application.',
  sourceSummary:
    'Built for Chronicle’s Bible Study Agent: stillness, storying the text, S.T.E.P.S. journaling, ACTS prayer, and practical obedience.',
  phases: [
    { label: 'Observation', weeks: [1], emphasis: 'Learn to slow down, notice details, and let the passage speak first.' },
    { label: 'Interpretation', weeks: [2], emphasis: 'Trace meaning in context and hear the author’s burden.' },
    { label: 'Christ-Centered Reading', weeks: [3], emphasis: 'Read every passage with Jesus and the gospel in view.' },
    { label: 'Doctrine', weeks: [4], emphasis: 'Strengthen theological clarity so truth becomes sturdy and usable.' },
    { label: 'Application', weeks: [5], emphasis: 'Move from insight to real obedience in daily life.' },
    { label: 'Mission', weeks: [6], emphasis: 'Let study widen your life toward worship, holiness, and witness.' },
  ],
  days: buildBibleStudyDays(),
};

export const DISCIPLESHIP_MODULE: StudyModule = {
  id: 'discipleship',
  title: 'Discipleship',
  shortTitle: 'Discipleship',
  tradition: 'Southern Baptist discipleship track',
  cadence: 'Daily · five source days per week',
  totalDays: masterlifeDailyDays.length,
  daysPerWeek: 5,
  summary:
    'A day-by-day discipleship journey through abiding, the Word, prayer, fellowship, witness, service, character, victory, and mission.',
  sourceSummary:
    "Built around MasterLife's four-book sequence: The Disciple's Cross, The Disciple's Personality, The Disciple's Victory, and The Disciple's Mission.",
  phases: [
    { label: "Book 1 · The Disciple's Cross", weeks: [1, 2, 3, 4, 5, 6], emphasis: 'Six essential disciplines of a disciple.' },
    { label: "Book 2 · The Disciple's Personality", weeks: [7, 8, 9, 10, 11, 12], emphasis: 'Spirit-formed character, renewed thinking, and holy desire.' },
    { label: "Book 3 · The Disciple's Victory", weeks: [13, 14, 15, 16, 17, 18], emphasis: 'Spiritual warfare, repentance, truth, faith, and prayerful steadfastness.' },
    { label: "Book 4 · The Disciple's Mission", weeks: [19, 20, 21, 22, 23, 24], emphasis: 'Reconciliation, witness, disciple-making, gifts, and life on mission.' },
  ],
  days: buildMasterlifeDays(),
};

export const STUDY_MODULES: StudyModule[] = [BIBLE_STUDY_MODULE, DISCIPLESHIP_MODULE];

function normalizeStudyModuleId(moduleId: string) {
  return moduleId === 'masterlife' ? 'discipleship' : moduleId;
}

export function getStudyModule(moduleId: string) {
  const normalizedId = normalizeStudyModuleId(moduleId);
  return STUDY_MODULES.find((module) => module.id === normalizedId) || BIBLE_STUDY_MODULE;
}

export function clampStudyDay(moduleId: string, day: number) {
  const module = getStudyModule(moduleId);
  return Math.min(Math.max(day, 1), module.totalDays);
}

export function getStudyDay(moduleId: string, day: number) {
  const module = getStudyModule(moduleId);
  const clamped = clampStudyDay(moduleId, day);
  return module.days.find((entry) => entry.day === clamped) || module.days[0];
}
