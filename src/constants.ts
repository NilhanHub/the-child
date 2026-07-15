import type { MotherRule } from './types';

export const BASE_WORDS = [
  'mama', 'dada', 'milk', 'more', 'no', 'yes', 'up', 'down', 'go', 'stop',
  'come', 'look', 'see', 'ball', 'toy', 'food', 'water', 'drink', 'sleep', 'bye',
  'hi', 'mine', 'give', 'take', 'open', 'close', 'hot', 'cold', 'dog', 'cat',
  'car', 'book', 'shoe', 'sock', 'hat', 'baby', 'bath', 'bed', 'chair', 'door',
  'light', 'phone', 'cup', 'spoon', 'banana', 'apple', 'cookie', 'bread', 'juice', 'egg',
  'bird', 'cow', 'duck', 'fish', 'horse', 'train', 'bus', 'plane', 'moon', 'star',
  'eye', 'nose', 'mouth', 'hand', 'foot', 'again', 'allgone', 'help', 'please', 'thankyou',
] as const;

export const DEFAULT_RULES: MotherRule[] = ['milk', 'water', 'food', 'toy', 'sleep'].map((name) => ({
  id: `default-${name}`,
  needName: name,
  triggerWord: name,
  itemGiven: name,
  minDelaySeconds: 9,
  maxDelaySeconds: 12,
  enabled: true,
}));

export const DEFAULT_NEED = {
  needName: 'milk',
  dissatisfaction: 0,
  dissatisfactionRisePerMinute: 1,
  actionThreshold: 5,
  maxDissatisfaction: 100,
} as const;
