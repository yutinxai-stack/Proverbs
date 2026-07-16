import { useState, useEffect, useRef } from "react";
import { generateLevel, setLevelOverrides } from "./utils/levelGenerator";
import { audioManager } from "./utils/audio";
import type { GameLevel, GridCell } from "./types";
import { WordBoard } from "./components/WordBoard";
import type { PoolWord } from "./components/WordBoard";
import { AuthModal } from "./components/AuthModal";
import { Leaderboard } from "./components/Leaderboard";
import { AdminPanel } from "./components/AdminPanel";
import { isFirebaseConfigured, db } from "./firebase";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";

interface TourNode {
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

const WORLD_TOUR_NODES: TourNode[] = [
  // === 🇹🇼 台灣環島幹線 (1 - 50) ===
  { level: 1, name: "台北", english: "Taipei", prev: "松山", prevEng: "Songshan", next: "板橋", nextEng: "Banqiao", prevDist: 6.4, nextDist: 7.8 },
  { level: 2, name: "板橋", english: "Banqiao", prev: "台北", prevEng: "Taipei", next: "樹林", nextEng: "Shulin", prevDist: 7.8, nextDist: 6.1 },
  { level: 3, name: "樹林", english: "Shulin", prev: "板橋", prevEng: "Banqiao", next: "鶯歌", nextEng: "Yingge", prevDist: 6.1, nextDist: 7.3 },
  { level: 4, name: "鶯歌", english: "Yingge", prev: "樹林", prevEng: "Shulin", next: "桃園", nextEng: "Taoyuan", prevDist: 7.3, nextDist: 8.2 },
  { level: 5, name: "桃園", english: "Taoyuan", prev: "鶯歌", prevEng: "Yingge", next: "中壢", nextEng: "Zhongli", prevDist: 8.2, nextDist: 9.5 },
  { level: 6, name: "中壢", english: "Zhongli", prev: "桃園", prevEng: "Taoyuan", next: "楊梅", nextEng: "Yangmei", prevDist: 9.5, nextDist: 8.8 },
  { level: 7, name: "楊梅", english: "Yangmei", prev: "中壢", prevEng: "Zhongli", next: "新竹", nextEng: "Hsinchu", prevDist: 8.8, nextDist: 21.3 },
  { level: 8, name: "新竹", english: "Hsinchu", prev: "楊梅", prevEng: "Yangmei", next: "竹南", nextEng: "Zhunan", prevDist: 21.3, nextDist: 15.6 },
  { level: 9, name: "竹南", english: "Zhunan", prev: "新竹", prevEng: "Hsinchu", next: "苗栗", nextEng: "Miaoli", prevDist: 15.6, nextDist: 15.0 },
  { level: 10, name: "苗栗", english: "Miaoli", prev: "竹南", prevEng: "Zhunan", next: "豐原", nextEng: "Fengyuan", prevDist: 15.0, nextDist: 43.5 },
  { level: 11, name: "豐原", english: "Fengyuan", prev: "苗栗", prevEng: "Miaoli", next: "台中", nextEng: "Taichung", prevDist: 43.5, nextDist: 11.2 },
  { level: 12, name: "台中", english: "Taichung", prev: "豐原", prevEng: "Fengyuan", next: "彰化", nextEng: "Changhua", prevDist: 11.2, nextDist: 17.5 },
  { level: 13, name: "彰化", english: "Changhua", prev: "台中", prevEng: "Taichung", next: "員林", nextEng: "Yuanlin", prevDist: 17.5, nextDist: 15.8 },
  { level: 14, name: "員林", english: "Yuanlin", prev: "彰化", prevEng: "Changhua", next: "田中", nextEng: "Tianzhong", prevDist: 15.8, nextDist: 11.4 },
  { level: 15, name: "田中", english: "Tianzhong", prev: "員林", prevEng: "Yuanlin", next: "斗六", nextEng: "Douliu", prevDist: 11.4, nextDist: 19.3 },
  { level: 16, name: "斗六", english: "Douliu", prev: "田中", prevEng: "Tianzhong", next: "嘉義", nextEng: "Chiayi", prevDist: 19.3, nextDist: 28.5 },
  { level: 17, name: "嘉義", english: "Chiayi", prev: "斗六", prevEng: "Douliu", next: "新營", nextEng: "Xinying", prevDist: 28.5, nextDist: 28.1 },
  { level: 18, name: "新營", english: "Xinying", prev: "嘉義", prevEng: "Chiayi", next: "台南", nextEng: "Tainan", prevDist: 28.1, nextDist: 41.7 },
  { level: 19, name: "台南", english: "Tainan", prev: "新營", prevEng: "Xinying", next: "岡山", nextEng: "Gangshan", prevDist: 41.7, nextDist: 31.2 },
  { level: 20, name: "岡山", english: "Gangshan", prev: "台南", prevEng: "Tainan", next: "新左營", nextEng: "Xinzuoying", prevDist: 31.2, nextDist: 11.8 },
  { level: 21, name: "新左營", english: "Xinzuoying", prev: "岡山", prevEng: "Gangshan", next: "高雄", nextEng: "Kaohsiung", prevDist: 11.8, nextDist: 6.8 },
  { level: 22, name: "高雄", english: "Kaohsiung", prev: "新左營", prevEng: "Kaohsiung", next: "鳳山", nextEng: "Fengshan", prevDist: 6.8, nextDist: 6.2 },
  { level: 23, name: "鳳山", english: "Fengshan", prev: "高雄", prevEng: "Kaohsiung", next: "屏東", nextEng: "Pingtung", prevDist: 6.2, nextDist: 15.0 },
  { level: 24, name: "屏東", english: "Pingtung", prev: "鳳山", prevEng: "Fengshan", next: "潮州", nextEng: "Chaozhou", prevDist: 15.0, nextDist: 15.2 },
  { level: 25, name: "潮州", english: "Chaozhou", prev: "屏東", prevEng: "Pingtung", next: "枋寮", nextEng: "Fangliao", prevDist: 15.2, nextDist: 20.1 },
  { level: 26, name: "枋寮", english: "Fangliao", prev: "潮州", prevEng: "Chaozhou", next: "大武", nextEng: "Dawu", prevDist: 20.1, nextDist: 46.2 },
  { level: 27, name: "大武", english: "Dawu", prev: "枋寮", prevEng: "Fangliao", next: "太麻里", nextEng: "Taimali", prevDist: 46.2, nextDist: 28.5 },
  { level: 28, name: "太麻里", english: "Taimali", prev: "大武", prevEng: "Dawu", next: "知本", nextEng: "Zhiben", prevDist: 28.5, nextDist: 11.7 },
  { level: 29, name: "知本", english: "Zhiben", prev: "太麻里", prevEng: "Taimali", next: "台東", nextEng: "Taitung", prevDist: 11.7, nextDist: 11.0 },
  { level: 30, name: "台東", english: "Taitung", prev: "知本", prevEng: "Zhiben", next: "關山", nextEng: "Guanshan", prevDist: 11.0, nextDist: 42.1 },
  { level: 31, name: "關山", english: "Guanshan", prev: "台東", prevEng: "Taitung", next: "池上", nextEng: "Chishang", prevDist: 42.1, nextDist: 14.1 },
  { level: 32, name: "池上", english: "Chishang", prev: "關山", prevEng: "Guanshan", next: "玉里", nextEng: "Yuli", prevDist: 14.1, nextDist: 25.1 },
  { level: 33, name: "玉里", english: "Yuli", prev: "池上", prevEng: "Chishang", next: "瑞穗", nextEng: "Ruisui", prevDist: 25.1, nextDist: 23.4 },
  { level: 34, name: "瑞穗", english: "Ruisui", prev: "玉里", prevEng: "Yuli", next: "光復", nextEng: "Guangfu", prevDist: 23.4, nextDist: 19.5 },
  { level: 35, name: "光復", english: "Guangfu", prev: "瑞穗", prevEng: "Ruisui", next: "鳳林", nextEng: "Fenglin", prevDist: 19.5, nextDist: 14.2 },
  { level: 36, name: "鳳林", english: "Fenglin", prev: "光復", prevEng: "Guangfu", next: "壽豐", nextEng: "Shoufeng", prevDist: 14.2, nextDist: 11.2 },
  { level: 37, name: "壽豐", english: "Shoufeng", prev: "鳳林", prevEng: "Fenglin", next: "花蓮", nextEng: "Hualien", prevDist: 11.2, nextDist: 17.1 },
  { level: 38, name: "花蓮", english: "Hualien", prev: "壽豐", prevEng: "Shoufeng", next: "新城", nextEng: "Xincheng", prevDist: 17.1, nextDist: 16.9 },
  { level: 39, name: "新城", english: "Xincheng", prev: "花蓮", prevEng: "Hualien", next: "南澳", nextEng: "Nanao", prevDist: 16.9, nextDist: 46.2 },
  { level: 40, name: "南澳", english: "Nanao", prev: "新城", prevEng: "Xincheng", next: "東澳", nextEng: "Dongao", prevDist: 46.2, nextDist: 11.0 },
  { level: 41, name: "東澳", english: "Dongao", prev: "南澳", prevEng: "Nanao", next: "蘇澳新", nextEng: "Suaoxin", prevDist: 11.0, nextDist: 8.2 },
  { level: 42, name: "蘇澳新", english: "Suaoxin", prev: "東澳", prevEng: "Dongao", next: "羅東", nextEng: "Luodong", prevDist: 8.2, nextDist: 8.3 },
  { level: 43, name: "羅東", english: "Luodong", prev: "蘇澳新", prevEng: "Suaoxin", next: "宜蘭", nextEng: "Yilan", prevDist: 8.3, nextDist: 7.9 },
  { level: 44, name: "宜蘭", english: "Yilan", prev: "羅東", prevEng: "Luodong", next: "礁溪", nextEng: "Jiaoxi", prevDist: 7.9, nextDist: 9.0 },
  { level: 45, name: "礁溪", english: "Jiaoxi", prev: "宜蘭", prevEng: "Yilan", next: "頭城", nextEng: "Toucheng", prevDist: 9.0, nextDist: 5.6 },
  { level: 46, name: "頭城", english: "Toucheng", prev: "礁溪", prevEng: "Jiaoxi", next: "福隆", nextEng: "Fulong", prevDist: 5.6, nextDist: 32.1 },
  { level: 47, name: "福隆", english: "Fulong", prev: "頭城", prevEng: "Toucheng", next: "瑞芳", nextEng: "Ruifang", prevDist: 32.1, nextDist: 21.0 },
  { level: 48, name: "瑞芳", english: "Ruifang", prev: "福隆", prevEng: "Fulong", next: "基隆", nextEng: "Keelung", prevDist: 21.0, nextDist: 12.0 },
  { level: 49, name: "基隆", english: "Keelung", prev: "瑞芳", prevEng: "Ruifang", next: "松山", nextEng: "Songshan", prevDist: 12.0, nextDist: 20.3 },
  { level: 50, name: "松山", english: "Songshan", prev: "基隆", prevEng: "Keelung", next: "台北", nextEng: "Taipei", prevDist: 20.3, nextDist: 6.4 },

  // === 🇯🇵 日本新幹線幹線 (51 - 100) ===
  { level: 51, name: "東京", english: "Tokyo", prev: "長野", prevEng: "Nagano", next: "品川", nextEng: "Shinagawa", prevDist: 222.4, nextDist: 6.8 },
  { level: 52, name: "品川", english: "Shinagawa", prev: "東京", prevEng: "Tokyo", next: "新橫濱", nextEng: "Shin-Yokohama", prevDist: 6.8, nextDist: 22.0 },
  { level: 53, name: "新橫濱", english: "Shin-Yokohama", prev: "品川", prevEng: "Shinagawa", next: "小田原", nextEng: "Odawara", prevDist: 22.0, nextDist: 55.1 },
  { level: 54, name: "小田原", english: "Odawara", prev: "新橫濱", prevEng: "Shin-Yokohama", next: "熱海", nextEng: "Atami", prevDist: 55.1, nextDist: 20.7 },
  { level: 55, name: "熱海", english: "Atami", prev: "小田原", prevEng: "Odawara", next: "三島", nextEng: "Mishima", prevDist: 20.7, nextDist: 16.1 },
  { level: 56, name: "三島", english: "Mishima", prev: "熱海", prevEng: "Atami", next: "新富士", nextEng: "Shin-Fuji", prevDist: 16.1, nextDist: 34.0 },
  { level: 57, name: "新富士", english: "Shin-Fuji", prev: "三島", prevEng: "Mishima", next: "靜岡", nextEng: "Shizuoka", prevDist: 34.0, nextDist: 34.0 },
  { level: 58, name: "靜岡", english: "Shizuoka", prev: "新富士", prevEng: "Shin-Fuji", next: "掛川", nextEng: "Kakegawa", prevDist: 34.0, nextDist: 49.1 },
  { level: 59, name: "掛川", english: "Kakegawa", prev: "靜岡", prevEng: "Shizuoka", next: "濱松", nextEng: "Hamamatsu", prevDist: 49.1, nextDist: 27.8 },
  { level: 60, name: "濱松", english: "Hamamatsu", prev: "掛川", prevEng: "Kakegawa", next: "豐橋", nextEng: "Toyohashi", prevDist: 27.8, nextDist: 36.5 },
  { level: 61, name: "豐橋", english: "Toyohashi", prev: "濱松", prevEng: "Hamamatsu", next: "三河安城", nextEng: "Mikawa-Anjo", prevDist: 36.5, nextDist: 44.1 },
  { level: 62, name: "三河安城", english: "Mikawa-Anjo", prev: "豐橋", prevEng: "Toyohashi", next: "名古屋", nextEng: "Nagoya", prevDist: 44.1, nextDist: 29.0 },
  { level: 63, name: "名古屋", english: "Nagoya", prev: "三河安城", prevEng: "Mikawa-Anjo", next: "岐阜羽島", nextEng: "Gifu-Hashima", prevDist: 29.0, nextDist: 30.2 },
  { level: 64, name: "岐阜羽島", english: "Gifu-Hashima", prev: "名古屋", prevEng: "Nagoya", next: "米原", nextEng: "Maibara", prevDist: 30.2, nextDist: 39.6 },
  { level: 65, name: "米原", english: "Maibara", prev: "岐阜羽島", prevEng: "Gifu-Hashima", next: "京都", nextEng: "Kyoto", prevDist: 39.6, nextDist: 68.1 },
  { level: 66, name: "京都", english: "Kyoto", prev: "米原", prevEng: "Maibara", next: "新大阪", nextEng: "Shin-Osaka", prevDist: 68.1, nextDist: 39.0 },
  { level: 67, name: "新大阪", english: "Shin-Osaka", prev: "京都", prevEng: "Kyoto", next: "新神戶", nextEng: "Shin-Kobe", prevDist: 39.0, nextDist: 32.6 },
  { level: 68, name: "新神戶", english: "Shin-Kobe", prev: "新大阪", prevEng: "Shin-Osaka", next: "姬路", nextEng: "Himeji", prevDist: 32.6, nextDist: 55.4 },
  { level: 69, name: "姬路", english: "Himeji", prev: "新神戶", prevEng: "Shin-Kobe", next: "相生", nextEng: "Aioi", prevDist: 55.4, nextDist: 20.0 },
  { level: 70, name: "相生", english: "Aioi", prev: "姬路", prevEng: "Himeji", next: "岡山", nextEng: "Okayama", prevDist: 20.0, nextDist: 55.0 },
  { level: 71, name: "岡山", english: "Okayama", prev: "相生", prevEng: "Aioi", next: "福山", nextEng: "Fukuyama", prevDist: 55.0, nextDist: 58.3 },
  { level: 72, name: "福山", english: "Fukuyama", prev: "岡山", prevEng: "Okayama", next: "三原", nextEng: "Mihara", prevDist: 58.3, nextDist: 30.9 },
  { level: 73, name: "三原", english: "Mihara", prev: "福山", prevEng: "Fukuyama", next: "東廣島", nextEng: "Higashi-Hiroshima", prevDist: 30.9, nextDist: 40.5 },
  { level: 74, name: "東廣島", english: "Higashi-Hiroshima", prev: "三原", prevEng: "Mihara", next: "廣島", nextEng: "Hiroshima", prevDist: 40.5, nextDist: 31.9 },
  { level: 75, name: "廣島", english: "Hiroshima", prev: "東廣島", prevEng: "Higashi-Hiroshima", next: "新岩國", nextEng: "Shin-Iwakuni", prevDist: 31.9, nextDist: 43.6 },
  { level: 76, name: "新岩國", english: "Shin-Iwakuni", prev: "廣島", prevEng: "Hiroshima", next: "德山", nextEng: "Tokuyama", prevDist: 43.6, nextDist: 52.8 },
  { level: 77, name: "德山", english: "Tokuyama", prev: "新岩國", prevEng: "Shin-Iwakuni", next: "新山口", nextEng: "Shin-Yamaguchi", prevDist: 52.8, nextDist: 44.3 },
  { level: 78, name: "新山口", english: "Shin-Yamaguchi", prev: "德山", prevEng: "Tokuyama", next: "厚狹", nextEng: "Asa", prevDist: 44.3, nextDist: 26.6 },
  { level: 79, name: "厚狹", english: "Asa", prev: "新山口", prevEng: "Shin-Yamaguchi", next: "新下關", nextEng: "Shin-Shimonoseki", prevDist: 26.6, nextDist: 25.4 },
  { level: 80, name: "新下關", english: "Shin-Shimonoseki", prev: "厚狹", prevEng: "Asa", next: "小倉", nextEng: "Kokura", prevDist: 25.4, nextDist: 19.0 },
  { level: 81, name: "小倉", english: "Kokura", prev: "新下關", prevEng: "Shin-Shimonoseki", next: "博多", nextEng: "Hakata", prevDist: 19.0, nextDist: 67.2 },
  { level: 82, name: "博多", english: "Hakata", prev: "小倉", prevEng: "Kokura", next: "新鳥栖", nextEng: "Shin-Tosu", prevDist: 67.2, nextDist: 26.3 },
  { level: 83, name: "新鳥栖", english: "Shin-Tosu", prev: "博多", prevEng: "Hakata", next: "久留米", nextEng: "Kurume", prevDist: 26.3, nextDist: 7.1 },
  { level: 84, name: "久留米", english: "Kurume", prev: "新鳥栖", prevEng: "Shin-Tosu", next: "筑後船小屋", nextEng: "Chikugo-Funagoya", prevDist: 7.1, nextDist: 16.2 },
  { level: 85, name: "筑後船小屋", english: "Chikugo-Funagoya", prev: "久留米", prevEng: "Kurume", next: "新大牟田", nextEng: "Shin-Omuta", prevDist: 16.2, nextDist: 15.4 },
  { level: 86, name: "新大牟田", english: "Shin-Omuta", prev: "筑後船小屋", prevEng: "Chikugo-Funagoya", next: "新玉名", nextEng: "Shin-Tamana", prevDist: 15.4, nextDist: 19.5 },
  { level: 87, name: "新玉名", english: "Shin-Tamana", prev: "新大牟田", prevEng: "Shin-Omuta", next: "熊本", nextEng: "Kumamoto", prevDist: 19.5, nextDist: 32.8 },
  { level: 88, name: "熊本", english: "Kumamoto", prev: "新玉名", prevEng: "Shin-Tamana", next: "新八代", nextEng: "Shin-Yatsushiro", prevDist: 32.8, nextDist: 37.8 },
  { level: 89, name: "新八代", english: "Shin-Yatsushiro", prev: "熊本", prevEng: "Kumamoto", next: "水俣", nextEng: "Minamata", prevDist: 37.8, nextDist: 43.1 },
  { level: 90, name: "水俣", english: "Minamata", prev: "新八代", prevEng: "Shin-Yatsushiro", next: "出水", nextEng: "Izumi", prevDist: 43.1, nextDist: 17.5 },
  { level: 91, name: "出水", english: "Izumi", prev: "水俣", prevEng: "Minamata", next: "川內", nextEng: "Sendai", prevDist: 17.5, nextDist: 32.9 },
  { level: 92, name: "川內", english: "Sendai", prev: "出水", prevEng: "Izumi", next: "鹿兒島中央", nextEng: "Kagoshima-Chuo", prevDist: 32.9, nextDist: 46.1 },
  { level: 93, name: "鹿兒島中央", english: "Kagoshima-Chuo", prev: "川內", prevEng: "Sendai", next: "福島", nextEng: "Fukushima", prevDist: 46.1, nextDist: 980.2 },
  { level: 94, name: "福島", english: "Fukushima", prev: "鹿兒島中央", prevEng: "Kagoshima-Chuo", next: "仙台", nextEng: "Sendai", prevDist: 980.2, nextDist: 78.8 },
  { level: 95, name: "仙台", english: "Sendai", prev: "福島", prevEng: "Fukushima", next: "盛岡", nextEng: "Morioka", prevDist: 78.8, nextDist: 175.7 },
  { level: 96, name: "盛岡", english: "Morioka", prev: "仙台", prevEng: "Sendai", next: "八戶", nextEng: "Hachinohe", prevDist: 175.7, nextDist: 96.6 },
  { level: 97, name: "八戶", english: "Hachinohe", prev: "盛岡", prevEng: "Morioka", next: "新青森", nextEng: "Shin-Aomori", prevDist: 96.6, nextDist: 81.8 },
  { level: 98, name: "新青森", english: "Shin-Aomori", prev: "八戶", prevEng: "Hachinohe", next: "輕井澤", nextEng: "Karuizawa", prevDist: 81.8, nextDist: 430.5 },
  { level: 99, name: "輕井澤", english: "Karuizawa", prev: "新青森", prevEng: "Shin-Aomori", next: "長野", nextEng: "Nagano", prevDist: 430.5, nextDist: 75.6 },
  { level: 100, name: "長野", english: "Nagano", prev: "輕井澤", prevEng: "Karuizawa", next: "東京", nextEng: "Tokyo", prevDist: 75.6, nextDist: 222.4 },

  // === 🇺🇸 美國跨州美鐵幹線 (101 - 150) ===
  { level: 101, name: "紐約", english: "New York", prev: "塞爾馬", prevEng: "Selma", next: "紐華克", nextEng: "Newark", prevDist: 1300.2, nextDist: 16.2 },
  { level: 102, name: "紐華克", english: "Newark", prev: "紐約", prevEng: "New York", next: "費城", nextEng: "Philadelphia", prevDist: 16.2, nextDist: 130.4 },
  { level: 103, name: "費城", english: "Philadelphia", prev: "紐華克", prevEng: "Newark", next: "威明頓", nextEng: "Wilmington", prevDist: 130.4, nextDist: 40.2 },
  { level: 104, name: "威明頓", english: "Wilmington", prev: "費城", prevEng: "Philadelphia", next: "巴爾的摩", nextEng: "Baltimore", prevDist: 40.2, nextDist: 110.5 },
  { level: 105, name: "巴爾的摩", english: "Baltimore", prev: "威明頓", prevEng: "Wilmington", next: "華盛頓", nextEng: "Washington D.C.", prevDist: 110.5, nextDist: 64.3 },
  { level: 106, name: "華盛頓", english: "Washington D.C.", prev: "巴爾的摩", prevEng: "Baltimore", next: "亞歷山卓", nextEng: "Alexandria", prevDist: 64.3, nextDist: 12.8 },
  { level: 107, name: "亞歷山卓", english: "Alexandria", prev: "華盛頓", prevEng: "Washington D.C.", next: "里奇蒙", nextEng: "Richmond", prevDist: 12.8, nextDist: 154.5 },
  { level: 108, name: "里奇蒙", english: "Richmond", prev: "亞歷山卓", prevEng: "Alexandria", next: "亞特蘭大", nextEng: "Atlanta", prevDist: 154.5, nextDist: 820.6 },
  { level: 109, name: "亞特蘭大", english: "Atlanta", prev: "里奇蒙", prevEng: "Richmond", next: "伯明罕", nextEng: "Birmingham", prevDist: 820.6, nextDist: 236.5 },
  { level: 110, name: "伯明罕", english: "Birmingham", prev: "亞特蘭大", prevEng: "Atlanta", next: "紐奧良", nextEng: "New Orleans", prevDist: 236.5, nextDist: 560.2 },
  { level: 111, name: "紐奧良", english: "New Orleans", prev: "伯明罕", prevEng: "Birmingham", next: "休士頓", nextEng: "Houston", prevDist: 560.2, nextDist: 580.4 },
  { level: 112, name: "休士頓", english: "Houston", prev: "紐奧良", prevEng: "New Orleans", next: "聖安東尼奧", nextEng: "San Antonio", prevDist: 580.4, nextDist: 340.2 },
  { level: 113, name: "聖安東尼奧", english: "San Antonio", prev: "休士頓", prevEng: "Houston", next: "艾爾帕索", nextEng: "El Paso", prevDist: 340.2, nextDist: 980.5 },
  { level: 114, name: "艾爾帕索", english: "El Paso", prev: "聖安東尼奧", prevEng: "San Antonio", next: "土桑", nextEng: "Tucson", prevDist: 340.2, nextDist: 512.6 },
  { level: 115, name: "土桑", english: "Tucson", prev: "艾爾帕索", prevEng: "El Paso", next: "鳳原", nextEng: "Phoenix", prevDist: 512.6, nextDist: 188.4 },
  { level: 116, name: "鳳原", english: "Phoenix", prev: "土桑", prevEng: "Tucson", next: "聖地牙哥", nextEng: "San Diego", prevDist: 188.4, nextDist: 560.2 },
  { level: 117, name: "聖地牙哥", english: "San Diego", prev: "鳳原", prevEng: "Phoenix", next: "洛杉磯", nextEng: "Los Angeles", prevDist: 560.2, nextDist: 195.4 },
  { level: 118, name: "洛杉磯", english: "Los Angeles", prev: "聖地牙哥", prevEng: "San Diego", next: "聖塔芭芭拉", nextEng: "Santa Barbara", prevDist: 195.4, nextDist: 168.0 },
  { level: 119, name: "聖塔芭芭拉", english: "Santa Barbara", prev: "洛杉磯", prevEng: "Los Angeles", next: "聖荷西", nextEng: "San Jose", prevDist: 168.0, nextDist: 430.5 },
  { level: 120, name: "聖荷西", english: "San Jose", prev: "聖塔芭芭拉", prevEng: "Santa Barbara", next: "奧克蘭", nextEng: "Oakland", prevDist: 430.5, nextDist: 68.2 },
  { level: 121, name: "奧克蘭", english: "Oakland", prev: "聖荷西", prevEng: "San Jose", next: "舊金山", nextEng: "San Francisco", prevDist: 68.2, nextDist: 15.5 },
  { level: 122, name: "舊金山", english: "San Francisco", prev: "奧克蘭", prevEng: "Oakland", next: "沙加緬度", nextEng: "Sacramento", prevDist: 15.5, nextDist: 140.2 },
  { level: 123, name: "沙加緬度", english: "Sacramento", prev: "舊金山", prevEng: "San Francisco", next: "波特蘭", nextEng: "Portland", prevDist: 140.2, nextDist: 980.4 },
  { level: 124, name: "波特蘭", english: "Portland", prev: "沙加緬度", prevEng: "Sacramento", next: "西雅圖", nextEng: "Seattle", prevDist: 980.4, nextDist: 280.5 },
  { level: 125, name: "西雅圖", english: "Seattle", prev: "波特蘭", prevEng: "Portland", next: "斯波坎", nextEng: "Spokane", prevDist: 280.5, nextDist: 512.6 },
  { level: 126, name: "斯波坎", english: "Spokane", prev: "西雅圖", prevEng: "Seattle", next: "鹽湖城", nextEng: "Salt Lake City", prevDist: 512.6, nextDist: 980.2 },
  { level: 127, name: "鹽湖城", english: "Salt Lake City", prev: "斯波坎", prevEng: "Spokane", next: "丹佛", nextEng: "Denver", prevDist: 980.2, nextDist: 850.4 },
  { level: 128, name: "丹佛", english: "Denver", prev: "鹽湖城", prevEng: "Salt Lake City", next: "堪薩斯城", nextEng: "Kansas City", prevDist: 850.4, nextDist: 960.5 },
  { level: 129, name: "堪薩斯城", english: "Kansas City", prev: "丹佛", prevEng: "Denver", next: "聖路易", nextEng: "St. Louis", prevDist: 960.5, nextDist: 400.2 },
  { level: 130, name: "聖路易", english: "St. Louis", prev: "堪薩斯城", prevEng: "Kansas City", next: "芝加哥", nextEng: "Chicago", prevDist: 400.2, nextDist: 480.6 },
  { level: 131, name: "芝加哥", english: "Chicago", prev: "聖路易", prevEng: "St. Louis", next: "密爾瓦基", nextEng: "Milwaukee", prevDist: 480.6, nextDist: 140.3 },
  { level: 132, name: "密爾瓦基", english: "Milwaukee", prev: "芝加哥", prevEng: "Chicago", next: "底特律", nextEng: "Detroit", prevDist: 140.3, nextDist: 450.2 },
  { level: 133, name: "底特律", english: "Detroit", prev: "密爾瓦基", prevEng: "Milwaukee", next: "克里夫蘭", nextEng: "Cleveland", prevDist: 450.2, nextDist: 270.5 },
  { level: 134, name: "克里夫蘭", english: "Cleveland", prev: "底特律", prevEng: "Detroit", next: "水牛城", nextEng: "Buffalo", prevDist: 270.5, nextDist: 305.8 },
  { level: 135, name: "水牛城", english: "Buffalo", prev: "克里夫蘭", prevEng: "Cleveland", next: "波士頓", nextEng: "Boston", prevDist: 305.8, nextDist: 720.4 },
  { level: 136, name: "波士頓", english: "Boston", prev: "水牛城", prevEng: "Buffalo", next: "普羅維登斯", nextEng: "Providence", prevDist: 720.4, nextDist: 80.2 },
  { level: 137, name: "普羅維登斯", english: "Providence", prev: "波士頓", prevEng: "Boston", next: "紐哈芬", nextEng: "New Haven", prevDist: 80.2, nextDist: 180.4 },
  { level: 138, name: "紐哈芬", english: "New Haven", prev: "普羅維登斯", prevEng: "Providence", next: "哈特福", nextEng: "Hartford", prevDist: 180.4, nextDist: 60.5 },
  { level: 139, name: "哈特福", english: "Hartford", prev: "紐哈芬", prevEng: "New Haven", next: "春田", nextEng: "Springfield", prevDist: 60.5, nextDist: 45.2 },
  { level: 140, name: "春田", english: "Springfield", prev: "哈特福", prevEng: "Hartford", next: "匹茲堡", nextEng: "Pittsburgh", prevDist: 45.2, nextDist: 620.4 },
  { level: 141, name: "匹茲堡", english: "Pittsburgh", prev: "春田", prevEng: "Springfield", next: "辛辛那提", nextEng: "Cincinnati", prevDist: 620.4, nextDist: 460.5 },
  { level: 142, name: "辛辛那提", english: "Cincinnati", prev: "匹茲堡", prevEng: "Pittsburgh", next: "印地安那", nextEng: "Indianapolis", prevDist: 460.5, nextDist: 180.2 },
  { level: 143, name: "印地安那", english: "Indianapolis", prev: "辛辛那提", prevEng: "Cincinnati", next: "孟菲斯", nextEng: "Memphis", prevDist: 180.2, nextDist: 750.4 },
  { level: 144, name: "孟菲斯", english: "Memphis", prev: "印地安那", prevEng: "Indianapolis", next: "納許維爾", nextEng: "Nashville", prevDist: 750.4, nextDist: 340.2 },
  { level: 145, name: "納許維爾", english: "Nashville", prev: "孟菲斯", prevEng: "Memphis", next: "路易維爾", nextEng: "Louisville", prevDist: 340.2, nextDist: 280.5 },
  { level: 146, name: "路易維爾", english: "Louisville", prev: "納許維爾", prevEng: "Nashville", next: "夏洛特", nextEng: "Charlotte", prevDist: 280.5, nextDist: 640.2 },
  { level: 147, name: "夏洛特", english: "Charlotte", prev: "路易維爾", prevEng: "Louisville", next: "羅里", nextEng: "Raleigh", prevDist: 640.2, nextDist: 210.5 },
  { level: 148, name: "羅里", english: "Raleigh", prev: "夏洛特", prevEng: "Charlotte", next: "紐波特紐斯", nextEng: "Newport News", prevDist: 210.5, nextDist: 240.5 },
  { level: 149, name: "紐波特紐斯", english: "Newport News", prev: "羅里", prevEng: "Raleigh", next: "塞爾馬", nextEng: "Selma", prevDist: 240.5, nextDist: 120.4 },
  { level: 150, name: "塞爾馬", english: "Selma", prev: "紐波特紐斯", prevEng: "Newport News", next: "紐約", nextEng: "New York", prevDist: 120.4, nextDist: 1300.2 },

  // === 🇪🇺 歐洲高鐵幹線 (151 - 200) ===
  { level: 151, name: "巴黎", english: "Paris", prev: "米蘭", prevEng: "Milan", next: "倫敦", nextEng: "London", prevDist: 850.5, nextDist: 457.2 },
  { level: 152, name: "倫敦", english: "London", prev: "巴黎", prevEng: "Paris", next: "里爾", nextEng: "Lille", prevDist: 457.2, nextDist: 266.5 },
  { level: 153, name: "里爾", english: "Lille", prev: "倫敦", prevEng: "London", next: "布魯塞爾", nextEng: "Brussels", prevDist: 266.5, nextDist: 110.2 },
  { level: 154, name: "布魯塞爾", english: "Brussels", prev: "里爾", prevEng: "Lille", next: "安特衛普", nextEng: "Antwerp", prevDist: 110.2, nextDist: 48.6 },
  { level: 155, name: "安特衛普", english: "Antwerp", prev: "布魯塞爾", prevEng: "Brussels", next: "鹿特丹", nextEng: "Rotterdam", prevDist: 48.6, nextDist: 98.4 },
  { level: 156, name: "鹿特丹", english: "Rotterdam", prev: "安特衛普", prevEng: "Antwerp", next: "阿姆斯特丹", nextEng: "Amsterdam", prevDist: 98.4, nextDist: 74.2 },
  { level: 157, name: "阿姆斯特丹", english: "Amsterdam", prev: "鹿特丹", prevEng: "Rotterdam", next: "烏特勒支", nextEng: "Utrecht", prevDist: 74.2, nextDist: 40.5 },
  { level: 158, name: "烏特勒支", english: "Utrecht", prev: "阿姆斯特丹", prevEng: "Amsterdam", next: "科隆", nextEng: "Cologne", prevDist: 40.5, nextDist: 220.4 },
  { level: 159, name: "科隆", english: "Cologne", prev: "烏特勒支", prevEng: "Utrecht", next: "杜塞道夫", nextEng: "Dusseldorf", prevDist: 220.4, nextDist: 40.1 },
  { level: 160, name: "杜塞道夫", english: "Dusseldorf", prev: "科隆", prevEng: "Cologne", next: "法蘭克福", nextEng: "Frankfurt", prevDist: 40.1, nextDist: 228.5 },
  { level: 161, name: "法蘭克福", english: "Frankfurt", prev: "杜塞道夫", prevEng: "Dusseldorf", next: "曼海姆", nextEng: "Mannheim", prevDist: 228.5, nextDist: 80.6 },
  { level: 162, name: "曼海姆", english: "Mannheim", prev: "法蘭克福", prevEng: "Frankfurt", next: "卡爾斯魯爾", nextEng: "Karlsruhe", prevDist: 80.6, nextDist: 74.3 },
  { level: 163, name: "卡爾斯魯爾", english: "Karlsruhe", prev: "曼海姆", prevEng: "Mannheim", next: "斯圖加特", nextEng: "Stuttgart", prevDist: 74.3, nextDist: 80.2 },
  { level: 164, name: "斯圖加特", english: "Stuttgart", prev: "卡爾斯魯爾", prevEng: "Karlsruhe", next: "烏姆", nextEng: "Ulm", prevDist: 80.2, nextDist: 90.5 },
  { level: 165, name: "烏姆", english: "Ulm", prev: "斯圖加特", prevEng: "Stuttgart", next: "奧格斯堡", nextEng: "Augsburg", prevDist: 90.5, nextDist: 84.6 },
  { level: 166, name: "奧格斯堡", english: "Augsburg", prev: "烏姆", prevEng: "Ulm", next: "慕尼黑", nextEng: "Munich", prevDist: 84.6, nextDist: 68.1 },
  { level: 167, name: "慕尼黑", english: "Munich", prev: "奧格斯堡", prevEng: "Augsburg", next: "薩爾斯堡", nextEng: "Salzburg", prevDist: 68.1, nextDist: 145.2 },
  { level: 168, name: "薩爾斯堡", english: "Salzburg", prev: "慕尼黑", prevEng: "Munich", next: "林茲", nextEng: "Linz", prevDist: 145.2, nextDist: 120.4 },
  { level: 169, name: "林茲", english: "Linz", prev: "薩爾斯堡", prevEng: "Salzburg", next: "聖波爾坦", nextEng: "St. Polten", prevDist: 120.4, nextDist: 80.5 },
  { level: 170, name: "聖波爾坦", english: "St. Polten", prev: "林茲", prevEng: "Linz", next: "維也納", nextEng: "Vienna", prevDist: 80.5, nextDist: 60.2 },
  { level: 171, name: "維也納", english: "Vienna", prev: "聖波爾坦", prevEng: "St. Polten", next: "布拉提斯拉瓦", nextEng: "Bratislava", prevDist: 60.2, nextDist: 80.4 },
  { level: 172, name: "布拉提斯拉瓦", english: "Bratislava", prev: "維也納", prevEng: "Vienna", next: "布達佩斯", nextEng: "Budapest", prevDist: 80.4, nextDist: 200.5 },
  { level: 173, name: "布達佩斯", english: "Budapest", prev: "布拉提斯拉瓦", prevEng: "Bratislava", next: "布拉格", nextEng: "Prague", prevDist: 200.5, nextDist: 530.4 },
  { level: 174, name: "布拉格", english: "Prague", prev: "布達佩斯", prevEng: "Budapest", next: "德勒斯登", nextEng: "Dresden", prevDist: 530.4, nextDist: 150.2 },
  { level: 175, name: "德勒斯登", english: "Dresden", prev: "布拉格", prevEng: "Prague", next: "萊比錫", nextEng: "Leipzig", prevDist: 150.2, nextDist: 120.5 },
  { level: 176, name: "萊比錫", english: "Leipzig", prev: "德勒斯登", prevEng: "Dresden", next: "柏林", nextEng: "Berlin", prevDist: 120.5, nextDist: 190.4 },
  { level: 177, name: "柏林", english: "Berlin", prev: "萊比錫", prevEng: "Leipzig", next: "漢諾威", nextEng: "Hannover", prevDist: 190.4, nextDist: 290.2 },
  { level: 178, name: "漢諾威", english: "Hannover", prev: "柏林", prevEng: "Berlin", next: "漢堡", nextEng: "Hamburg", prevDist: 290.2, nextDist: 150.6 },
  { level: 179, name: "漢堡", english: "Hamburg", prev: "漢諾威", prevEng: "Hannover", next: "哥本哈根", nextEng: "Copenhagen", prevDist: 150.6, nextDist: 340.2 },
  { level: 180, name: "哥本哈根", english: "Copenhagen", prev: "漢堡", prevEng: "Hamburg", next: "馬爾默", nextEng: "Malmo", prevDist: 340.2, nextDist: 40.5 },
  { level: 181, name: "馬爾默", english: "Malmo", prev: "哥本哈根", prevEng: "Copenhagen", next: "哥德堡", nextEng: "Gothenburg", prevDist: 40.5, nextDist: 270.4 },
  { level: 182, name: "哥德堡", english: "Gothenburg", prev: "馬爾默", prevEng: "Malmo", next: "奧斯陸", nextEng: "Oslo", prevDist: 270.4, nextDist: 290.2 },
  { level: 183, name: "奧斯陸", english: "Oslo", prev: "哥德堡", prevEng: "Gothenburg", next: "斯德哥爾摩", nextEng: "Stockholm", prevDist: 290.2, nextDist: 520.4 },
  { level: 184, name: "斯德哥爾摩", english: "Stockholm", prev: "奧斯陸", prevEng: "Oslo", next: "巴塞隆納", nextEng: "Barcelona", prevDist: 520.4, nextDist: 2200.5 },
  { level: 185, name: "巴塞隆納", english: "Barcelona", prev: "斯德哥爾摩", prevEng: "Stockholm", next: "馬德里", nextEng: "Madrid", prevDist: 2200.5, nextDist: 620.4 },
  { level: 186, name: "馬德里", english: "Madrid", prev: "巴塞隆納", prevEng: "Barcelona", next: "塞維亞", nextEng: "Seville", prevDist: 620.4, nextDist: 540.2 },
  { level: 187, name: "塞維亞", english: "Seville", prev: "馬德里", prevEng: "Madrid", next: "哥多華", nextEng: "Cordoba", prevDist: 540.2, nextDist: 140.2 },
  { level: 188, name: "哥多華", english: "Cordoba", prev: "塞維亞", prevEng: "Seville", next: "馬拉加", nextEng: "Malaga", prevDist: 140.2, nextDist: 160.4 },
  { level: 189, name: "馬拉加", english: "Malaga", prev: "哥多華", prevEng: "Cordoba", next: "瓦倫西亞", nextEng: "Valencia", prevDist: 160.4, nextDist: 650.5 },
  { level: 190, name: "瓦倫西亞", english: "Valencia", prev: "馬拉加", prevEng: "Malaga", next: "里昂", nextEng: "Lyon", prevDist: 650.5, nextDist: 980.2 },
  { level: 191, name: "里昂", english: "Lyon", prev: "瓦倫西亞", prevEng: "Valencia", next: "日內瓦", nextEng: "Geneva", prevDist: 980.2, nextDist: 150.4 },
  { level: 192, name: "日內瓦", english: "Geneva", prev: "里昂", prevEng: "Lyon", next: "洛桑", nextEng: "Lausanne", prevDist: 150.4, nextDist: 60.2 },
  { level: 193, name: "洛桑", english: "Lausanne", prev: "日內瓦", prevEng: "Geneva", next: "伯恩", nextEng: "Bern", prevDist: 60.2, nextDist: 100.5 },
  { level: 194, name: "伯恩", english: "Bern", prev: "洛桑", prevEng: "Lausanne", next: "蘇黎世", nextEng: "Zurich", prevDist: 100.5, nextDist: 120.4 },
  { level: 195, name: "蘇黎世", english: "Zurich", prev: "伯恩", prevEng: "Bern", next: "巴塞爾", nextEng: "Basel", prevDist: 120.4, nextDist: 85.2 },
  { level: 196, name: "巴塞爾", english: "Basel", prev: "蘇黎世", prevEng: "Zurich", next: "盧加諾", nextEng: "Lugano", prevDist: 85.2, nextDist: 260.4 },
  { level: 197, name: "盧加諾", english: "Lugano", prev: "巴塞爾", prevEng: "Basel", next: "那不勒斯", nextEng: "Naples", prevDist: 260.4, nextDist: 850.5 },
  { level: 198, name: "那不勒斯", english: "Naples", prev: "盧加諾", prevEng: "Lugano", next: "羅馬", nextEng: "Rome", prevDist: 850.5, nextDist: 220.4 },
  { level: 199, name: "羅馬", english: "Rome", prev: "那不勒斯", prevEng: "Naples", next: "米蘭", nextEng: "Milan", prevDist: 220.4, nextDist: 570.8 },
  { level: 200, name: "米蘭", english: "Milan", prev: "羅馬", prevEng: "Rome", next: "巴黎", nextEng: "Paris", prevDist: 570.8, nextDist: 850.5 }
];

function App() {
  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const nextMute = audioManager.toggleMute();
    setIsMuted(nextMute);
  };

  const [levelData, setLevelData] = useState<GameLevel | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // View states: "map" (Candy Crush S-map) or "game" (crossword playfield)
  const [viewMode, setViewMode] = useState<"map" | "game">("map");

  // Game states
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [activeIdiomIdx, setActiveIdiomIdx] = useState<number | null>(null); // 當前正在編輯的成語索引
  const [activeDirection, setActiveDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [poolWords, setPoolWords] = useState<PoolWord[]>([]);
  
  // Modals
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [levelCleared, setLevelCleared] = useState(false);

  // User Auth status
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Cache trigger state for level overrides reload
  const [overridesTrigger, setOverridesTrigger] = useState(0);

  const loadOverrides = async () => {
    const overrideMap: Record<number, any> = {};
    if (isFirebaseConfigured) {
      try {
        const querySnapshot = await getDocs(collection(db, "levelOverrides"));
        querySnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          const lvl = Number(docSnap.id.replace("level_", "")) || data.levelNumber;
          if (lvl) {
            overrideMap[lvl] = data;
          }
        });
      } catch (e) {
        console.error("Error loading level overrides from firebase:", e);
      }
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("idiom_level_override_")) {
          const lvl = Number(key.replace("idiom_level_override_", ""));
          const dataJson = localStorage.getItem(key);
          if (lvl && dataJson) {
            overrideMap[lvl] = JSON.parse(dataJson);
          }
        }
      }
    } catch (e) {
      console.error("Error loading level overrides from localStorage:", e);
    }

    setLevelOverrides(overrideMap);
    setOverridesTrigger(prev => prev + 1);
  };

  // 1. Initial Load: Auto login guest or get from localStorage, and load level overrides
  useEffect(() => {
    loadOverrides();
    const savedUser = localStorage.getItem("idiom_user");
    if (savedUser) {
      setCurrentUser(savedUser);
      const savedLevel = Number(localStorage.getItem(`idiom_level_${savedUser}`)) || 1;
      const savedScore = Number(localStorage.getItem(`idiom_score_${savedUser}`)) || 0;
      setLevelNumber(savedLevel);
      setMaxUnlockedLevel(savedLevel);
      setTotalScore(savedScore);
    } else {
      setShowAuth(true);
    }
  }, []);



  // 2. Load Level whenever levelNumber changes
  useEffect(() => {
    const data = generateLevel(levelNumber);
    setLevelData(data);
    setLevelCleared(false);

    // Find first empty cell to auto select
    let firstEmpty: { x: number; y: number } | null = null;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const cell = data.grid[y][x];
        if (cell && !cell.isSystemRevealed) {
          firstEmpty = { x, y };
          break;
        }
      }
      if (firstEmpty) break;
    }

    setSelectedCell(firstEmpty);
    if (firstEmpty) {
      const cell = data.grid[firstEmpty.y][firstEmpty.x];
      if (cell && cell.idiomIndices.length > 0) {
        const idx = cell.idiomIndices[0];
        const pi = data.placedIdioms[idx];
        setActiveIdiomIdx(idx);
        setActiveDirection(pi.isHorizontal ? "horizontal" : "vertical");
      } else {
        setActiveIdiomIdx(null);
      }
    } else {
      setActiveIdiomIdx(null);
    }

    // Initialize character pool words
    const words = data.charPool.map((char, index) => ({
      id: `char-${index}`,
      char,
      isUsed: false
    }));
    setPoolWords(words);
  }, [levelNumber, overridesTrigger]);

  // Autoplay BGM on first user interaction (safari / chrome compatibility)
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioManager.startBGM();
    };
    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Auto scroll to active station card in railway view
  useEffect(() => {
    if (viewMode === "map" && !showAuth) {
      const timer = setTimeout(() => {
        const activeCard = document.querySelector(".train-station-card.active");
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode, maxUnlockedLevel, showAuth]);

  // Sync progress
  const saveProgress = async (newMaxLevel: number, newScore: number) => {
    if (currentUser) {
      localStorage.setItem(`idiom_level_${currentUser}`, String(newMaxLevel));
      localStorage.setItem(`idiom_score_${currentUser}`, String(newScore));
      
      if (isFirebaseConfigured) {
        try {
          const userDocRef = doc(db, "users", currentUser);
          await updateDoc(userDocRef, {
            currentLevel: newMaxLevel,
            totalScore: newScore,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error("Firebase sync failed, saved to local cache:", err);
        }
      }
    }
  };

  const handleLoginSuccess = (username: string, score: number, level: number) => {
    setCurrentUser(username);
    setTotalScore(Number(score) || 0);
    setLevelNumber(Number(level) || 1);
    setMaxUnlockedLevel(Number(level) || 1);
    setViewMode("map"); // Go to map after login
  };

  const handleLogout = () => {
    localStorage.removeItem("idiom_user");
    setCurrentUser(null);
    setLevelNumber(1);
    setMaxUnlockedLevel(1);
    setTotalScore(0);
    setViewMode("map");
    setShowAuth(false);
  };

  if (!levelData) {
    return <div className="loading-screen">遊戲載入中，請稍候...</div>;
  }

  // Get cell helper
  const getCell = (x: number, y: number): GridCell | null => {
    if (x < 0 || x >= 10 || y < 0 || y >= 10) return null;
    return levelData.grid[y][x];
  };


  // Click on a cell in the grid
  const handleCellSelect = (x: number, y: number) => {
    const cell = getCell(x, y);
    if (!cell) return;

    // Toggle direction if clicking the same cell
    if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
      if (cell.idiomIndices.length > 1) {
        const nextDir = activeDirection === "horizontal" ? "vertical" : "horizontal";
        setActiveDirection(nextDir);
        // Find which placedIdiom matches this new direction
        const matchingIdiomIdx = cell.idiomIndices.find(idx => {
          const pi = levelData.placedIdioms[idx];
          return pi.isHorizontal === (nextDir === "horizontal");
        });
        if (matchingIdiomIdx !== undefined) {
          setActiveIdiomIdx(matchingIdiomIdx);
        }
      }
      return;
    }

    setSelectedCell({ x, y });
    
    // Choose active idiom index
    if (cell.idiomIndices.length > 0) {
      // Prefer current direction if matching, else pick first
      const currentDirIsHorizontal = activeDirection === "horizontal";
      const matchingIdx = cell.idiomIndices.find(idx => {
        const pi = levelData.placedIdioms[idx];
        return pi.isHorizontal === currentDirIsHorizontal;
      });

      const selectedIdx = matchingIdx !== undefined ? matchingIdx : cell.idiomIndices[0];
      const pi = levelData.placedIdioms[selectedIdx];
      
      setActiveIdiomIdx(selectedIdx);
      setActiveDirection(pi.isHorizontal ? "horizontal" : "vertical");
    }
  };

  const handleWordClick = (word: PoolWord) => {
    if (!selectedCell || activeIdiomIdx === null) return;
    
    const { x, y } = selectedCell;
    const cell = getCell(x, y);
    if (!cell || cell.isSystemRevealed || cell.isUserCorrect) return;

    audioManager.playClick();

    // 1. Update grid and cell
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    const targetCell = { ...cell };
    
    // Determine if filled character is correct for this specific slot
    const isCharCorrect = word.char === targetCell.char;
    
    // If this slot was already filled by user, return that tile to pool first
    const previousTileId = (targetCell as any).tileId;
    let updatedPool = [...poolWords];
    if (previousTileId) {
      updatedPool = updatedPool.map(w => w.id === previousTileId ? { ...w, isUsed: false } : w);
    }
    
    targetCell.userChar = word.char;
    (targetCell as any).tileId = word.id;
    
    if (isCharCorrect) {
      targetCell.isError = false;
    } else {
      targetCell.isError = true;
    }
    
    updatedGrid[y][x] = targetCell;

    // 2. Mark the new tile as used
    updatedPool = updatedPool.map(w => w.id === word.id ? { ...w, isUsed: true } : w);
    setPoolWords(updatedPool);

    // 3. Update level data state
    const currentIdiom = levelData.placedIdioms[activeIdiomIdx];
    
    // Determine the next empty cell in this idiom to auto-jump
    let nextCellToJump: { x: number; y: number } | null = null;
    
    // ONLY auto-jump if the currently filled character is correct!
    // If incorrect, cursor stays here so user can easily overwrite it, and error shows immediately.
    if (isCharCorrect) {
      const startIdx = currentIdiom.isHorizontal ? x - currentIdiom.x : y - currentIdiom.y;
      
      // Scan forward from the current slot inside the active idiom
      for (let offset = 1; offset < 4; offset++) {
        const idxInIdiom = (startIdx + offset) % 4;
        const tx = currentIdiom.isHorizontal ? currentIdiom.x + idxInIdiom : currentIdiom.x;
        const ty = currentIdiom.isHorizontal ? currentIdiom.y : currentIdiom.y + idxInIdiom;
        
        const nextCell = updatedGrid[ty][tx];
        if (nextCell && !nextCell.isSystemRevealed && !nextCell.isUserCorrect && nextCell.userChar === "") {
          nextCellToJump = { x: tx, y: ty };
          break;
        }
      }

      // If no forward empty cells, scan backward from current slot
      if (!nextCellToJump) {
        for (let offset = 3; offset > 0; offset--) {
          const idxInIdiom = (startIdx + offset) % 4;
          const tx = currentIdiom.isHorizontal ? currentIdiom.x + idxInIdiom : currentIdiom.x;
          const ty = currentIdiom.isHorizontal ? currentIdiom.y : currentIdiom.y + idxInIdiom;
          
          const nextCell = updatedGrid[ty][tx];
          if (nextCell && !nextCell.isSystemRevealed && !nextCell.isUserCorrect && nextCell.userChar === "") {
            nextCellToJump = { x: tx, y: ty };
            break;
          }
        }
      }
    }

    // Set selected Cell or verify answer
    if (nextCellToJump) {
      setSelectedCell(nextCellToJump);
    } else {
      if (!isCharCorrect) {
        // Remain on the wrong cell
        setSelectedCell({ x, y });
      } else {
        // If correct and no empty cells left, verify the entire idiom
        verifyAndLockIdiom(activeIdiomIdx, updatedGrid);
        return;
      }
    }

    setLevelData({
      ...levelData,
      grid: updatedGrid
    });
  };

  // Verify and unlock an idiom if all 4 characters are correct
  const verifyAndLockIdiom = (idiomIdx: number, currentGrid: (GridCell | null)[][]) => {
    const placed = levelData!.placedIdioms[idiomIdx];
    
    // Assemble filled chars
    const chars: string[] = [];
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = currentGrid[cy][cx];
      chars.push(cell ? (cell.isSystemRevealed ? cell.char : cell.userChar) : "");
    }
    const assembled = chars.join("");
    const isCorrect = assembled === placed.idiom;

    const updatedPlacedIdioms = [...levelData!.placedIdioms];

    if (isCorrect) {
      // 1. Unlock this idiom
      updatedPlacedIdioms[idiomIdx] = {
        ...placed,
        isUnlocked: true
      };

      // 2. Lock its cells (convert them to user correct so they can't be edited)
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        if (cell) {
          cell.isUserCorrect = true;
          cell.userChar = cell.char;
        }
      }

      // 3. Award Score
      const scoreGain = 100;
      const newScore = totalScore + scoreGain;
      setTotalScore(newScore);

      setSelectedCell(null);
      setActiveIdiomIdx(null);

      // Check if all idioms in level are unlocked
      const levelComplete = updatedPlacedIdioms.every(pi => pi.isUnlocked);
      
      setLevelData({
        ...levelData!,
        placedIdioms: updatedPlacedIdioms,
        grid: currentGrid
      });

      if (levelComplete) {
        audioManager.playLevelClear();
        setLevelCleared(true);
        const levelClearedBonus = 200;
        const finalScore = newScore + levelClearedBonus;
        setTotalScore(finalScore);
        
        let newMax = Number(maxUnlockedLevel) || 1;
        const currentLvlNum = Number(levelNumber) || 1;
        if (currentLvlNum === newMax && currentLvlNum < 1300) {
          newMax = currentLvlNum + 1;
          setMaxUnlockedLevel(newMax);
        }
        saveProgress(newMax, finalScore);
      } else {
        audioManager.playCorrect();
        saveProgress(maxUnlockedLevel, newScore);
      }
    } else {
      audioManager.playWrong();
      
      let firstErrorCell: { x: number; y: number } | null = null;
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = currentGrid[cy][cx];
        
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
          if (cell.userChar !== cell.char) {
            cell.isError = true;
            if (!firstErrorCell) {
              firstErrorCell = { x: cx, y: cy };
            }
          } else {
            cell.isError = false;
          }
        }
      }
      
      if (firstErrorCell) {
        setSelectedCell(firstErrorCell);
      }

      setLevelData({
        ...levelData!,
        grid: currentGrid
      });
    }
  };

  const handleBackspace = () => {
    if (activeIdiomIdx === null || !levelData) return;

    const placed = levelData.placedIdioms[activeIdiomIdx];
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    
    // Find the cell to delete
    let targetCell: GridCell | null = null;
    let targetX = 0;
    let targetY = 0;

    // 1. If currently selected cell has a user input, delete it
    if (selectedCell) {
      const cell = updatedGrid[selectedCell.y][selectedCell.x];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar !== "") {
        targetCell = cell;
        targetX = selectedCell.x;
        targetY = selectedCell.y;
      }
    }

    // 2. Otherwise, search backward in the current idiom for the last filled slot
    if (!targetCell) {
      for (let i = 3; i >= 0; i--) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = updatedGrid[cy][cx];
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar !== "") {
          targetCell = cell;
          targetX = cx;
          targetY = cy;
          break;
        }
      }
    }

    if (!targetCell) return;

    const deletedTileId = (targetCell as any).tileId;

    audioManager.playClick();
    targetCell.userChar = "";
    (targetCell as any).tileId = "";
    targetCell.isError = false;
    
    // Restore tile in pool
    if (deletedTileId) {
      const restoredPool = poolWords.map(w => w.id === deletedTileId ? { ...w, isUsed: false } : w);
      setPoolWords(restoredPool);
    }

    // Auto focus on the deleted slot so the user can easily re-type
    setSelectedCell({ x: targetX, y: targetY });

    setLevelData({
      ...levelData,
      grid: updatedGrid
    });
  };

  const handleHint = () => {
    if (activeIdiomIdx === null || !levelData) return;

    const placed = levelData.placedIdioms[activeIdiomIdx];
    const updatedGrid = [...levelData.grid.map(row => [...row])];
    
    // Find the first unfilled / incorrect cell in the active idiom
    let targetCell: GridCell | null = null;

    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = updatedGrid[cy][cx];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect) {
        targetCell = cell;
        break;
      }
    }

    if (!targetCell) return;

    // Fill in correct character and lock it immediately to build confidence
    targetCell.userChar = targetCell.char;
    targetCell.isUserCorrect = true; // Lock immediately
    
    // Find the corresponding character tile in poolWords and mark it as isUsed
    let poolUpdated = false;
    const updatedPool = poolWords.map(w => {
      if (!poolUpdated && w.char === targetCell!.char && !w.isUsed) {
        poolUpdated = true;
        // Associate cell with tileId
        (targetCell as any).tileId = w.id;
        return { ...w, isUsed: true };
      }
      return w;
    });

    setPoolWords(updatedPool);

    // Check if the idiom is fully filled
    let isAllFilled = true;
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = updatedGrid[cy][cx];
      if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar === "") {
        isAllFilled = false;
        break;
      }
    }

    if (isAllFilled) {
      verifyAndLockIdiom(activeIdiomIdx, updatedGrid);
    } else {
      // Select the next empty cell
      for (let i = 0; i < 4; i++) {
        const cx = placed.isHorizontal ? placed.x + i : placed.x;
        const cy = placed.isHorizontal ? placed.y : placed.y + i;
        const cell = updatedGrid[cy][cx];
        if (cell && !cell.isSystemRevealed && !cell.isUserCorrect && cell.userChar === "") {
          setSelectedCell({ x: cx, y: cy });
          break;
        }
      }

      setLevelData({
        ...levelData,
        grid: updatedGrid
      });
    }
  };

  const handleNextLevel = () => {
    if (levelNumber < 1300) {
      const nextLvl = levelNumber + 1;
      setLevelNumber(nextLvl);
      
      let newMax = Number(maxUnlockedLevel) || 1;
      const currentLvlNum = Number(levelNumber) || 1;
      if (currentLvlNum === newMax) {
        newMax = nextLvl;
        setMaxUnlockedLevel(newMax);
      }
      saveProgress(newMax, totalScore);
      setLevelCleared(false);
      setViewMode("map"); // Go back to map first to see unlocked node
    } else {
      alert("恭喜您！已完成了所有 1300 個關卡！您是真正的成語至尊！");
    }
  };

  // Render Candy Crush style map path
  const renderMap = () => {
    const currentRound = Math.floor((maxUnlockedLevel - 1) / 50);
    
    // Dynamic railway theme definitions
    const themes = [
      {
        title: "🚂 台灣環島鐵路之旅",
        badgeColor: "#007a33", // 台鐵經典綠
        trainEmoji: "🚂💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#002d62" strokeWidth="8" />
            <path d="M 25 50 L 75 50 M 50 25 L 50 75 M 32 32 L 68 68 M 32 68 L 68 32" stroke="#002d62" strokeWidth="6" />
            <circle cx="50" cy="50" r="22" fill="#ffffff" />
            <path d="M 40 38 L 60 38 M 50 38 L 50 62 M 35 62 L 65 62" stroke="#002d62" strokeWidth="7" strokeLinecap="round" />
          </svg>
        )
      },
      {
        title: "🚅 日本新幹線高鐵之旅",
        badgeColor: "#00539f", // 新幹線經典藍
        trainEmoji: "🚅💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#00539f" />
            <path d="M 20 60 C 35 40, 65 40, 80 60 L 80 65 L 20 65 Z" fill="#ffffff" />
            <circle cx="35" cy="52" r="4" fill="#ffb703" />
            <line x1="20" y1="62" x2="80" y2="62" stroke="#00539f" strokeWidth="4" />
          </svg>
        )
      },
      {
        title: "🇺🇸 美國跨州美鐵特快",
        badgeColor: "#d90429", // 美鐵經典紅
        trainEmoji: "🚂💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#002d62" />
            <polygon points="50,20 58,38 78,38 62,50 68,70 50,58 32,70 38,50 22,38 42,38" fill="#ffffff" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#d90429" strokeWidth="8" />
          </svg>
        )
      },
      {
        title: "🇪🇺 歐洲高鐵跨國漫遊",
        badgeColor: "#800020", // 歐洲優雅勃根地紅
        trainEmoji: "🚄💨",
        logo: (
          <svg className="tra-badge-logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#003399" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="#ffcc00" strokeWidth="4" strokeDasharray="6,8" />
          </svg>
        )
      }
    ];

    const themeId = currentRound % 4;
    const theme = themes[themeId];
    const startIndex = themeId * 50;
    const themeStations = WORLD_TOUR_NODES.slice(startIndex, startIndex + 50);

    // Get all stations in the current round
    const stations = themeStations.map((station, i) => {
      const nodeLevel = currentRound * 50 + (i + 1);
      const isPlayable = nodeLevel <= maxUnlockedLevel;
      const isActive = nodeLevel === maxUnlockedLevel;
      return {
        ...station,
        levelNumber: nodeLevel,
        isPlayable,
        isActive
      };
    });

    const activeStation = stations.find(s => s.isActive) || stations[0];

    // Horizontal navigation handler
    const scrollRailway = (direction: "left" | "right") => {
      const scroller = document.querySelector(".train-track-scroller");
      if (scroller) {
        const scrollAmount = 320; // 1 station card width + gap
        scroller.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth"
        });
      }
    };

    return (
      <div className="train-map-container" ref={mapContainerRef}>
        <div className="train-map-header">
          <div className="train-map-title">{theme.title}</div>
          <p className="train-map-subtitle">
            目前火車停靠在：<strong>第 {maxUnlockedLevel} 站 【{activeStation.name}】</strong>，請點選大站牌進入關卡！
          </p>
        </div>

        {/* Horizontal scrollable track area with navigation arrows */}
        <div className="railway-scroll-wrapper">
          <button className="railway-nav-btn prev-btn" onClick={() => scrollRailway("left")}>◀</button>

          <div className="train-track-scroller">
            <div className="railway-tracks">
              {stations.map(station => (
                <div 
                  key={station.levelNumber} 
                  className={`train-station-node ${station.isActive ? "active-node" : ""}`}
                >
                  {/* Cute train showing on top of the active station */}
                  {station.isActive && (
                    <div className="steam-train-container">
                      <div className="steam-puff">☁️</div>
                      <div className="steam-puff puff-delayed">☁️</div>
                      <span className="steam-train-emoji">{theme.trainEmoji}</span>
                    </div>
                  )}

                  {/* Style Station Board Card */}
                  <button
                    className={`train-station-card ${station.isActive ? "active" : ""} ${station.isPlayable ? "unlocked" : "locked"}`}
                    onClick={() => station.isPlayable && handlePlayLevel(station.levelNumber)}
                    disabled={!station.isPlayable}
                  >
                    {/* Top part: Logo and Station names */}
                    <div className="card-top">
                      {theme.logo}
                      
                      <div className="station-titles">
                        <span className="station-name-zh">{station.name}</span>
                        <span className="station-name-en">{station.english}</span>
                      </div>
                    </div>

                    {/* Middle part: dynamic colored bar with arrows */}
                    <div 
                      className="card-middle" 
                      style={{ backgroundColor: station.isPlayable ? theme.badgeColor : "#adb5bd" }}
                    >
                      <span className="arrow-left">◀ {station.prevDist} 公里</span>
                      <span className="arrow-right">{station.nextDist} 公里 ▶</span>
                    </div>

                    {/* Bottom part: adjacent stations */}
                    <div className="card-bottom">
                      <div className="side-station prev-side">
                        <span className="side-zh">{station.prev}</span>
                        <span className="side-en">{station.prevEng}</span>
                      </div>
                      <div className="side-station next-side">
                        <span className="side-zh">{station.next}</span>
                        <span className="side-en">{station.nextEng}</span>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="station-status-badge">
                      {station.isActive ? (
                        <span className="badge-txt active">挑戰中 🔥</span>
                      ) : station.isPlayable ? (
                        <span className="badge-txt cleared">已通關 ✓</span>
                      ) : (
                        <span className="badge-txt locked">未抵達 🔒</span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="railway-nav-btn next-btn" onClick={() => scrollRailway("right")}>▶</button>
        </div>
      </div>
    );
  };

  const handlePlayLevel = (num: number) => {
    setLevelNumber(num);
    setViewMode("game");
    audioManager.startBGM();
  };

  // Determine if selected cell has user inputs
  const hasUserSelectedInput = (): boolean => {
    if (activeIdiomIdx === null) return false;
    const placed = levelData.placedIdioms[activeIdiomIdx];
    
    for (let i = 0; i < 4; i++) {
      const cx = placed.isHorizontal ? placed.x + i : placed.x;
      const cy = placed.isHorizontal ? placed.y : placed.y + i;
      const cell = getCell(cx, cy);
      if (cell && !cell.isSystemRevealed && cell.userChar !== "") {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="game-header">
        <div className="header-logo">
          <h1>🏮 成語接龍 🏮</h1>
          <p className="subtitle">字大清晰、好玩！</p>
        </div>
        <div className="header-user-status">
          <div className="header-score">🏆 積分：{totalScore} 分</div>
          {viewMode === "game" && (
            <button className="btn btn-header btn-secondary" onClick={() => setViewMode("map")}>
              🗺 返回地圖
            </button>
          )}
          {currentUser ? (
            <div className="user-info">
              <span>👤 <strong>{currentUser}</strong></span>
              <button className="btn btn-header btn-accent" onClick={() => setShowAuth(true)}>更換</button>
            </div>
          ) : (
            <button className="btn btn-header btn-primary" onClick={() => setShowAuth(true)}>🔑 登入存檔</button>
          )}
          <button className="btn btn-header btn-secondary" onClick={() => setShowLeaderboard(true)}>🏆 榮譽榜</button>
          <button className="btn btn-header btn-secondary" onClick={handleToggleMute}>
            {isMuted ? "🔇 音效/音樂：關" : "🔊 音效/音樂：開"}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="game-main">
        {currentUser === "owner" ? (
          <AdminPanel onLogout={handleLogout} tourNodes={WORLD_TOUR_NODES} onRefreshOverrides={loadOverrides} />
        ) : viewMode === "map" ? (
          /* Candy Crush map */
          renderMap()
        ) : (
          /* Crossword game board */
          <>
            {/* Crossword 10x10 Board Grid */}
            <section className="crossword-board-section">
              <div className="crossword-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(y => (
                  <div key={y} className="crossword-row">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                      const cell = getCell(x, y);
                      if (!cell) {
                        return <div key={x} className="grid-cell empty-slot"></div>;
                      }

                      const isSelected = selectedCell !== null && selectedCell.x === x && selectedCell.y === y;
                      const hasUserChar = cell.userChar !== "";
                      const isRevealed = cell.isSystemRevealed;
                      const isCorrect = cell.isUserCorrect;
                      
                      return (
                        <button
                          key={x}
                          className={`grid-cell letter-slot 
                            ${isRevealed ? "revealed" : ""} 
                            ${isCorrect ? "user-correct" : ""} 
                            ${isSelected ? "selected" : ""} 
                            ${hasUserChar && !isRevealed && !isCorrect ? "user-filled" : ""}
                            ${cell.isError ? "has-error" : ""}
                          `}
                          onClick={() => handleCellSelect(x, y)}
                        >
                          {isRevealed || isCorrect ? cell.char : cell.userChar}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            {/* Word Board (Tiles Area) */}
            <section className="wordboard-section">
              {selectedCell !== null ? (
                <>
                  <WordBoard
                    words={poolWords}
                    onWordClick={handleWordClick}
                    onBackspace={handleBackspace}
                    onHint={handleHint}
                    hasInput={hasUserSelectedInput()}
                  />
                  
                  {/* Bottom Explanation Panel (成語說明放在最下面) */}
                  <div className="bottom-explanation-panel">
                    {activeIdiomIdx !== null ? (
                      <>
                        <div className="explanation-title">📖 成語提示</div>
                        <div className="explanation-def">💡 意思：{levelData.placedIdioms[activeIdiomIdx].definition}</div>
                      </>
                    ) : (
                      <div className="explanation-empty">💡 點選格子以查看對應的成語釋義說明。</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="select-card-prompt">
                  💡 請先點擊上方 **填字棋盤中的格子**，即可開始填字！
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="game-footer">
        <p>提示：字體超大、點擊好選。完成整張填字棋盤即可過關！</p>
      </footer>

      {/* Level Cleared Modal overlay */}
      {levelCleared && (
        <div className="modal-overlay level-clear">
          <div className="modal-content text-center animate-bounce">
            <div className="clear-emoji">🎉</div>
            <h2>第 {levelNumber} 關挑戰成功！</h2>
            <div className="score-bonus">+100 分 (答對成語) + 200 分 (過關獎勵)</div>
            <div className="modal-actions">
              <button className="btn btn-primary btn-large" onClick={handleNextLevel}>
                確定 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showAuth || !currentUser) && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLoginSuccess={handleLoginSuccess}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          currentUsername={currentUser}
          currentScore={totalScore}
        />
      )}
    </div>
  );
}

export default App;
