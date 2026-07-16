export interface TourNode {
  level: number;
  name: string;
  english: string;
  prev: string;
  prevEng: string;
  next: string;
  nextEng: string;
  prevDist: number;
  nextDist: number;
}

export function generateWorldTourNodes(): TourNode[] {
  const twCore = [
    "台北", "板橋", "樹林", "鶯歌", "桃園", "內壢", "中壢", "埔心", "楊梅", "富岡", "湖口", "新豐", "竹北", "新竹", "香山", "竹南", "造橋", "豐富", "苗栗", "南勢", "銅鑼", "三義", "后里", "豐原", "潭子", "太原", "台中", "大慶", "烏日", "成功", "彰化", "花壇", "大村", "員林", "永靖", "社頭", "田中", "二水", "林內", "石榴", "斗六", "斗南", "石龜", "大林", "民雄", "嘉義", "水上", "後壁", "新營", "柳營", "林鳳營", "隆田", "拔林", "善化", "新市", "永康", "大橋", "台南", "保安", "仁德", "中洲", "大湖", "路竹", "岡山", "橋頭", "楠梓", "新左營", "左營", "內惟", "美術館", "鼓山", "三塊厝", "高雄", "鳳山", "後庄", "九曲堂", "六塊厝", "屏東", "歸來", "麟洛", "西勢", "竹田", "潮州", "南州", "鎮安", "林邊", "佳冬", "東海", "枋寮", "加祿", "內獅", "枋山", "大武", "瀧溪", "金崙", "太麻里", "知本", "康樂", "台東", "山里", "鹿野", "瑞源", "瑞和", "關山", "海端", "池上", "富里", "東竹", "東里", "玉里", "三民", "瑞穗", "富源", "大富", "光復", "萬榮", "鳳林", "森榮", "豐田", "壽豐", "志學", "平和", "吉安", "花蓮", "北埔", "景美", "新城", "崇德", "和仁", "和平", "漢本", "武塔", "南澳", "東澳", "蘇澳新", "蘇澳", "冬山", "羅東", "中里", "二結", "宜蘭", "四城", "礁溪", "頂埔", "頭城", "外澳", "梗枋", "大溪", "大里", "石城", "福隆", "貢寮", "雙溪", "牡丹", "三貂嶺", "猴硐", "瑞芳", "四腳亭", "暖暖", "八堵", "七堵", "百福", "五堵", "汐止", "汐科", "南港", "松山"
  ];
  const twEngCore = [
    "Taipei", "Banqiao", "Shulin", "Yingge", "Taoyuan", "Neili", "Zhongli", "Puxin", "Yangmei", "Fugang", "Hukou", "Xinfeng", "Zhubei", "Hsinchu", "Xiangshan", "Zhunan", "Zaoqiao", "Fengfu", "Miaoli", "Nanshi", "Tongluo", "Sanyi", "Houli", "Fengyuan", "Tanzi", "Taiyuan", "Taichung", "Daqing", "Wuri", "Chenggong", "Changhua", "Huatan", "Dacun", "Yuanlin", "Yongjing", "Shetou", "Tianzhong", "Ershui", "Linnei", "Shiliu", "Douliu", "Dounan", "Shigui", "Dalin", "Minxiong", "Chiayi", "Shuishang", "Houbi", "Xinying", "Liuying", "Linfengying", "Longtian", "Balin", "Shanhua", "Xinshi", "Yongkang", "Daqiao", "Tainan", "Bao'an", "Rende", "Zhongzhou", "Dahu", "Luzhu", "Gangshan", "Qiaotou", "Nanzi", "Xinzuoying", "Zuoying", "Neiwei", "Museum of Fine Arts", "Gushan", "Sankuaicuo", "Kaohsiung", "Fengshan", "Houzhuang", "Jiuqutang", "Liuquaicuo", "Pingtung", "Guilai", "Linluo", "Xishi", "Zhutian", "Chaozhou", "Nanzhou", "Zhen'an", "Linbian", "Jiadong", "Donghai", "Fangliao", "Jalu", "Neishi", "Fangshan", "Dawu", "Longxi", "Jinlun", "Taimali", "Zhiben", "Kangle", "Taitung", "Shanli", "Luye", "Ruiyuan", "Ruihe", "Guanshan", "Haiduan", "Chishang", "Fuli", "Dongzhu", "Dongli", "Yuli", "Sanmin", "Ruisui", "Fuyuan", "Dafu", "Guangfu", "Wanrong", "Fenglin", "Senrong", "Fengtian", "Shoufeng", "Zhixue", "Pinghe", "Ji'an", "Hualien", "Beipu", "Jingmei", "Xincheng", "Chongde", "Heren", "Heping", "Hanben", "Wuta", "Nanao", "Dongao", "Suaoxin", "Suao", "Dongshan", "Luodong", "Zhongli", "Erjie", "Yilan", "Sicheng", "Jiaoxi", "Dingpu", "Toucheng", "Waiao", "Gengfang", "Daxi", "Dali", "Shicheng", "Fulong", "Gongliao", "Shuangxi", "Mudan", "Sandiaoling", "Houtong", "Ruifang", "Sijiaoting", "Nuannuan", "Badu", "Qidu", "Baifu", "Wudu", "Xizhi", "Xike", "Nangang", "Songshan"
  ];

  const jpCore = [
    "東京", "品川", "新橫濱", "小田原", "熱海", "三島", "新富士", "靜岡", "掛川", "濱松", "豐橋", "三河安城", "名古屋", "岐阜羽島", "米原", "京都", "新大阪", "新神戶", "西明石", "姬路", "相生", "岡山", "新倉敷", "福山", "府中", "三原", "東廣島", "廣島", "新岩國", "德山", "新山口", "厚狹", "新下關", "小倉", "博多", "博多南", "新鳥栖", "久留米", "筑後船小屋", "新大牟田", "新玉名", "熊本", "新八代", "水俣", "出水", "川內", "鹿兒島中央", "大宮", "上野", "熊谷", "本庄早稻田", "高崎", "越後湯澤", "長岡", "新潟", "輕井澤", "佐久平", "上田", "長野", "飯山", "上越妙高", "糸魚川", "黑部宇奈月溫泉", "富山", "新高岡", "金澤", "小松", "加賀溫泉", "蘆原溫泉", "福井", "越前武生", "敦賀", "宇都宮", "那須鹽原", "郡山", "福島", "白石藏王", "仙台", "古川", "一之關", "北上", "盛岡", "八戶", "新青森"
  ];
  const jpEngCore = [
    "Tokyo", "Shinagawa", "Shin-Yokohama", "Odawara", "Atami", "Mishima", "Shin-Fuji", "Shizuoka", "Kakegawa", "Hamamatsu", "Toyohashi", "Mikawa-Anjo", "Nagoya", "Gifu-Hashima", "Maibara", "Kyoto", "Shin-Osaka", "Shin-Kobe", "Nishi-Akashi", "Himeji", "Aioi", "Okayama", "Shin-Kurashiki", "Fukuyama", "Fuchu", "Mihara", "Higashi-Hiroshima", "Hiroshima", "Shin-Iwakuni", "Tokuyama", "Shin-Yamaguchi", "Asa", "Shin-Shimonoseki", "Kokura", "Hakata", "Hakata-Minami", "Shin-Tosu", "Kurume", "Chikugo-Funagoya", "Shin-Omuta", "Shin-Tamana", "Kumamoto", "Shin-Yatsushiro", "Minamata", "Izumi", "Sendai-jp", "Kagoshima-Chuo", "Omiya", "Ueno", "Kumagaya", "Honjo-Waseda", "Takasaki", "Echigo-Yuzawa", "Nagaoka", "Niigata", "Karuizawa", "Sakudaira", "Ueda", "Nagano", "Iiyama", "Joetsumyoko", "Itoigawa", "Kurobe-Unazukionsen", "Toyama", "Shin-Takaoka", "Kanazawa", "Komatsu", "Kagaonsen", "Awaraonsen", "Fukui", "Echizen-Takefu", "Tsuruga", "Utsunomiya", "Nasushiobara", "Koriyama", "Fukushima-jp", "Shiroishizao", "Sendai", "Furukawa", "Ichinoseki", "Kitakami", "Morioka", "Hachinohe", "Shin-Aomori"
  ];

  const usCore = [
    "紐約", "紐華克", "費城", "威明頓", "巴爾的摩", "華盛頓", "亞歷山卓", "里奇蒙", "亞特蘭大", "伯明罕", "紐奧良", "休士頓", "聖安東尼奧", "艾爾帕索", "土桑", "鳳凰城", "聖地牙哥", "洛杉磯", "聖塔芭芭拉", "聖荷西", "奧克蘭", "舊金山", "沙加緬度", "波特蘭", "西雅圖", "斯波坎", "鹽湖城", "丹佛", "堪薩斯城", "聖路易", "芝加哥", "密爾瓦基", "底特律", "克里夫蘭", "水牛城", "波士頓", "普羅維登斯", "紐哈芬", "哈特福", "春田", "匹茲堡", "辛辛那提", "印地安那", "孟菲斯", "納許維爾", "路易維爾", "夏洛特", "羅里", "紐波特紐斯", "塞爾馬", "邁阿密", "奧蘭多", "坦帕", "傑克遜維爾", "薩凡納", "查爾斯頓", "哥倫比亞", "巴吞魯日", "達拉斯", "沃斯堡", "奧斯汀", "阿布奎基", "旗桿市", "拉斯維加斯", "雷諾", "尤金", "塔科馬", "奧林匹亞", "博伊西"
  ];
  const usEngCore = [
    "New York", "Newark", "Philadelphia", "Wilmington", "Baltimore", "Washington D.C.", "Alexandria", "Richmond", "Atlanta", "Birmingham", "New Orleans", "Houston", "San Antonio", "El Paso", "Tucson", "Phoenix", "San Diego", "Los Angeles", "Santa Barbara", "San Jose", "Oakland", "San Francisco", "Sacramento", "Portland", "Seattle", "Spokane", "Salt Lake City", "Denver", "Kansas City", "St. Louis", "Chicago", "Milwaukee", "Detroit", "Cleveland", "Buffalo", "Boston", "Providence", "New Haven", "Hartford", "Springfield", "Pittsburgh", "Cincinnati", "Indianapolis", "Memphis", "Nashville", "Louisville", "Charlotte", "Raleigh", "Newport News", "Selma", "Miami", "Orlando", "Tampa", "Jacksonville", "Savannah", "Charleston", "Columbia", "Baton Rouge", "Dallas", "Fort Worth", "Austin", "Albuquerque", "Flagstaff", "Las Vegas", "Reno", "Eugene", "Tacoma", "Olympia", "Boise"
  ];

  const euCore = [
    "巴黎", "倫敦", "里爾", "布魯塞爾", "安特衛普", "鹿特丹", "阿姆斯特丹", "烏特勒支", "科隆", "杜塞道夫", "法蘭克福", "曼海姆", "卡爾斯魯爾", "斯圖加特", "烏姆", "奧格斯堡", "慕尼黑", "薩爾斯堡", "林茲", "聖波爾坦", "維也納", "布拉提斯拉瓦", "布達佩斯", "布拉格", "德勒斯登", "萊比錫", "柏林", "漢諾威", "漢堡", "哥本哈根", "馬爾默", "哥德堡", "奧斯陸", "斯德哥爾摩", "巴塞隆納", "馬德里", "塞維亞", "哥多華", "馬拉加", "瓦倫西亞", "里昂", "日內瓦", "洛桑", "伯恩", "蘇黎世", "巴塞爾", "盧加諾", "那不勒斯", "羅馬", "米蘭", "威尼斯", "佛羅倫斯", "杜林", "熱那亞", "尼斯", "馬賽", "蒙佩利爾", "土魯斯", "波爾多", "南特", "斯特拉斯堡", "盧森堡", "列日", "海牙", "格羅寧根", "不萊梅", "紐倫堡", "因斯布魯克"
  ];
  const euEngCore = [
    "Paris", "London", "Lille", "Brussels", "Antwerp", "Rotterdam", "Amsterdam", "Utrecht", "Cologne", "Dusseldorf", "Frankfurt", "Mannheim", "Karlsruhe", "Stuttgart", "Ulm", "Augsburg", "Munich", "Salzburg", "Linz", "St. Polten", "Vienna", "Bratislava", "Budapest", "Prague", "Dresden", "Leipzig", "Berlin", "Hannover", "Hamburg", "Copenhagen", "Malmo", "Gothenburg", "Oslo", "Stockholm", "Barcelona", "Madrid", "Seville", "Cordoba", "Malaga", "Valencia", "Lyon", "Geneva", "Lausanne", "Bern", "Zurich", "Basel", "Lugano", "Naples", "Rome", "Milan", "Venice", "Florence", "Turin", "Genoa", "Nice", "Marseille", "Montpellier", "Toulouse", "Bordeaux", "Nantes", "Strasbourg", "Luxembourg", "Liege", "The Hague", "Groningen", "Bremen", "Nuremberg", "Innsbruck"
  ];

  const expandList = (core: string[], engCore: string[], targetCount = 250) => {
    const list: { name: string; english: string }[] = [];
    for (let i = 0; i < core.length; i++) {
      list.push({ name: core[i], english: engCore[i] });
    }
    const prefixZH = ["東", "西", "南", "北", "新", "中", "上", "下"];
    const prefixEN = ["East", "West", "South", "North", "New", "Central", "Upper", "Lower"];
    
    const suffixZH = ["特區", "新城", "港", "口", "前", "山", "川", "野"];
    const suffixEN = ["District", "Metro", "Port", "Junction", "Front", "Hill", "River", "Field"];

    let index = 0;
    while (list.length < targetCount) {
      const base = core[index % core.length];
      const baseEng = engCore[index % engCore.length];
      
      const pIdx = Math.floor(index / core.length) % prefixZH.length;
      const sIdx = Math.floor(index / (core.length * prefixZH.length)) % suffixZH.length;
      
      let name = "";
      let english = "";
      
      if (index % 2 === 0) {
        name = prefixZH[pIdx] + base;
        english = prefixEN[pIdx] + " " + baseEng;
      } else {
        name = base + suffixZH[sIdx];
        english = baseEng + " " + suffixEN[sIdx];
      }

      if (!list.some(x => x.name === name)) {
        list.push({ name, english });
      }
      index++;
    }
    return list;
  };

  const twList = expandList(twCore, twEngCore, 250);
  const jpList = expandList(jpCore, jpEngCore, 250);
  const usList = expandList(usCore, usEngCore, 250);
  const euList = expandList(euCore, euEngCore, 250);

  const allNodes: TourNode[] = [];
  
  const buildRegion = (list: { name: string; english: string }[], offset: number) => {
    const len = list.length;
    for (let i = 0; i < len; i++) {
      const current = list[i];
      const prevIdx = (i - 1 + len) % len;
      const nextIdx = (i + 1) % len;
      
      const prevNode = list[prevIdx];
      const nextNode = list[nextIdx];
      
      const levelNum = offset + (i + 1);
      const prevDist = parseFloat((((levelNum * 17) % 15) + 5 + ((levelNum * 3) % 10) * 0.1).toFixed(1));
      const nextDist = parseFloat(((((levelNum + 1) * 17) % 15) + 5 + (((levelNum + 1) * 3) % 10) * 0.1).toFixed(1));

      allNodes.push({
        level: levelNum,
        name: current.name,
        english: current.english,
        prev: prevNode.name,
        prevEng: prevNode.english,
        next: nextNode.name,
        nextEng: nextNode.english,
        prevDist,
        nextDist
      });
    }
  };

  buildRegion(twList, 0);
  buildRegion(jpList, 250);
  buildRegion(usList, 500);
  buildRegion(euList, 750);

  return allNodes;
}
