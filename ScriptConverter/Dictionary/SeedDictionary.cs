namespace ScriptConverter.Dictionary;

/// <summary>
/// Provides a seed dictionary of common Urdu/Hindi words for initial population.
/// </summary>
public static class SeedDictionary
{
    /// <summary>
    /// Returns seed entries covering common vocabulary.
    /// </summary>
    public static List<DictionaryEntry> GetSeedEntries()
    {
        var entries = new List<DictionaryEntry>();
        entries.AddRange(Greetings());
        entries.AddRange(Pronouns());
        entries.AddRange(CommonVerbs());
        entries.AddRange(Adjectives());
        entries.AddRange(Numerals());
        entries.AddRange(TimeWords());
        entries.AddRange(DaysOfWeek());
        entries.AddRange(FamilyWords());
        entries.AddRange(BodyParts());
        entries.AddRange(FoodAndDrink());
        entries.AddRange(CommonNouns());
        entries.AddRange(Adverbs());
        entries.AddRange(QuestionWords());
        entries.AddRange(Prepositions());
        entries.AddRange(Emotions());
        entries.AddRange(Colours());
        entries.AddRange(Animals());
        entries.AddRange(PlacesAndNature());
        entries.AddRange(MiscVocabulary());
        return entries;
    }

    private static DictionaryEntry E(string roman, string urdu, string? hindi, string? meaning, string? cat = null) =>
        new() { Roman = roman, Urdu = urdu, Hindi = hindi, Meaning = meaning, Category = cat };

    private static List<DictionaryEntry> Greetings() =>
    [
        E("salam", "سلام", "सलाम", "peace/hello", "greeting"),
        E("assalamu alaikum", "اسلام علیکم", "अस्सलामु अलैकुम", "peace be upon you", "greeting"),
        E("walaikum assalam", "وعلیکم السلام", "वालैकुम अस्सलाम", "and upon you peace", "greeting"),
        E("khuda hafiz", "خدا حافظ", "खुदा हाफ़िज़", "goodbye", "greeting"),
        E("shukria", "شکریہ", "शुक्रिया", "thank you", "greeting"),
        E("meherbani", "مہربانی", "मेहरबानी", "kindness/please", "greeting"),
        E("maaf kijiye", "معاف کیجیے", "माफ़ कीजिए", "excuse me", "greeting"),
        E("namaste", "نمستے", "नमस्ते", "hello (Hindi)", "greeting"),
        E("alvida", "الوداع", "अलविदा", "farewell", "greeting"),
        E("shukriya", "شکریہ", "शुक्रिया", "thank you", "greeting"),
        E("ji", "جی", "जी", "yes/sir", "greeting"),
        E("ji haan", "جی ہاں", "जी हाँ", "yes sir", "greeting"),
        E("ji nahi", "جی نہیں", "जी नहीं", "no sir", "greeting"),
    ];

    private static List<DictionaryEntry> Pronouns() =>
    [
        E("mein", "میں", "मैं", "I", "pronoun"),
        E("main", "میں", "मैं", "I", "pronoun"),
        E("tum", "تم", "तुम", "you (informal)", "pronoun"),
        E("aap", "آپ", "आप", "you (formal)", "pronoun"),
        E("wo", "وہ", "वह", "he/she/they", "pronoun"),
        E("woh", "وہ", "वह", "he/she/they", "pronoun"),
        E("hum", "ہم", "हम", "we", "pronoun"),
        E("yeh", "یہ", "यह", "this", "pronoun"),
        E("ye", "یہ", "यह", "this", "pronoun"),
        E("tu", "تو", "तू", "you (very informal)", "pronoun"),
        E("is", "اس", "इस", "this/that", "pronoun"),
        E("us", "اس", "उस", "that", "pronoun"),
        E("kisne", "کس نے", "किसने", "who (ergative)", "pronoun"),
        E("kisi", "کسی", "किसी", "someone", "pronoun"),
        E("sab", "سب", "सब", "all/everyone", "pronoun"),
        E("kuch", "کچھ", "कुछ", "some/something", "pronoun"),
        E("apna", "اپنا", "अपना", "own/self", "pronoun"),
    ];

    private static List<DictionaryEntry> CommonVerbs() =>
    [
        E("hai", "ہے", "है", "is", "verb"),
        E("hain", "ہیں", "हैं", "are", "verb"),
        E("tha", "تھا", "था", "was (m)", "verb"),
        E("thi", "تھی", "थी", "was (f)", "verb"),
        E("the", "تھے", "थे", "were", "verb"),
        E("hoon", "ہوں", "हूँ", "am", "verb"),
        E("ho", "ہو", "हो", "are (informal)", "verb"),
        E("karna", "کرنا", "करना", "to do", "verb"),
        E("karta", "کرتا", "करता", "does (m)", "verb"),
        E("karti", "کرتی", "करती", "does (f)", "verb"),
        E("karte", "کرتے", "करते", "do (pl)", "verb"),
        E("kiya", "کیا", "किया", "did", "verb"),
        E("karein", "کریں", "करें", "do (formal)", "verb"),
        E("jana", "جانا", "जाना", "to go", "verb"),
        E("jata", "جاتا", "जाता", "goes (m)", "verb"),
        E("jati", "جاتی", "जाती", "goes (f)", "verb"),
        E("gaya", "گیا", "गया", "went (m)", "verb"),
        E("gayi", "گئی", "गई", "went (f)", "verb"),
        E("aana", "آنا", "आना", "to come", "verb"),
        E("aata", "آتا", "आता", "comes (m)", "verb"),
        E("aati", "آتی", "आती", "comes (f)", "verb"),
        E("aaya", "آیا", "आया", "came (m)", "verb"),
        E("aayi", "آئی", "आई", "came (f)", "verb"),
        E("lena", "لینا", "लेना", "to take", "verb"),
        E("dena", "دینا", "देना", "to give", "verb"),
        E("bolna", "بولنا", "बोलना", "to speak", "verb"),
        E("sunna", "سننا", "सुनना", "to listen", "verb"),
        E("dekhna", "دیکھنا", "देखना", "to see", "verb"),
        E("khana", "کھانا", "खाना", "to eat / food", "verb"),
        E("peena", "پینا", "पीना", "to drink", "verb"),
        E("likhna", "لکھنا", "लिखना", "to write", "verb"),
        E("parhna", "پڑھنا", "पढ़ना", "to read/study", "verb"),
        E("sochna", "سوچنا", "सोचना", "to think", "verb"),
        E("samajhna", "سمجھنا", "समझना", "to understand", "verb"),
        E("chahna", "چاہنا", "चाहना", "to want", "verb"),
        E("chahiye", "چاہیے", "चाहिए", "should/need", "verb"),
        E("rakhna", "رکھنا", "रखना", "to keep/put", "verb"),
        E("banana", "بنانا", "बनाना", "to make", "verb"),
        E("hona", "ہونا", "होना", "to be/happen", "verb"),
        E("milna", "ملنا", "मिलना", "to meet/get", "verb"),
        E("chalna", "چلنا", "चलना", "to walk/move", "verb"),
        E("uthna", "اٹھنا", "उठना", "to get up", "verb"),
        E("baithna", "بیٹھنا", "बैठना", "to sit", "verb"),
        E("sona", "سونا", "सोना", "to sleep", "verb"),
        E("uthana", "اٹھانا", "उठाना", "to lift/pick up", "verb"),
        E("rona", "رونا", "रोना", "to cry", "verb"),
        E("hansna", "ہنسنا", "हँसना", "to laugh", "verb"),
        E("marna", "مرنا", "मरना", "to die", "verb"),
        E("jeena", "جینا", "जीना", "to live", "verb"),
    ];

    private static List<DictionaryEntry> Adjectives() =>
    [
        E("acha", "اچھا", "अच्छा", "good", "adjective"),
        E("bura", "برا", "बुरा", "bad", "adjective"),
        E("bara", "بڑا", "बड़ा", "big", "adjective"),
        E("bada", "بڑا", "बड़ा", "big", "adjective"),
        E("chota", "چھوٹا", "छोटा", "small", "adjective"),
        E("chhota", "چھوٹا", "छोटा", "small", "adjective"),
        E("naya", "نیا", "नया", "new", "adjective"),
        E("purana", "پرانا", "पुराना", "old (thing)", "adjective"),
        E("khoobsurat", "خوبصورت", "खूबसूरत", "beautiful", "adjective"),
        E("khoobsoorat", "خوبصورت", "खूबसूरत", "beautiful", "adjective"),
        E("badsurat", "بدصورت", "बदसूरत", "ugly", "adjective"),
        E("badsoorat", "بدصورت", "बदसूरत", "ugly", "adjective"),
        E("mushkil", "مشکل", "मुश्किल", "difficult", "adjective"),
        E("aasan", "آسان", "आसान", "easy", "adjective"),
        E("garam", "گرم", "गरम", "hot", "adjective"),
        E("thanda", "ٹھنڈا", "ठंडा", "cold", "adjective"),
        E("lamba", "لمبا", "लम्बा", "tall/long", "adjective"),
        E("chota", "چھوٹا", "छोटा", "small/short", "adjective"),
        E("sakht", "سخت", "सख़्त", "hard/strict", "adjective"),
        E("naram", "نرم", "नरम", "soft", "adjective"),
        E("saaf", "صاف", "साफ़", "clean/clear", "adjective"),
        E("ganda", "گندا", "गंदा", "dirty", "adjective"),
        E("khush", "خوش", "ख़ुश", "happy", "adjective"),
        E("udaas", "اداس", "उदास", "sad", "adjective"),
        E("mazboot", "مضبوط", "मज़बूत", "strong", "adjective"),
        E("kamzor", "کمزور", "कमज़ोर", "weak", "adjective"),
        E("ameer", "امیر", "अमीर", "rich", "adjective"),
        E("ghareeb", "غریب", "ग़रीब", "poor", "adjective"),
        E("tez", "تیز", "तेज़", "fast/sharp", "adjective"),
        E("sasta", "سستا", "सस्ता", "cheap", "adjective"),
        E("mehenga", "مہنگا", "महँगा", "expensive", "adjective"),
        E("ajeeb", "عجیب", "अजीब", "strange/weird", "adjective"),
        E("dilkash", "دلکش", "दिलकश", "charming", "adjective"),
        E("shandaar", "شاندار", "शानदार", "fabulous/grand", "adjective"),
        E("munfarid", "منفرد", "मुनफ़रिद", "unique", "adjective"),
        E("deewana", "دیوانہ", "दीवाना", "crazy/mad", "adjective"),
        E("badtameez", "بدتمیز", "बदतमीज़", "rude", "adjective"),
        E("aajiz", "عاجز", "आजिज़", "humble", "adjective"),
        E("mazaydar", "مزیدار", "मज़ेदार", "delicious/fun", "adjective"),
        E("lazeez", "لذیذ", "लज़ीज़", "delicious", "adjective"),
    ];

    private static List<DictionaryEntry> Numerals() =>
    [
        E("aik", "ایک", "एक", "one", "number"),
        E("ek", "ایک", "एक", "one", "number"),
        E("do", "دو", "दो", "two", "number"),
        E("teen", "تین", "तीन", "three", "number"),
        E("chaar", "چار", "चार", "four", "number"),
        E("paanch", "پانچ", "पाँच", "five", "number"),
        E("che", "چھ", "छह", "six", "number"),
        E("chhey", "چھ", "छह", "six", "number"),
        E("saat", "سات", "सात", "seven", "number"),
        E("aath", "آٹھ", "आठ", "eight", "number"),
        E("no", "نو", "नौ", "nine", "number"),
        E("das", "دس", "दस", "ten", "number"),
        E("gyarah", "گیارہ", "ग्यारह", "eleven", "number"),
        E("barah", "بارہ", "बारह", "twelve", "number"),
        E("terah", "تیرہ", "तेरह", "thirteen", "number"),
        E("chaudah", "چودہ", "चौदह", "fourteen", "number"),
        E("pandrah", "پندرہ", "पंद्रह", "fifteen", "number"),
        E("solah", "سولہ", "सोलह", "sixteen", "number"),
        E("satrah", "ستارہ", "सत्रह", "seventeen", "number"),
        E("athaarah", "اٹھارہ", "अठारह", "eighteen", "number"),
        E("unees", "انیس", "उन्नीस", "nineteen", "number"),
        E("bees", "بیس", "बीस", "twenty", "number"),
        E("tees", "تیس", "तीस", "thirty", "number"),
        E("chaalees", "چالیس", "चालीस", "forty", "number"),
        E("pachaas", "پچاس", "पचास", "fifty", "number"),
        E("sau", "سو", "सौ", "hundred", "number"),
        E("hazaar", "ہزار", "हज़ार", "thousand", "number"),
        E("lakh", "لاکھ", "लाख", "hundred thousand", "number"),
        E("crore", "کروڑ", "करोड़", "ten million", "number"),
        E("sifar", "صفر", "शून्य", "zero", "number"),
    ];

    private static List<DictionaryEntry> TimeWords() =>
    [
        E("waqt", "وقت", "वक़्त", "time", "time"),
        E("aaj", "آج", "आज", "today", "time"),
        E("kal", "کل", "कल", "yesterday/tomorrow", "time"),
        E("parso", "پرسوں", "परसों", "day before/after", "time"),
        E("subah", "صبح", "सुबह", "morning", "time"),
        E("dopehar", "دوپہر", "दोपहर", "afternoon", "time"),
        E("shaam", "شام", "शाम", "evening", "time"),
        E("raat", "رات", "रात", "night", "time"),
        E("hafta", "ہفتہ", "हफ़्ता", "week", "time"),
        E("mahina", "مہینہ", "महीना", "month", "time"),
        E("saal", "سال", "साल", "year", "time"),
        E("ghanta", "گھنٹہ", "घंटा", "hour", "time"),
        E("mint", "منٹ", "मिनट", "minute", "time"),
        E("minet", "منٹ", "मिनट", "minute", "time"),
        E("second", "سیکنڈ", "सेकंड", "second", "time"),
        E("abhi", "ابھی", "अभी", "now/right now", "time"),
        E("baad", "بعد", "बाद", "after/later", "time"),
        E("pehle", "پہلے", "पहले", "before/earlier", "time"),
        E("hamesha", "ہمیشہ", "हमेशा", "always", "time"),
        E("kabhi", "کبھی", "कभी", "ever/sometimes", "time"),
    ];

    private static List<DictionaryEntry> DaysOfWeek() =>
    [
        E("peer", "پیر", "सोमवार", "Monday", "day"),
        E("somwar", "سوموار", "सोमवार", "Monday", "day"),
        E("mangal", "منگل", "मंगलवार", "Tuesday", "day"),
        E("mungal", "منگل", "मंगलवार", "Tuesday", "day"),
        E("budh", "بدھ", "बुधवार", "Wednesday", "day"),
        E("jumeraat", "جمعرات", "गुरुवार", "Thursday", "day"),
        E("jumarat", "جمعرات", "गुरुवार", "Thursday", "day"),
        E("jumma", "جمعہ", "शुक्रवार", "Friday", "day"),
        E("juma", "جمعہ", "शुक्रवार", "Friday", "day"),
        E("hafta", "ہفتہ", "शनिवार", "Saturday", "day"),
        E("itwar", "اتوار", "रविवार", "Sunday", "day"),
        E("itwaar", "اتوار", "रविवार", "Sunday", "day"),
    ];

    private static List<DictionaryEntry> FamilyWords() =>
    [
        E("abba", "ابّا", "अब्बा", "father", "family"),
        E("abu", "ابو", "अबू", "father", "family"),
        E("ammi", "امّی", "अम्मी", "mother", "family"),
        E("bhai", "بھائی", "भाई", "brother", "family"),
        E("behen", "بہن", "बहन", "sister", "family"),
        E("beta", "بیٹا", "बेटा", "son", "family"),
        E("beti", "بیٹی", "बेटी", "daughter", "family"),
        E("biwi", "بیوی", "बीवी", "wife", "family"),
        E("shohar", "شوہر", "शौहर", "husband", "family"),
        E("dada", "دادا", "दादा", "paternal grandfather", "family"),
        E("dadi", "دادی", "दादी", "paternal grandmother", "family"),
        E("nana", "نانا", "नाना", "maternal grandfather", "family"),
        E("nani", "نانی", "नानी", "maternal grandmother", "family"),
        E("chacha", "چاچا", "चाचा", "uncle (paternal)", "family"),
        E("khala", "خالہ", "ख़ाला", "aunt (maternal)", "family"),
        E("bacha", "بچہ", "बच्चा", "child", "family"),
        E("bache", "بچے", "बच्चे", "children", "family"),
        E("insaan", "انسان", "इंसान", "human/person", "family"),
        E("aadmi", "آدمی", "आदमी", "man", "family"),
        E("aurat", "عورت", "औरत", "woman", "family"),
        E("larka", "لڑکا", "लड़का", "boy", "family"),
        E("larki", "لڑکی", "लड़की", "girl", "family"),
        E("dost", "دوست", "दोस्त", "friend", "family"),
    ];

    private static List<DictionaryEntry> BodyParts() =>
    [
        E("sar", "سر", "सिर", "head", "body"),
        E("sir", "سر", "सिर", "head", "body"),
        E("aankh", "آنکھ", "आँख", "eye", "body"),
        E("naak", "ناک", "नाक", "nose", "body"),
        E("kaan", "کان", "कान", "ear", "body"),
        E("munh", "منہ", "मुँह", "mouth", "body"),
        E("haath", "ہاتھ", "हाथ", "hand", "body"),
        E("pair", "پیر", "पैर", "foot/leg", "body"),
        E("dil", "دل", "दिल", "heart", "body"),
        E("jism", "جسم", "जिस्म", "body", "body"),
        E("khoon", "خون", "ख़ून", "blood", "body"),
        E("chehra", "چہرہ", "चेहरा", "face", "body"),
        E("baal", "بال", "बाल", "hair", "body"),
        E("ungli", "انگلی", "उंगली", "finger", "body"),
        E("zubaan", "زبان", "ज़ुबान", "tongue/language", "body"),
        E("dant", "دانت", "दाँत", "tooth/teeth", "body"),
        E("gardan", "گردن", "गर्दन", "neck", "body"),
    ];

    private static List<DictionaryEntry> FoodAndDrink() =>
    [
        E("pani", "پانی", "पानी", "water", "food"),
        E("roti", "روٹی", "रोटी", "bread", "food"),
        E("chawal", "چاول", "चावल", "rice", "food"),
        E("doodh", "دودھ", "दूध", "milk", "food"),
        E("chai", "چائے", "चाय", "tea", "food"),
        E("gosht", "گوشت", "गोश्त", "meat", "food"),
        E("machli", "مچھلی", "मछली", "fish", "food"),
        E("anda", "انڈا", "अंडा", "egg", "food"),
        E("sabzi", "سبزی", "सब्ज़ी", "vegetable", "food"),
        E("phal", "پھل", "फल", "fruit", "food"),
        E("namak", "نمک", "नमक", "salt", "food"),
        E("cheeni", "چینی", "चीनी", "sugar", "food"),
        E("mirch", "مرچ", "मिर्च", "chili/pepper", "food"),
        E("ghee", "گھی", "घी", "ghee/butter", "food"),
        E("lassi", "لسّی", "लस्सी", "yogurt drink", "food"),
        E("biryani", "بریانی", "बिरयानी", "biryani", "food"),
        E("naan", "نان", "नान", "naan bread", "food"),
    ];

    private static List<DictionaryEntry> CommonNouns() =>
    [
        E("ghar", "گھر", "घर", "house/home", "noun"),
        E("kamra", "کمرہ", "कमरा", "room", "noun"),
        E("darwaza", "دروازہ", "दरवाज़ा", "door", "noun"),
        E("khirki", "کھڑکی", "खिड़की", "window", "noun"),
        E("kursi", "کرسی", "कुर्सी", "chair", "noun"),
        E("mez", "میز", "मेज़", "table", "noun"),
        E("kitab", "کتاب", "किताब", "book", "noun"),
        E("qalam", "قلم", "क़लम", "pen", "noun"),
        E("gaari", "گاڑی", "गाड़ी", "car/vehicle", "noun"),
        E("raasta", "راستہ", "रास्ता", "road/path", "noun"),
        E("shehar", "شہر", "शहर", "city", "noun"),
        E("gaon", "گاؤں", "गाँव", "village", "noun"),
        E("mulk", "ملک", "मुल्क", "country", "noun"),
        E("paisa", "پیسہ", "पैसा", "money", "noun"),
        E("kaam", "کام", "काम", "work", "noun"),
        E("school", "اسکول", "स्कूल", "school", "noun"),
        E("masjid", "مسجد", "मस्जिद", "mosque", "noun"),
        E("hospital", "ہسپتال", "हस्पताल", "hospital", "noun"),
        E("dukaan", "دکان", "दुकान", "shop", "noun"),
        E("bazaar", "بازار", "बाज़ार", "market", "noun"),
        E("kapre", "کپڑے", "कपड़े", "clothes", "noun"),
        E("phone", "فون", "फ़ोन", "phone", "noun"),
        E("naam", "نام", "नाम", "name", "noun"),
        E("baat", "بات", "बात", "talk/thing", "noun"),
        E("din", "دن", "दिन", "day", "noun"),
        E("zindagi", "زندگی", "ज़िंदगी", "life", "noun"),
        E("maut", "موت", "मौत", "death", "noun"),
        E("mohabbat", "محبت", "मोहब्बत", "love", "noun"),
        E("dua", "دعا", "दुआ", "prayer", "noun"),
        E("umeed", "امید", "उम्मीद", "hope", "noun"),
        E("khwab", "خواب", "ख़्वाब", "dream", "noun"),
        E("khushi", "خوشی", "ख़ुशी", "happiness", "noun"),
        E("gham", "غم", "ग़म", "sorrow", "noun"),
        E("ilm", "علم", "इल्म", "knowledge", "noun"),
        E("sach", "سچ", "सच", "truth", "noun"),
        E("jhoot", "جھوٹ", "झूठ", "lie", "noun"),
    ];

    private static List<DictionaryEntry> Adverbs() =>
    [
        E("yahan", "یہاں", "यहाँ", "here", "adverb"),
        E("wahan", "وہاں", "वहाँ", "there", "adverb"),
        E("door", "دور", "दूर", "far", "adverb"),
        E("nazdeek", "نزدیک", "नज़दीक", "near", "adverb"),
        E("upar", "اوپر", "ऊपर", "up/above", "adverb"),
        E("neeche", "نیچے", "नीचे", "down/below", "adverb"),
        E("andar", "اندر", "अंदर", "inside", "adverb"),
        E("bahar", "باہر", "बाहर", "outside", "adverb"),
        E("jaldi", "جلدی", "जल्दी", "quickly", "adverb"),
        E("dheere", "دھیرے", "धीरे", "slowly", "adverb"),
        E("zyada", "زیادہ", "ज़्यादा", "more/much", "adverb"),
        E("kam", "کم", "कम", "less", "adverb"),
        E("bahut", "بہت", "बहुत", "very/much", "adverb"),
        E("thora", "تھوڑا", "थोड़ा", "a little", "adverb"),
        E("bilkul", "بالکل", "बिल्कुल", "absolutely", "adverb"),
        E("shayad", "شاید", "शायद", "maybe", "adverb"),
        E("zaroor", "ضرور", "ज़रूर", "certainly", "adverb"),
        E("sirf", "صرف", "सिर्फ़", "only", "adverb"),
        E("phir", "پھر", "फिर", "then/again", "adverb"),
        E("bhi", "بھی", "भी", "also/too", "adverb"),
    ];

    private static List<DictionaryEntry> QuestionWords() =>
    [
        E("kya", "کیا", "क्या", "what", "question"),
        E("kahan", "کہاں", "कहाँ", "where", "question"),
        E("kab", "کب", "कब", "when", "question"),
        E("kaun", "کون", "कौन", "who", "question"),
        E("kon", "کون", "कौन", "who", "question"),
        E("kyun", "کیوں", "क्यों", "why", "question"),
        E("kaise", "کیسے", "कैसे", "how", "question"),
        E("kitna", "کتنا", "कितना", "how much", "question"),
        E("kitne", "کتنے", "कितने", "how many", "question"),
        E("kidhar", "کدھر", "किधर", "which direction", "question"),
        E("kaisa", "کیسا", "कैसा", "how/what kind", "question"),
    ];

    private static List<DictionaryEntry> Prepositions() =>
    [
        E("mein", "میں", "में", "in", "preposition"),
        E("par", "پر", "पर", "on/at", "preposition"),
        E("se", "سے", "से", "from/with", "preposition"),
        E("ko", "کو", "को", "to", "preposition"),
        E("ke", "کے", "के", "of (m)", "preposition"),
        E("ki", "کی", "की", "of (f)", "preposition"),
        E("ka", "کا", "का", "of (m.sg)", "preposition"),
        E("tak", "تک", "तक", "until/up to", "preposition"),
        E("ke baad", "کے بعد", "के बाद", "after", "preposition"),
        E("ke pehle", "کے پہلے", "के पहले", "before", "preposition"),
        E("ke saath", "کے ساتھ", "के साथ", "with", "preposition"),
        E("ke liye", "کے لیے", "के लिए", "for", "preposition"),
        E("ke bina", "کے بغیر", "के बिना", "without", "preposition"),
    ];

    private static List<DictionaryEntry> Emotions() =>
    [
        E("pyar", "پیار", "प्यार", "love", "emotion"),
        E("gussa", "غصہ", "ग़ुस्सा", "anger", "emotion"),
        E("dar", "ڈر", "डर", "fear", "emotion"),
        E("hairat", "حیرت", "हैरत", "surprise", "emotion"),
        E("khushi", "خوشی", "ख़ुशी", "happiness", "emotion"),
        E("gham", "غم", "ग़म", "grief", "emotion"),
        E("sharm", "شرم", "शर्म", "shame", "emotion"),
        E("himmat", "ہمت", "हिम्मत", "courage", "emotion"),
        E("fikar", "فکر", "फ़िक्र", "worry", "emotion"),
        E("sakoon", "سکون", "सुकून", "peace/calm", "emotion"),
        E("umeed", "امید", "उम्मीद", "hope", "emotion"),
        E("mayoosi", "مایوسی", "मायूसी", "disappointment", "emotion"),
    ];

    private static List<DictionaryEntry> Colours() =>
    [
        E("laal", "لال", "लाल", "red", "colour"),
        E("neela", "نیلا", "नीला", "blue", "colour"),
        E("hara", "ہرا", "हरा", "green", "colour"),
        E("peela", "پیلا", "पीला", "yellow", "colour"),
        E("safed", "سفید", "सफ़ेद", "white", "colour"),
        E("kala", "کالا", "काला", "black", "colour"),
        E("narnji", "نارنجی", "नारंगी", "orange", "colour"),
        E("gulabi", "گلابی", "गुलाबी", "pink", "colour"),
        E("baingani", "بینگنی", "बैंगनी", "purple", "colour"),
        E("bhoora", "بھورا", "भूरा", "brown", "colour"),
    ];

    private static List<DictionaryEntry> Animals() =>
    [
        E("kutta", "کتا", "कुत्ता", "dog", "animal"),
        E("billi", "بلی", "बिल्ली", "cat", "animal"),
        E("ghora", "گھوڑا", "घोड़ा", "horse", "animal"),
        E("gaay", "گائے", "गाय", "cow", "animal"),
        E("bakri", "بکری", "बकरी", "goat", "animal"),
        E("sher", "شیر", "शेर", "lion", "animal"),
        E("haathi", "ہاتھی", "हाथी", "elephant", "animal"),
        E("machli", "مچھلی", "मछली", "fish", "animal"),
        E("chirya", "چڑیا", "चिड़िया", "bird", "animal"),
        E("murghi", "مرغی", "मुर्ग़ी", "hen/chicken", "animal"),
        E("saanp", "سانپ", "साँप", "snake", "animal"),
    ];

    private static List<DictionaryEntry> PlacesAndNature() =>
    [
        E("pakistan", "پاکستان", "पाकिस्तान", "Pakistan", "place"),
        E("hindustan", "ہندوستان", "हिंदुस्तान", "India", "place"),
        E("lahore", "لاہور", "लाहौर", "Lahore", "place"),
        E("karachi", "کراچی", "कराची", "Karachi", "place"),
        E("islamabad", "اسلام آباد", "इस्लामाबाद", "Islamabad", "place"),
        E("delhi", "دہلی", "दिल्ली", "Delhi", "place"),
        E("mumbai", "ممبئی", "मुंबई", "Mumbai", "place"),
        E("darya", "دریا", "दरिया", "river", "nature"),
        E("pahar", "پہاڑ", "पहाड़", "mountain", "nature"),
        E("samundar", "سمندر", "समंदर", "sea/ocean", "nature"),
        E("jangal", "جنگل", "जंगल", "forest/jungle", "nature"),
        E("aasmaan", "آسمان", "आसमान", "sky", "nature"),
        E("zameen", "زمین", "ज़मीन", "earth/land", "nature"),
        E("suraj", "سورج", "सूरज", "sun", "nature"),
        E("chand", "چاند", "चाँद", "moon", "nature"),
        E("sitara", "ستارہ", "सितारा", "star", "nature"),
        E("baarish", "بارش", "बारिश", "rain", "nature"),
        E("hawa", "ہوا", "हवा", "wind/air", "nature"),
        E("pani", "پانی", "पानी", "water", "nature"),
        E("aag", "آگ", "आग", "fire", "nature"),
        E("phool", "پھول", "फूल", "flower", "nature"),
        E("darakht", "درخت", "दरख़्त", "tree", "nature"),
    ];

    private static List<DictionaryEntry> MiscVocabulary() =>
    [
        E("haan", "ہاں", "हाँ", "yes", "misc"),
        E("nahi", "نہیں", "नहीं", "no", "misc"),
        E("nae", "نہیں", "नहीं", "no", "misc"),
        E("nahin", "نہیں", "नहीं", "no", "misc"),
        E("theek", "ٹھیک", "ठीक", "okay/fine", "misc"),
        E("aur", "اور", "और", "and/more", "misc"),
        E("ya", "یا", "या", "or", "misc"),
        E("lekin", "لیکن", "लेकिन", "but", "misc"),
        E("agar", "اگر", "अगर", "if", "misc"),
        E("to", "تو", "तो", "then", "misc"),
        E("warna", "ورنہ", "वरना", "otherwise", "misc"),
        E("isliye", "اسلیے", "इसलिए", "therefore", "misc"),
        E("matlab", "مطلب", "मतलब", "meaning", "misc"),
        E("masla", "مسئلہ", "मसला", "problem/issue", "misc"),
        E("jawab", "جواب", "जवाब", "answer", "misc"),
        E("sawal", "سوال", "सवाल", "question", "misc"),
        E("maqsad", "مقصد", "मक़सद", "purpose", "misc"),
        E("wajah", "وجہ", "वजह", "reason", "misc"),
        E("tareeqa", "طریقہ", "तरीक़ा", "method/way", "misc"),
        E("istemal", "استعمال", "इस्तेमाल", "use", "misc"),
        E("zaroorat", "ضرورت", "ज़रूरत", "need", "misc"),
        E("madad", "مدد", "मदद", "help", "misc"),
        E("shuru", "شروع", "शुरू", "start/beginning", "misc"),
        E("khatam", "ختم", "ख़तम", "end/finish", "misc"),
        E("tayyar", "تیار", "तैयार", "ready/prepared", "misc"),
        E("pasand", "پسند", "पसंद", "like/preference", "misc"),
        E("napasand", "ناپسند", "नापसंद", "dislike", "misc"),
        E("mumkin", "ممکن", "मुमकिन", "possible", "misc"),
        E("namumkin", "ناممکن", "नामुमकिन", "impossible", "misc"),
        E("wazeh", "واضح", "वाज़ेह", "obvious/clear", "misc"),
        E("naqaabil", "ناقابل", "नाक़ाबिल", "incapable/incredible", "misc"),
        E("yaqeen", "یقین", "यक़ीन", "belief/faith", "misc"),
        E("izzat", "عزت", "इज़्ज़त", "respect/honour", "misc"),
        E("taqat", "طاقت", "ताक़त", "power/strength", "misc"),
        E("insaaf", "انصاف", "इंसाफ़", "justice", "misc"),
        E("azaadi", "آزادی", "आज़ादी", "freedom", "misc"),
        E("aman", "امن", "अमन", "peace", "misc"),
        E("jang", "جنگ", "जंग", "war", "misc"),
        E("dunia", "دنیا", "दुनिया", "world", "misc"),
        E("duniya", "دنیا", "दुनिया", "world", "misc"),
        E("log", "لوگ", "लोग", "people", "misc"),
        E("cheez", "چیز", "चीज़", "thing", "misc"),
        E("jagah", "جگہ", "जगह", "place", "misc"),
        E("taraf", "طرف", "तरफ़", "side/direction", "misc"),
        E("haq", "حق", "हक़", "right/truth", "misc"),
        E("galat", "غلط", "ग़लत", "wrong", "misc"),
        E("sahi", "صحیح", "सही", "correct/right", "misc"),
    ];
}
