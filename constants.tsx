import React from 'react';
import { SymbolType, CoinType } from './types';
import { Shield, Bot, Star, Zap, Hexagon, Gem } from 'lucide-react';

export type ThemeId = 'durov' | 'flour' | 'coin_up';

export const COIN_UP_WEIGHTS = [
  { type: SymbolType.CU_COIN, weight: 20 }, // Bonus symbol
  { type: SymbolType.CU_A, weight: 20 }, // Regular symbols (no payout)
  { type: SymbolType.CU_K, weight: 20 },
  { type: SymbolType.CU_Q, weight: 20 },
  { type: SymbolType.CU_J, weight: 20 },
];

export const COIN_UP_BONUS_WEIGHTS = [
  { type: SymbolType.EMPTY, weight: 80 },
  { type: SymbolType.CU_COIN, weight: 10 },
  { type: SymbolType.CU_COIN_UP, weight: 2 },
  { type: SymbolType.CU_MULTI_UP, weight: 2 },
  { type: SymbolType.CU_MYSTERY, weight: 1 },
];

export const THEME_IMAGES: Record<ThemeId, Record<string, string>> = {
  durov: {
    [SymbolType.PLANE]: '/dogtg.png',
    [SymbolType.LOCK]: '/knopka.png',
    [SymbolType.SHIELD]: '/futbolka.png',
    [SymbolType.BOT]: '/kepka.svg',
    [SymbolType.STAR]: '/rukzak.svg',
    [SymbolType.GIFT]: '/morozenoi.png',
    [SymbolType.DIAMOND]: '/kerpuch.svg',
    [SymbolType.HASH]: '/obuv.png',
    [SymbolType.NUM]: '/ohcki.png',
    [SymbolType.WILD]: '/download_4.4400000000003885.svg',
    'COIN_STRIP': '/moneta.svg',
    'ANIMATION_PLANE': '/chpic.su_-_Gift_NFT_005.tgs',
    'ANIMATION_WILD': '/sozdatel.tgs'
  },
  flour: {
    [SymbolType.PLANE]: '/rediska.svg',
    [SymbolType.LOCK]: '/siran.svg',
    [SymbolType.SHIELD]: '/podsolnux.svg',
    [SymbolType.BOT]: '/kuvsin.svg',
    [SymbolType.STAR]: '/romaskaa.svg',
    [SymbolType.GIFT]: '/kusaka_0.svg',
    [SymbolType.DIAMOND]: '/kaktus.png',
    [SymbolType.HASH]: '/flourtiporosi.svg',
    [SymbolType.NUM]: '/chtve0.svg',
    [SymbolType.WILD]: '/wildkusaka.png',
    'COIN_STRIP': '/coinflow.png',
    'ANIMATION_PLANE': '/rediska.tgs',
    'ANIMATION_WILD': '/chpic.su_-_Loving_Gift_by_EmojiRu_Bot_006.tgs'
  },
  coin_up: {
    [SymbolType.CU_A]: '/coinup/A.png',
    [SymbolType.CU_K]: '/coinup/K.png',
    [SymbolType.CU_Q]: '/coinup/Q.png',
    [SymbolType.CU_J]: '/coinup/J.png',
    [SymbolType.CU_COIN]: '/moneta.svg', // Reuse for now
    [SymbolType.CU_COIN_UP]: '/coinup/coin_up.png',
    [SymbolType.CU_MULTI_UP]: '/coinup/multi_up.png',
    [SymbolType.CU_MYSTERY]: '/coinup/mystery.png',
    'COIN_STRIP': '/moneta.svg',
    'ANIMATION_PLANE': '',
    'ANIMATION_WILD': ''
  }
};

export const SYMBOL_CONFIG: Record<SymbolType, { color: string, icon?: React.ReactNode, imageUrl?: string, label?: string, multiplier: number }> = {
  // CoinUp
  [SymbolType.CU_A]: { color: '#FFD700', label: 'A', multiplier: 0 },
  [SymbolType.CU_K]: { color: '#C0C0C0', label: 'K', multiplier: 0 },
  [SymbolType.CU_Q]: { color: '#CD7F32', label: 'Q', multiplier: 0 },
  [SymbolType.CU_J]: { color: '#B87333', label: 'J', multiplier: 0 },
  [SymbolType.CU_COIN]: { color: '#FFD700', label: 'COIN', multiplier: 0 },
  [SymbolType.CU_COIN_UP]: { color: '#FF4500', label: 'UP', multiplier: 0 },
  [SymbolType.CU_MULTI_UP]: { color: '#FF0000', label: 'MULTI', multiplier: 0 },
  [SymbolType.CU_MYSTERY]: { color: '#800080', label: '???', multiplier: 0 },
  [SymbolType.EMPTY]: { color: 'transparent', label: '', multiplier: 0 },

  // Low
  [SymbolType.PLANE]: { 
    color: '#5cabeb', 
    imageUrl: '/dogtg.png', 
    label: 'DogTG', 
    multiplier: 6.0 
  },
  [SymbolType.LOCK]: { 
    color: '#879099', 
    imageUrl: '/knopka.png', 
    label: 'Knopka', 
    multiplier: 10.0 
  },
  [SymbolType.SHIELD]: { 
    color: '#51b26c', 
    imageUrl: '/futbolka.png', 
    label: 'Futbolka', 
    multiplier: 1.0 
  },
  
  // Mid
  [SymbolType.BOT]: { 
    color: '#4cb4f7', 
    imageUrl: '/kepka.svg', 
    label: 'Kepka', 
    multiplier: 1.5 
  },
  [SymbolType.STAR]: { 
    color: '#9b51e0', 
    imageUrl: '/rukzak.svg', 
    label: 'Rukzak', 
    multiplier: 2.0 
  },
  [SymbolType.GIFT]: { 
    color: '#f4569e', 
    imageUrl: '/morozenoi.png', 
    label: 'Moroz', 
    multiplier: 2.5 
  },
  
  // High (NFTs)
  [SymbolType.DIAMOND]: { 
    color: '#0098ea', 
    imageUrl: '/kerpuch.svg', 
    label: 'Kerpuch', 
    multiplier: 4.0 
  },
  [SymbolType.HASH]: { 
    color: '#f2994a', 
    imageUrl: '/obuv.png', 
    label: 'Obuv', 
    multiplier: 0.7 
  },
  [SymbolType.NUM]: { 
    color: '#fbc531', 
    imageUrl: '/ohcki.png', 
    label: 'Ochki', 
    multiplier: 0.8 
  },
  
  // Specials
  [SymbolType.WILD]: { color: '#ffffff', imageUrl: '/download_4.4400000000003885.svg', label: 'WILD', multiplier: 0 },
  [SymbolType.COIN]: { color: '#0097EC', icon: <Hexagon />, label: 'TON', multiplier: 0 },
};

export const COIN_COLORS: Record<CoinType, string> = {
  [CoinType.STANDARD]: 'bg-[#0097EC] from-[#29b6f6] to-[#0086d1]', // TON Blue
  [CoinType.EXPAND]: 'bg-[#4caf50] from-[#66bb6a] to-[#388e3c]', // Green
  [CoinType.MULTIPLIER]: 'bg-[#e53935] from-[#ef5350] to-[#c62828]', // Red
  [CoinType.COLLECT]: 'bg-[#ffc107] from-[#ffca28] to-[#ff6f00]', // Gold
  [CoinType.MAGIC]: 'bg-[#9c27b0] from-[#ab47bc] to-[#7b1fa2]', // Purple
};

export const DUROV_WEIGHTS: { type: SymbolType; weight: number }[] = [
  { type: SymbolType.PLANE, weight: 5 },   // High value (Rare)
  { type: SymbolType.LOCK, weight: 3 },    // Highest value (Very Rare)
  { type: SymbolType.SHIELD, weight: 90 }, // Low value (Common)
  { type: SymbolType.BOT, weight: 30 },    // Mid
  { type: SymbolType.STAR, weight: 25 },   // Mid
  { type: SymbolType.GIFT, weight: 20 },   // Mid
  { type: SymbolType.DIAMOND, weight: 8 }, // High
  { type: SymbolType.HASH, weight: 100 },  // Filler (Very Common)
  { type: SymbolType.NUM, weight: 100 },   // Filler (Very Common)
  { type: SymbolType.WILD, weight: 5 },    // Wild (Rare)
  { type: SymbolType.COIN, weight: 15 },   // Bonus (Rare)
];

export const FLOUR_WEIGHTS: { type: SymbolType; weight: number }[] = [
  { type: SymbolType.PLANE, weight: 10 },  
  { type: SymbolType.LOCK, weight: 5 },    // Still rare to prevent bankruptcy
  { type: SymbolType.SHIELD, weight: 80 }, // Common
  { type: SymbolType.BOT, weight: 60 },    // Frequent Mid
  { type: SymbolType.STAR, weight: 50 },   // Frequent Mid
  { type: SymbolType.GIFT, weight: 40 },   // Frequent Mid
  { type: SymbolType.DIAMOND, weight: 15 },
  { type: SymbolType.HASH, weight: 60 },   
  { type: SymbolType.NUM, weight: 60 },   
  { type: SymbolType.WILD, weight: 30 },   // Wild (Very Frequent -> More connections)
  { type: SymbolType.COIN, weight: 25 },   // Bonus (Frequent)
];

export const BONUS_WEIGHTS: { type: SymbolType; weight: number }[] = [
  { type: SymbolType.EMPTY, weight: 300 }, // Increased empty space for bonus
  { type: SymbolType.COIN, weight: 10 },
];